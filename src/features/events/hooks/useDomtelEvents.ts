// src/features/events/hooks/useDomtelEvents.ts
import { useCallback, useEffect, useState } from "react";
import { functionsGet } from "../../../api/functionsClient";
import type { DomtelEvent } from "../types";

type ApiAny = any;

function normalizeDomtelItem(x: any): DomtelEvent {
  const sezon = String(x?.sezon ?? x?.Sezon ?? "");
  const nrKomunikatu = String(x?.nrKomunikatu ?? x?.NrKomunikatu ?? "");
  const id = String(x?.id ?? `${sezon}_${nrKomunikatu}`);

  return {
    id,
    sezon,
    nrKomunikatu,
    miasto: String(x?.miasto ?? x?.Miasto ?? "—"),
    nazwa: String(x?.nazwa ?? x?.Nazwa ?? "Impreza"),
    data1: String(x?.data1 ?? x?.Data1 ?? ""),
    data2: String(x?.data2 ?? x?.Data2 ?? ""),
    tor: String(x?.tor ?? x?.Tor ?? "L") as any,
    liczbaWynikow: Number(x?.liczbaWynikow ?? x?.LiczbaWynikow ?? 0),
    sourceUpdatedAt:
      String(
        x?.sourceUpdatedAt ?? x?.DataAkt ?? x?.dataAkt ?? x?.updatedAt ?? "",
      ) || undefined,
  };
}

export function useDomtelEvents(season: string) {
  const sezon = String(season || "").trim();

  const [domtelEvents, setDomtelEvents] = useState<DomtelEvent[]>([]);
  const [domtelLoading, setDomtelLoading] = useState(true); // ✅ startujemy od "loading"
  const [domtelError, setDomtelError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false); // ✅ ważne do UI

  const load = useCallback(async () => {
    if (!sezon) {
      setDomtelEvents([]);
      setDomtelLoading(false);
      setDomtelError(null);
      setHasLoadedOnce(true);
      return;
    }

    setDomtelLoading(true); // ✅ pierwsza linia w fetchu
    setDomtelError(null);

    try {
      const res = await functionsGet<ApiAny>("domtelEvents", {
        sezon,
        limit: 3000,
      });

      const arr: any[] = Array.isArray(res?.items) ? res.items : [];
      const mapped = arr.map(normalizeDomtelItem);

      mapped.sort((a, b) => (String(a.data1) > String(b.data1) ? 1 : -1));
      setDomtelEvents(mapped);
    } catch (e: any) {
      setDomtelError(String(e?.message || "Nie udało się pobrać imprez"));
      setDomtelEvents([]);
    } finally {
      setDomtelLoading(false);
      setHasLoadedOnce(true); // ✅ po pierwszym fetch zawsze true
    }
  }, [sezon]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    domtelEvents,
    domtelLoading,
    domtelError,
    hasLoadedOnce,
    refetchDomtel: load,
  };
}
