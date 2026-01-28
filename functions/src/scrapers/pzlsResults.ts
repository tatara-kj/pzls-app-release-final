import axios from "axios";
import * as cheerio from "cheerio";
import { db, FieldValue } from "../firebaseAdmin";
import { slugify } from "../utils";

interface RawRow {
  rank: number;
  lastName: string;
  firstName: string;
  country: string;
  time: string;
  points?: number;
  record?: string;
}

function parseResultsTable($: cheerio.CheerioAPI, table: cheerio.Cheerio<any>) {
  const rows: RawRow[] = [];
  table.find("tbody tr").each((_: any, tr: any) => {
    const tds = $(tr).find("td");
    if (tds.length < 5) return;

    rows.push({
      rank: Number($(tds[0]).text().trim()),
      lastName: $(tds[1]).text().trim(),
      firstName: $(tds[2]).text().trim(),
      country: $(tds[3]).text().trim(),
      time: $(tds[4]).text().trim(),
      points: Number($(tds[5]).text().trim()) || undefined,
      record: $(tds[6]).text().trim() || undefined,
    });
  });
  return rows;
}

export async function updateResultsFromPZLS(
  eventId: string,
  pzlsUrl: string,
  trackType: "short-track" | "long-track"
) {
  if (!pzlsUrl) throw new Error("Brak pzlsUrl w evencie");

  const html = await axios.get(pzlsUrl).then((r) => r.data);
  const $ = cheerio.load(html);

  // zbieramy obietnice, potem czekamy na wszystkie
  const tasks: Promise<FirebaseFirestore.WriteResult[]>[] = [];

  $("table.tablepress").each((idx: number, tbl: any) => {
    const table = $(tbl);
    const caption = table.prev("h3").text().trim() || `distance-${idx}`;

    const m = caption.match(/(\d+\s*m)\s+(\w+)/i);
    if (!m) return;

    const distance = m[1];
    const gender = /(kobiet|women|k)/i.test(m[2]) ? "K" : "M";
    const raceNo = caption.match(/Bieg\s+(\d+)/i)?.[1] ? Number(RegExp.$1) : 1;
    const distanceId = slugify(`${distance}-${gender}`);

    const distRef = db
      .collection("events")
      .doc(eventId)
      .collection("results")
      .doc(distanceId);

    const metaBatch = db.batch();
    metaBatch.set(
      distRef,
      {
        distance,
        gender,
        race: raceNo,
        trackType,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const batch = db.batch();
    parseResultsTable($, table).forEach((row) => {
      const athleteSlug = slugify(
        `${row.lastName}-${row.firstName}-${row.country}`
      );

      batch.set(
        distRef.collection("athletes").doc(athleteSlug),
        {
          rank: row.rank,
          time: row.time,
          points: row.points ?? null,
          recordType: row.record ?? null,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    tasks.push(batch.commit().then(() => metaBatch.commit()));
  });

  // czekamy na wszystkie zapisy
  await Promise.all(tasks);
}
