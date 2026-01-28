import axios from "axios";
import * as cheerio from "cheerio";
import { slugify } from "../utils";
import { db, FieldValue } from "../firebaseAdmin";

export interface EntryDoc {
  firstName: string;
  lastName: string;
  country: string;
  club?: string;
  bib?: number;
  distance?: string;
  seedTime?: string;
}

/**
 * Parsuje tabelę „Zgłoszeni” i zapisuje pod-kolekcję entries.
 */
export async function updateEntriesFromPZLS(eventId: string, pzlsUrl: string) {
  if (!pzlsUrl) throw new Error("Brak pzlsUrl w dokumencie eventu");

  const html = await axios.get(pzlsUrl).then((r) => r.data);
  const $ = cheerio.load(html);

  const table = $("table.tablepress").first();
  if (!table.length) {
    console.warn("Brak tabeli entries na stronie:", pzlsUrl);
    return;
  }

  const rows = table.find("tbody tr");
  const batch = db.batch();

  rows.each((_, row) => {
    const tds = $(row).find("td");
    if (tds.length < 4) return;

    const lastName = $(tds[0]).text().trim();
    const firstName = $(tds[1]).text().trim();
    const club = $(tds[2]).text().trim();
    const country = $(tds[3]).text().trim();
    const bib = Number($(tds[4]).text().trim()) || undefined;
    const distance = $(tds[5]).text().trim() || undefined;
    const seedTime = $(tds[6]).text().trim() || undefined;

    const athleteSlug = slugify(`${lastName}-${firstName}-${country}`);

    const ref = db
      .collection("events")
      .doc(eventId)
      .collection("entries")
      .doc(athleteSlug);

    const data: EntryDoc = { firstName, lastName, country };
    if (club) data.club = club;
    if (bib) data.bib = bib;
    if (distance) data.distance = distance;
    if (seedTime) data.seedTime = seedTime;

    batch.set(
      ref,
      { ...data, createdAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
  });

  await batch.commit();
  console.log(`✓ entries zapisane → events/${eventId}/entries/`);
}
