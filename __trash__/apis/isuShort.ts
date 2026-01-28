import axios from "axios";
import { AthleteEntry } from "../types";

const BASE = "https://www.shorttrack.swisstiming.com/CSV/";
const COOKIE = process.env.ISU_COOKIE!; // w .env.functions

export async function fetchShortTrackEntries(
  compId: string | null
): Promise<AthleteEntry[]> {
  if (!compId) return [];

  const url = `${BASE}${compId}_ENTRIES.csv`;

  try {
    const resp = await axios.get<string>(url, {
      headers: { cookie: COOKIE },
      responseType: "text",
      validateStatus: (s) => s < 500, // 404 ≠ wyjątek
    });

    if (resp.status === 404) {
      console.log("⚠️ CSV 404:", url);
      return [];
    }

    return resp.data
      .split("\n")
      .slice(1)
      .filter((l: string) => l.trim())
      .map((l: string) => {
        const [, name, nation, bib] = l.split(";");
        return {
          name: name.trim(),
          nation: nation.trim(),
          bib: bib?.trim() || undefined,
        } as AthleteEntry;
      });
  } catch (err) {
    console.error("❌ Short-Track CSV error:", err);
    return [];
  }
}
