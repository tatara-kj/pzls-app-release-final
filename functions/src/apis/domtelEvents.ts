/* eslint-disable indent */

import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { db } from "../firebaseAdmin";

const APP_API_KEY = defineSecret("APP_API_KEY");
const DOMTEL_TOKEN = defineSecret("DOMTEL_TOKEN");

function readAppKey(req: any) {
  return (
    req.get?.("X-App-Key") ||
    req.get?.("x-app-key") ||
    String(req.query?.key ?? "").trim()
  );
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function normalizeDomtelCity(raw: string) {
  // "Tomaszów Mazowiecki (POL)" -> { city: "Tomaszów Mazowiecki", country: "POL" }
  const s = String(raw || "").trim();
  const m = s.match(/^(.*?)(?:\s*\(([^)]+)\))?\s*$/);
  const city = String(m?.[1] ?? s).trim();
  const country = String(m?.[2] ?? "").trim();
  return { city, country, cityRaw: s };
}

function seasonLabel(sezon: string) {
  // 2025 -> "2025/26"
  const y = Number(sezon);
  if (!Number.isFinite(y)) return sezon;
  return `${y}/${String((y + 1) % 100).padStart(2, "0")}`;
}

export const domtelEvents = onRequest(
  { region: "europe-west3", cors: true, secrets: [APP_API_KEY, DOMTEL_TOKEN] },
  async (req, res): Promise<void> => {
    try {
      // auth
      const expected = APP_API_KEY.value();
      if (expected) {
        const got = readAppKey(req);
        if (!got || got !== expected) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }
      }

      const sezon = String(req.query?.sezon ?? req.query?.Sezon ?? "").trim();
      if (!/^\d{4}$/.test(sezon)) {
        res.status(400).json({ error: "Missing/invalid sezon" });
        return;
      }

      const limitRaw = Number(req.query?.limit ?? 0);
      const limit =
        Number.isFinite(limitRaw) && limitRaw > 0
          ? Math.min(3000, limitRaw)
          : 3000;

      // opcja: wymuś live (np. ?live=1)
      const forceLive = String(req.query?.live ?? "").trim() === "1";

      // 1) cache-first z Firestore
      if (!forceLive) {
        try {
          const snap = await db
            .collection("domtel_events")
            .where("sezon", "==", sezon)
            .orderBy("data1", "asc")
            .limit(limit)
            .get();

          const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

          if (items.length > 0) {
            res.status(200).json({
              sezon,
              source: "firestore",
              count: items.length,
              limit,
              items,
            });
            return;
          }
        } catch (e: any) {
          // olewamy błąd cache i lecimy fallbackiem
          console.warn(
            "[domtelEvents] firestore read failed -> live fallback",
            e?.message || e
          );
        }
      }

      // 2) fallback live z DomTel
      const token = DOMTEL_TOKEN.value();
      if (!token) {
        res.status(500).json({ error: "DOMTEL_TOKEN missing" });
        return;
      }

      const url = `https://domtel-sport.pl/statystyka/api/imprezy_spis.php?Sezon=${encodeURIComponent(
        sezon
      )}`;

      const r = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await r.text();

      if (!r.ok) {
        res
          .status(r.status)
          .json({ error: `DomTel HTTP ${r.status}: ${text.slice(0, 220)}` });
        return;
      }

      let raw: any;
      try {
        raw = JSON.parse(text);
      } catch {
        res
          .status(500)
          .json({ error: `DomTel returned non-JSON: ${text.slice(0, 220)}` });
        return;
      }

      const rows: any[] = Array.isArray(raw)
        ? raw
        : raw && typeof raw === "object"
        ? Object.values(raw)
        : [];

      // normalizacja + docId = `${Sezon}_${NrKomunikatu}`
      const mapped = rows
        .map((x) => {
          const Sezon = String(x?.Sezon ?? x?.sezon ?? sezon).trim();
          const NrKomunikatu = String(
            x?.NrKomunikatu ?? x?.nrKomunikatu ?? ""
          ).trim();
          const Miasto = String(x?.Miasto ?? x?.miasto ?? "").trim();
          const Data1 = String(x?.Data1 ?? x?.data1 ?? "").trim();
          const Data2 = String(x?.Data2 ?? x?.data2 ?? "").trim();
          const Nazwa = String(x?.Nazwa ?? x?.nazwa ?? "").trim();
          const Tor = String(x?.Tor ?? x?.tor ?? "").trim() || "L";
          const LiczbaWynikow = Number(
            x?.LiczbaWynikow ?? x?.liczbaWynikow ?? 0
          );
          const DataAkt = String(
            x?.DataAkt ?? x?.dataAkt ?? x?.sourceUpdatedAt ?? ""
          ).trim();

          if (!/^\d{4}$/.test(Sezon) || !NrKomunikatu) return null;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(Data1)) return null;

          const end =
            Data2 && /^\d{4}-\d{2}-\d{2}$/.test(Data2) ? Data2 : Data1;
          const { city, country, cityRaw } = normalizeDomtelCity(Miasto);

          const id = `${Sezon}_${NrKomunikatu}`;

          return {
            id,
            sezon: Sezon,
            sezonLabel: seasonLabel(Sezon),
            nrKomunikatu: NrKomunikatu,

            miasto: Miasto,
            cityRaw,
            city,
            country,

            data1: Data1,
            data2: end,

            nazwa: Nazwa,
            tor: Tor,
            liczbaWynikow: Number.isFinite(LiczbaWynikow) ? LiczbaWynikow : 0,
            sourceUpdatedAt: DataAkt || undefined,

            searchKey:
              `${Miasto} ${Nazwa} ${Sezon} ${NrKomunikatu}`.toUpperCase(),
            updatedAt: new Date().toISOString(),
          };
        })
        .filter(Boolean) as any[];

      mapped.sort((a, b) => (String(a.data1) > String(b.data1) ? 1 : -1));

      const items = mapped.slice(0, limit);

      // 3) opcjonalnie: napraw cache (upsert do Firestore)
      try {
        for (const part of chunk(items, 450)) {
          const batch = db.batch();
          for (const it of part) {
            const ref = db.collection("domtel_events").doc(String(it.id));
            batch.set(ref, it, { merge: true });
          }
          await batch.commit();
        }
      } catch (e: any) {
        console.warn(
          "[domtelEvents] live fetch ok, but cache write failed",
          e?.message || e
        );
      }

      res.status(200).json({
        sezon,
        source: "domtel_live",
        count: items.length,
        limit,
        items,
      });
      return;
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) });
      return;
    }
  }
);
