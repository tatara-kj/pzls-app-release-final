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

export interface EventDetails {
  entries?: AthleteEntry[];
  results?: ResultLine[];
  youtube?: string | null;
}
