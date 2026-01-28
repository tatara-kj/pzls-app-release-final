import axios from "axios";
import { AthleteEntry } from "../types";

const BASE = "https://speedskatingresults.com/api";
const TOKEN = process.env.SSR_TOKEN!; // w .env.functions

export async function fetchLongTrackEntries(
  eventName: string,
  date: string
): Promise<AthleteEntry[]> {
  // 1. Search event → id
  const search = await axios
    .get(`${BASE}/events`, { params: { q: eventName, token: TOKEN } })
    .then((r) => r.data);

  // znajdź rekord z dokładną datą (YYYY-MM-DD)
  const found = search.find((e: any) => e.date === date);
  if (!found) return [];

  // 2. Pobierz listę startową
  const start = await axios
    .get(`${BASE}/events/${found.id}/entries`, { params: { token: TOKEN } })
    .then((r) => r.data);

  return start.map((a: any) => ({
    name: `${a.firstname} ${a.lastname}`,
    nation: a.country,
    bib: a.bib?.toString() ?? undefined,
  })) as AthleteEntry[];
}
