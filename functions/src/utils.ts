// functions/src/utils.ts
import { createHash } from "crypto";

/** Prosty slug: „Mistrzostwa Polski” → "mistrzostwa-polski" */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // usuń ogonki
    .replace(/[^a-z0-9]+/g, "-") // spacje/znaki → "-"
    .replace(/^-+|-+$/g, ""); // obetnij skrajne "-"
}

/** Normalizacja do alfanum (do hashowania) */
export const normalize = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");

/** Czytelne ID wydarzenia, np. 2025-01-15_mistrzostwa-polski */
export function eventId(name: string, date: string, location: string): string {
  return `${date}_${slugify(name)}_${slugify(location)}`;
}

/** Krótkie, stabilne ID (12-znakowy SHA-1) – jeśli kiedykolwiek potrzebne */
export function hashedEventId(
  name: string,
  date: string,
  location: string
): string {
  const h = createHash("sha1");
  h.update(`${normalize(name)}|${date}|${normalize(location)}`);
  return h.digest("hex").slice(0, 12);
}
