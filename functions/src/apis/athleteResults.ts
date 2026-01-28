import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { getCache, setCache } from "./cache";
import { domtelFetch } from "./domtel";

const APP_API_KEY = defineSecret("APP_API_KEY");

const DOMTEL_TOKEN = defineSecret("DOMTEL_TOKEN");
const REGION = "europe-west3";
const TTL_MS = 6 * 60 * 60 * 1000; // 6h cache

function getAthleteId(req: any) {
  const id = String(req.query.NrZawodnika ?? req.query.id ?? "");
  if (!/^\d+$/.test(id)) return null;
  return id;
}

export const athleteResults = onRequest(
  { region: REGION, secrets: [DOMTEL_TOKEN, APP_API_KEY], cors: true },
  async (req, res) => {
    // Jeśli odpalasz web (CORS), preflight może wejść bez nagłówków
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    const key = String(req.get("X-App-Key") || "");
    if (!key || key !== APP_API_KEY.value()) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const athleteId = getAthleteId(req);
      if (!athleteId) {
        res.status(400).json({ error: "Missing/invalid NrZawodnika" });
        return;
      }

      const token = DOMTEL_TOKEN.value();
      if (!token) {
        res.status(500).json({ error: "DOMTEL_TOKEN missing" });
        return;
      }

      // opcjonalne filtry (zmniejszają payload)
      const season = String(req.query.sezon ?? req.query.season ?? "").trim();
      const tor = String(req.query.tor ?? "")
        .trim()
        .toUpperCase(); // L/S

      const cacheKey = `wyniki_${athleteId}_${season || "ALL"}_${tor || "ALL"}`;

      const cached = await getCache<any[]>(cacheKey, TTL_MS);
      if (cached) {
        res.status(200).json({
          athleteId,
          cached: true,
          count: cached.length,
          items: cached,
        });
        return;
      }

      let items = await domtelFetch("wyniki.php", token, {
        NrZawodnika: athleteId,
      });

      if (season)
        items = items.filter((x: any) => String(x?.Sezon || "") === season);
      if (tor === "L" || tor === "S")
        items = items.filter((x: any) => String(x?.Tor || "") === tor);

      await setCache(cacheKey, items);

      res
        .status(200)
        .json({ athleteId, cached: false, count: items.length, items });
    } catch (e: any) {
      console.error("[athleteResults] error", e);
      res.status(500).json({ error: "Internal error" });
    }
  }
);
