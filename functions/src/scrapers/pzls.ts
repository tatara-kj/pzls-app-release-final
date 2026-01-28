// functions/src/scrapers/pzls.ts
import axios from "axios";
import * as cheerio from "cheerio";
import { parsePZLSDateRange } from "../date";
import { slugify } from "../utils";
import { RawEvent } from "../types"; // zostaw – rozszerzymy w push przez `as any`

export async function fetchPZLSEvents(): Promise<RawEvent[]> {
  console.log(">>> START fetchPZLSEvents");

  const html = await axios
    .get("https://pzls.pl/kalendarz-i-wyniki/")
    .then((r) => r.data);

  const $ = cheerio.load(html);

  function parseTable(
    table: cheerio.Cheerio<any>,
    trackType: "long-track" | "short-track"
  ): RawEvent[] {
    const events: RawEvent[] = [];
    const rows = table.find("tbody tr");

    rows.each((_: any, row: any) => {
      const tds = $(row).find("td");
      if (tds.length < 4) return;

      const name = $(tds[1]).text().trim().replace(/\s+/g, " ");
      const location = $(tds[3]).text().trim();
      if (name === "Nazwa wydarzenia" && location === "Miejsce") return;

      const dateRaw = $(tds[0]).text().trim();
      const range = parsePZLSDateRange(dateRaw);

      const eventId = `${range.startISO}_${slugify(name)}`;

      // link „Szczegóły” (może być null)
      const href = $(tds[1]).find("a").attr("href") || null;

      // próbujemy wyciągnąć externalId=id=1234 z href
      let externalId: string | null = null;
      const m = href?.match(/id=(\d+)/);
      if (m) externalId = m[1];

      const ev = {
        id: eventId,
        name,
        // dla zgodności pole 'date' to start
        date: range.startISO,

        // NOWE pola (UI z nich skorzysta, ale typ RawEvent może ich nie znać):
        dateStart: range.startISO,
        dateEnd: range.endISO,
        dateDays: range.days,
        displayDate: range.displayText,

        location,
        type: trackType,
        source: "pzls",
        pzlsUrl: href,
        externalId,
        hasPolishAthletes: false,
        isInPoland: false,
      };

      events.push(ev as any); // jeśli RawEvent nie ma nowych pól, rzutujemy
    });

    return events;
  }

  const tables = $("table.tablepress");
  const longTable = tables.eq(0);
  const shortTable = tables.eq(1);

  return [
    ...parseTable(longTable, "long-track"),
    ...parseTable(shortTable, "short-track"),
  ];
}
