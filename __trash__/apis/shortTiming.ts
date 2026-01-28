import axios from "axios";
import { parseStringPromise } from "xml2js";

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**  competitions_2025.xml → { "2024-12-15|world-tour-4-puchar-swiata": "1122030001", … } */
export async function fetchShortTrackEventsMap(season: string) {
  const url = `https://shorttrack.sportresult.com/xml/competitions_${season}.xml`;

  // pobieramy jako tekst – 404 zwróci pusty string (bez rzucania wyjątku sieci)
  const xml = await axios
    .get(url, { responseType: "text", validateStatus: (s) => s < 500 })
    .then((r) => (r.status === 404 ? "" : r.data));

  if (!xml) {
    console.log(`⚠️  Brak XML dla season=${season}`);
    return {};
  }

  const parsed = await parseStringPromise(xml, { explicitArray: false });
  const comps = parsed.Competitions?.Competition ?? [];
  const list = Array.isArray(comps) ? comps : [comps];

  const map: Record<string, string> = {};
  list.forEach((c: any) => {
    const date = c.$.StartDate.slice(0, 10);
    map[`${date}|${slug(c.$.Name)}`] = c.$.CompId;
  });

  console.log(`🗺️  Załadowano ${list.length} short-track events`);
  return map;
}
