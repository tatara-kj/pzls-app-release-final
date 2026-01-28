// src/api/rankingsApi.ts
import { functionsGet } from "./functionsClient";

type AnyObj = Record<string, any>;

export type CompetitionItem = {
  id: string;
  label: string;
  track?: "L" | "S" | string;
  sort?: number;
};

export type RankingItem = {
  rank: number;
  name: string;
  club: string;
  result: string;
  eventName?: string;
  eventCity?: string;
  eventDate?: string;
  counter?: number;
};

function toArray(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") return Object.values(data);
  return [];
}

function normalizeCompetition(x: AnyObj): CompetitionItem | null {
  const id = String(x.NrKonkur ?? x.id ?? "").trim();
  const label = String(x.Nazwa ?? x.Konkurencja ?? "").trim();
  const track = String(x.Tor ?? "").trim();
  const sort = Number(x.Sort ?? NaN);
  if (!id || !label) return null;
  return { id, label, track, sort: Number.isFinite(sort) ? sort : undefined };
}

function normalizeRankingRow(x: AnyObj, idx: number): RankingItem {
  const first = String(x.ZawodnikImie ?? x.Imie ?? "").trim();
  const last = String(x.ZawodnikNazwisko ?? x.Nazwisko ?? "").trim();
  const name =
    [first, last].filter(Boolean).join(" ") ||
    String(x.Zawodnik ?? `Zawodnik #${idx + 1}`);
  const club = String(x.ZawodnikKlub ?? x.Klub ?? "—").trim() || "—";
  const result = String(x.Wynik ?? "—").trim() || "—";
  return {
    rank: idx + 1,
    name,
    club,
    result,
    eventName: String(x.ZawodyNazwa ?? "").trim() || undefined,
    eventCity: String(x.ZawodyMiasto ?? "").trim() || undefined,
    eventDate: String(x.ZawodyData ?? "").trim() || undefined,
    counter: Number(x.LicznikZawodnikWynik ?? 0) || 0,
  };
}

export async function fetchCompetitions(): Promise<CompetitionItem[]> {
  const data = await functionsGet<any>("/competitions");
  const out = toArray(data)
    .map(normalizeCompetition)
    .filter(Boolean) as CompetitionItem[];
  out.sort(
    (a, b) =>
      (a.sort ?? 9999) - (b.sort ?? 9999) || a.label.localeCompare(b.label),
  );
  return out;
}

export async function fetchRanking(params: {
  NrKonkur: string;
  Sezon: string;
  Plec: "K" | "M";
  Kategoria: string;
}): Promise<RankingItem[]> {
  const data = await functionsGet<any>("/ranking", params as any);
  return toArray(data).map((x, i) => normalizeRankingRow(x, i));
}
