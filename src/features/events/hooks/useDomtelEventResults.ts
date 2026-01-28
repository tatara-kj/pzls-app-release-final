import { useCallback, useEffect, useMemo, useState } from "react";
import { functionsGet } from "../../../api/functionsClient";
// <- jeśli masz inaczej, popraw ścieżkę

export type DomtelEventResult = {
  place?: number;
  name: string;
  resultText: string; // time / wynik jako tekst
  discipline?: string;
  club?: string;
  raw?: any;
};

type ApiAny = any;

const cache = new Map<
  string,
  { ts: number; results: DomtelEventResult[]; updatedAt?: string }
>();

const TTL_MS = 10 * 60 * 1000;

function pickFirst(obj: any, keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return undefined;
}

function toNumberMaybe(v: any): number | undefined {
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function mapRowToResult(row: any): DomtelEventResult {
  const place = toNumberMaybe(
    pickFirst(row, ["Miejsce", "miejsce", "Place", "place", "Lp", "lp"]),
  );

  const athleteName =
    String(
      pickFirst(row, [
        "Zawodnik",
        "zawodnik",
        "NazwiskoImie",
        "ImieNazwisko",
        "ImięNazwisko",
      ]) ?? "—",
    ) || "—";

  const club = String(
    pickFirst(row, ["Klub", "klub", "ZawodnikKlub"]) ?? "",
  ).trim();

  const discipline = String(
    pickFirst(row, ["Konkurencja", "konkurencja"]) ?? "",
  ).trim();
  const gender = String(pickFirst(row, ["Plec", "plec"]) ?? "").trim();

  const stage = String(
    pickFirst(row, ["Szczebel", "SzczebelNazwa", "SzczebelId"]) ?? "",
  ).trim();
  const series = String(pickFirst(row, ["Seria", "seria"]) ?? "").trim();
  const notes = String(pickFirst(row, ["Uwagi", "uwagi"]) ?? "").trim();
  const sportClass = String(pickFirst(row, ["KlasaSportowa"]) ?? "").trim();

  const timeStr = pickFirst(row, ["Wynik", "wynik", "Result", "result"]);
  const resultText = String(timeStr ?? "—");

  const relay = String(pickFirst(row, ["Sztafeta"]) ?? "").trim();

  return {
    place,
    name: athleteName,
    resultText,
    discipline: discipline || undefined,
    club: club || undefined,
    raw: {
      ...row,
      _gender: gender,
      _stage: stage,
      _series: series,
      _notes: notes,
      _sportClass: sportClass,
      _relay: relay,
    },
  };
}

function extractRows(apiRes: ApiAny): any[] {
  if (Array.isArray(apiRes)) return apiRes;

  // różne możliwe kształty odpowiedzi
  const candidates = [
    apiRes?.results,
    apiRes?.items,
    apiRes?.data,
    apiRes?.rows,
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }

  // fallback: obiekt indeksowany { "1": {...}, "2": {...} }
  if (apiRes && typeof apiRes === "object") {
    const vals = Object.values(apiRes);
    if (vals.every((x) => typeof x === "object")) return vals as any[];
  }

  return [];
}

export function useDomtelEventResults(args: {
  sezon?: string;
  nrKomunikatu?: string;
  enabled?: boolean;
}) {
  const sezon = String(args.sezon ?? "");
  const nrKomunikatu = String(args.nrKomunikatu ?? "");
  const enabled = args.enabled !== false && !!sezon && !!nrKomunikatu;

  const key = useMemo(
    () => `eventResults_${sezon}_${nrKomunikatu}`,
    [sezon, nrKomunikatu],
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<DomtelEventResult[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!enabled) {
      setResults([]);
      setUpdatedAt(undefined);
      setError(null);
      setLoading(false);
    }
  }, [enabled, key]);

  const load = useCallback(
    async (force?: boolean) => {
      if (!enabled) return;

      const hit = cache.get(key);
      const fresh = hit && Date.now() - hit.ts < TTL_MS;
      if (!force && fresh) {
        setResults(hit!.results);
        setUpdatedAt(hit!.updatedAt);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Cloud Function: /eventResults?sezon=YYYY&nrKomunikatu=N
        const res = await functionsGet<ApiAny>("eventResults", {
          sezon,
          nrKomunikatu,
          Sezon: sezon,
          NrKomunikatu: nrKomunikatu,
        });

        const rows = extractRows(res?.data ?? res);

        const mapped = rows.map(mapRowToResult);

        const upd =
          (typeof res?.updatedAt === "string" ? res.updatedAt : undefined) ||
          (typeof res?.sourceUpdatedAt === "string"
            ? res.sourceUpdatedAt
            : undefined);

        cache.set(key, { ts: Date.now(), results: mapped, updatedAt: upd });

        setResults(mapped);
        setUpdatedAt(upd);
      } catch (e: any) {
        setError(String(e?.message || "Nie udało się pobrać wyników"));
      } finally {
        setLoading(false);
      }
    },
    [enabled, key, nrKomunikatu, sezon],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  return {
    results,
    updatedAt,
    loading,
    error,
    refetch: () => load(true),
  };
}
