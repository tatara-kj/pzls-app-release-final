import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { domtelFetch } from "./domtel";
import { getCache, setCache } from "./cache";

const APP_API_KEY = defineSecret("APP_API_KEY");
const DOMTEL_TOKEN = defineSecret("DOMTEL_TOKEN");
const REGION = "europe-west3";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dni

function requireAppKey(req: any, res: any) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return false;
  }
  const key = String(req.get("X-App-Key") || "");
  if (!key || key !== APP_API_KEY.value()) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

export const competitions = onRequest(
  { region: REGION, secrets: [DOMTEL_TOKEN, APP_API_KEY], cors: true },
  async (req, res) => {
    try {
      if (!requireAppKey(req, res)) return;

      const token = DOMTEL_TOKEN.value();
      if (!token) {
        res.status(500).json({ error: "DOMTEL_TOKEN missing" });
        return;
      }

      const cacheKey = "konkurencje_all";
      const cached = (await getCache(cacheKey, TTL_MS)) as any[] | null;

      if (cached) {
        res
          .status(200)
          .json({ cached: true, count: cached.length, items: cached });
        return;
      }

      const items = await domtelFetch<any>("konkurencje.php", token, {});
      await setCache(cacheKey, items);

      res.status(200).json({ cached: false, count: items.length, items });
    } catch (e: any) {
      console.error("[competitions] error", e);
      res.status(500).json({ error: "Internal error" });
    }
  }
);
