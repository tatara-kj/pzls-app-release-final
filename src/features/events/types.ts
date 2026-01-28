export type DomtelEvent = {
  id: string; // "YYYY_N"
  sezon: string; // "2025"
  nrKomunikatu: string; // "36"
  miasto: string;
  data1: string; // "YYYY-MM-DD"
  data2: string; // "" albo "YYYY-MM-DD"
  nazwa: string;
  tor: "L" | "S" | string;
  liczbaWynikow: number;
  sourceUpdatedAt?: string;
  searchKey?: string;
};

export type DomtelEventResultRow = {
  Konkurencja: string;
  NrKonkur: string;
  Plec: "K" | "M" | string;

  NrZawodnika: string | null;
  NrZawodnikaSzt1?: string | null;
  NrZawodnikaSzt2?: string | null;
  NrZawodnikaSzt3?: string | null;
  NrZawodnikaSzt4?: string | null;
  NrZawodnikaSzt5?: string | null;

  ZawodyMiasto?: string;
  ZawodyData?: string;
  ZawodyNazwa?: string;

  Miejsce?: string;
  Szczebel?: string;
  Seria?: string;
  Wynik?: string;
  Uwagi?: string;

  DataAkt?: string;
  Ranking?: string | null;
  KlasaSportowa?: string;
};
