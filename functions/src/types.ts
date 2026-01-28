/* -------------  TYPOWY EVENT (Etap 0 / 2) ------------- */
export interface RawEvent {
  id: string; // „2024-12-10_puchar-polski”
  name: string;
  date: string; // YYYY-MM-DD
  location: string;
  type: "long-track" | "short-track";
  source: "pzls";
  pzlsUrl?: string | null;
  externalId?: string | null;
  hasPolishAthletes: boolean;
  isInPoland: boolean;
}
export interface EventDetails {
  eventRef: FirebaseFirestore.DocumentReference;
  season: string;
  track: "long-track" | "short-track";
  entries: AthleteEntry[];
  results: ResultLine[];
  youtube: string | null; // ← tutaj zmień na | null
  eventName: string;
  eventDate: string;
  createdAt: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
  shortTrackId: string | null;
}

export interface AthleteEntry {
  name: string;
  nation: string;
  bib?: string;
}

export interface ResultLine {
  rank: number;
  name: string;
  nation: string;
  time: string;
  points?: number;
}
