import { functionsGet } from "./functionsClient";

export type ApiListResponse<T> = {
  athleteId: string;
  cached: boolean;
  count: number;
  items: T[];
};

export type AthleteAchievement = {
  Sezon: string;
  Tor: "L" | "S";
  Rodzaj: string;
  Nazwa: string;
  Konkurencja: string;
  NrKonkur: string;
  Ranking: string | null;
  Miejsce: string;
  SzczebelId: string;
  SzczebelNazwa: string;
  Seria: string;
  Uwagi: string;
  Wynik: string;
  NrKomunikatu: string;
  ZawodyMiasto: string;
  ZawodyData: string;
  ZawodyNazwa: string;
  Kategoria: string;
};

export type AthleteResult = {
  Sezon: string;
  Tor: "L" | "S";
  Konkurencja: string;
  NrKonkur: string;
  ZawodyMiasto: string;
  ZawodyData: string;
  ZawodyNazwa: string;
  Miejsce: string;
  Szczebel: string;
  Seria: string;
  Wynik: string;
  Uwagi: string;
  DataAkt: string;
  Ranking: string | null;
  KlasaSportowa: string;
};

export type AthleteSeasonBest = {
  Sezon: string;
  Tor: "L" | "S";
  Konkurencja: string;
  NrKonkur: string;
  Wynik: string;
  ZawodyMiasto: string;
  ZawodyData: string;
  Kategoria: string;
};

export async function getAthleteAchievements(athleteId: string) {
  return functionsGet<ApiListResponse<AthleteAchievement>>(
    "/athleteAchievements",
    { NrZawodnika: athleteId }
  );
}

export async function getAthleteResults(athleteId: string) {
  return functionsGet<ApiListResponse<AthleteResult>>("/athleteResults", {
    NrZawodnika: athleteId,
  });
}

export async function getAthleteSeasonBests(athleteId: string) {
  return functionsGet<ApiListResponse<AthleteSeasonBest>>(
    "/athleteSeasonBests",
    { NrZawodnika: athleteId }
  );
}
