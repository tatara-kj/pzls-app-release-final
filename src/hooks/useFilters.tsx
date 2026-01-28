import React, { createContext, useContext, useMemo, useState } from "react";
import { AthleteRow } from "../storage/athletesDb";

export type Filters = {
  senior: boolean;
  junior: boolean;
  women: boolean;
  men: boolean;
  lt: boolean; // long track
  st: boolean; // short track
};

type Ctx = {
  query: string;
  setQuery: (v: string) => void;
  filters: Filters;
  toggleFilter: (k: keyof Filters) => void;
};

const FiltersContext = createContext<Ctx | null>(null);

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({
    senior: false,
    junior: false,
    women: false,
    men: false,
    lt: false,
    st: false,
  });

  const toggleFilter = (k: keyof Filters) => {
    setFilters((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const value = useMemo(
    () => ({ query, setQuery, filters, toggleFilter }),
    [query, filters]
  );

  return (
    <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used inside FiltersProvider");
  return ctx;
}

// ---------- helpers ----------
function normalizeGender(g: unknown): "F" | "M" | null {
  if (!g) return null;
  const s = String(g).toUpperCase();
  if (s === "K" || s === "F" || s.includes("KOB")) return "F";
  if (s === "M" || s.includes("MEZ") || s.includes("MĘŻ")) return "M";
  return null;
}

function ageFromBirthDate(birth: unknown): number | null {
  if (!birth) return null;
  const d = new Date(String(birth));
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function isJuniorByAge(age: number | null) {
  if (age === null) return false;
  // prosta heurystyka – możesz zmienić próg
  return age < 19;
}

// ---------- FILTER LOGIC ----------
export function matchesAthleteRowFilters(a: AthleteRow, f: Filters) {
  // LT / ST – jeżeli rekord ma jakąkolwiek informację o torze
  const wantsLT = !!f.lt;
  const wantsST = !!f.st;

  if (wantsLT || wantsST) {
    const rawTor =
      (a as any).Tor ??
      (a as any).tor ??
      (a as any).track ??
      (a as any).discipline ??
      (a as any).TorNazwa ??
      null;

    const tor = typeof rawTor === "string" ? rawTor.toUpperCase() : "";

    const isLT =
      tor === "L" ||
      tor === "LT" ||
      tor.includes("LONG") ||
      tor.includes("DŁUG");
    const isST =
      tor === "S" ||
      tor === "ST" ||
      tor.includes("SHORT") ||
      tor.includes("KRÓT");

    // Jeśli nie mamy danych o torze — nie filtrujemy (żeby nie robić pustej listy)
    if (tor) {
      if (wantsLT && !wantsST && !isLT) return false;
      if (wantsST && !wantsLT && !isST) return false;
    }
  }

  const g = normalizeGender((a as any).gender ?? (a as any).Plec);
  const age = ageFromBirthDate((a as any).birthDate ?? (a as any).DataUr);
  const junior = isJuniorByAge(age);
  const senior = age !== null ? !junior : false;

  const genderOK =
    (!f.women && !f.men) || (f.women && g === "F") || (f.men && g === "M");

  const ageOK =
    (!f.senior && !f.junior) ||
    (f.junior && junior) ||
    (f.senior && senior) ||
    (f.junior && f.senior);

  return genderOK && ageOK;
}
