import axios from "axios";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

function normalizeForSearch(s: string) {
  return String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

type DomtelEventRow = {
  Sezon: string;
  NrKomunikatu: string;
  Miasto: string;
  Data1: string;
  Data2: string;
  Nazwa: string;
  Tor: string;
  LiczbaWynikow: string;
  DataAkt: string;
};

async function fetchDomtelEvents(token: string): Promise<DomtelEventRow[]> {
  const url = "https://domtel-sport.pl/statystyka/api/imprezy_spis.php";
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30000,
  });

  const data = res.data;
  const rows = Array.isArray(data) ? data : Object.values(data || {});
  return rows as DomtelEventRow[];
}

async function loadExistingUpdatedMap(colName: string) {
  const db = getFirestore();
  const snap = await db.collection(colName).select("sourceUpdatedAt").get();
  const map = new Map<string, string>();
  snap.forEach((d) => map.set(d.id, String(d.get("sourceUpdatedAt") || "")));
  return map;
}

export async function syncDomtelEvents(token: string) {
  const db = getFirestore();
  const colName = "domtel_events";

  const rows = await fetchDomtelEvents(token);
  const existing = await loadExistingUpdatedMap(colName);

  const writer = db.bulkWriter();
  let changed = 0;

  for (const e of rows) {
    const sezon = String(e?.Sezon || "");
    const nr = String(e?.NrKomunikatu || "");
    if (!/^\d{4}$/.test(sezon) || !/^\d+$/.test(nr)) continue;

    const id = `${sezon}_${nr}`;
    const sourceUpdatedAt = String(e?.DataAkt || "");
    const prev = existing.get(id) || "";
    if (prev === sourceUpdatedAt) continue;

    const doc = {
      id,
      sezon,
      nrKomunikatu: nr,
      miasto: String(e?.Miasto || ""),
      data1: String(e?.Data1 || ""),
      data2: String(e?.Data2 || ""),
      nazwa: String(e?.Nazwa || ""),
      tor: String(e?.Tor || ""),
      liczbaWynikow: Number(e?.LiczbaWynikow || 0),
      sourceUpdatedAt,
      searchKey: normalizeForSearch(`${e?.Miasto} ${e?.Nazwa} ${sezon} ${nr}`),
      updatedAt: FieldValue.serverTimestamp(),
    };

    writer.set(db.collection(colName).doc(id), doc, { merge: true });
    changed++;
  }

  await writer.close();

  await db.collection("sync_meta").doc("domtel_events").set(
    {
      lastRunAt: Timestamp.now(),
      changedCount: changed,
      totalFromApi: rows.length,
    },
    { merge: true }
  );

  return { changed, total: rows.length };
}
