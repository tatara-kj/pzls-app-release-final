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

function readParam(req: any, keys: string[]) {
  for (const k of keys) {
    const v = req.query?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function normAthlete(a: any) {
  // wspieramy 2 schematy: "firstName/lastName/club" oraz "Imie/Nazwisko/Klub"
  const firstName = String(a?.firstName ?? a?.Imie ?? a?.imie ?? "").trim();
  const lastName = String(
    a?.lastName ?? a?.Nazwisko ?? a?.nazwisko ?? ""
  ).trim();
  const club = String(a?.club ?? a?.Klub ?? a?.klub ?? "").trim();
  const category = String(
    a?.category ?? a?.Kategoria ?? a?.kategoria ?? ""
  ).trim();
  const birthDate = String(
    a?.birthDate ?? a?.DataUrodzenia ?? a?.dataUrodzenia ?? ""
  ).trim();

  const full = `${firstName} ${lastName}`.trim();

  return {
    fullName: full || "",
    club: club || "",
    category: category || "",
    birthDate: birthDate || "",
  };
}

export const eventResults = onRequest(
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

      const sezon = readParam(req, ["sezon", "Sezon"]);
      const nrKomunikatu = readParam(req, ["nrKomunikatu", "NrKomunikatu"]);

      if (!/^\d{4}$/.test(sezon) || !/^\d+$/.test(nrKomunikatu)) {
        res
          .status(400)
          .json({ error: "Missing/invalid Sezon or NrKomunikatu" });
        return;
      }

      const token = DOMTEL_TOKEN.value();
      if (!token) {
        res.status(500).json({ error: "DOMTEL_TOKEN missing" });
        return;
      }

      const url =
        `https://domtel-sport.pl/statystyka/api/imprezy_wyniki.php?Sezon=${encodeURIComponent(
          sezon
        )}` + `&NrKomunikatu=${encodeURIComponent(nrKomunikatu)}`;

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

      // zbierz ID zawodników
      const ids = new Set<string>();
      const pushId = (v: any) => {
        const s = String(v ?? "").trim();
        if (!s || s === "0" || s.toLowerCase() === "null") return;
        ids.add(s);
      };

      for (const row of rows) {
        pushId(row?.NrZawodnika);
        pushId(row?.NrZawodnikaSzt1);
        pushId(row?.NrZawodnikaSzt2);
        pushId(row?.NrZawodnikaSzt3);
        pushId(row?.NrZawodnikaSzt4);
        pushId(row?.NrZawodnikaSzt5);
      }

      // Firestore athletes (docId = NrZawodnika)
      const athleteMap = new Map<string, any>();
      const idList = Array.from(ids);

      for (const part of chunk(idList, 400)) {
        const refs = part.map((id) => db.collection("athletes").doc(id));
        const snaps = await db.getAll(...refs);
        for (const s of snaps) {
          if (s.exists) athleteMap.set(s.id, s.data());
        }
      }

      const enriched = rows.map((row) => {
        const out = { ...row };

        // main athlete
        const mainId = String(row?.NrZawodnika ?? "").trim();
        if (mainId) {
          const a = athleteMap.get(mainId);
          if (a) {
            const na = normAthlete(a);
            if (na.fullName) out.Zawodnik = na.fullName;
            if (na.club) out.Klub = na.club;
            if (na.category) out.Kategoria = na.category;
            if (na.birthDate) out.DataUrodzenia = na.birthDate;
          } else {
            // minimum: pokaż ID zamiast "—"
            out.Zawodnik = `Zawodnik #${mainId}`;
          }
        }

        // relay names
        const relayIds = [
          row?.NrZawodnikaSzt1,
          row?.NrZawodnikaSzt2,
          row?.NrZawodnikaSzt3,
          row?.NrZawodnikaSzt4,
          row?.NrZawodnikaSzt5,
        ]
          .map((x) => String(x ?? "").trim())
          .filter((x) => x && x !== "0" && x.toLowerCase() !== "null");

        if (relayIds.length) {
          const names = relayIds
            .map((id) => athleteMap.get(id))
            .filter(Boolean)
            .map((aa) => {
              const na = normAthlete(aa);
              return (
                na.fullName || `#${String((aa as any)?.id ?? "").trim()}` || "—"
              );
            });

          if (names.length) out.Sztafeta = names.join(" • ");
        }

        return out;
      });

      res.status(200).json({
        sezon,
        nrKomunikatu,
        count: enriched.length,
        updatedAt: new Date().toISOString(),
        items: enriched,
      });
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || e) });
    }
  }
);
