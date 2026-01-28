import axios from "axios";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

function normalizeForSearch(s: any) {
  return String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCaseSafe(s: any) {
  const raw = String(s || "")
    .trim()
    .toLowerCase();
  return raw ? raw[0].toUpperCase() + raw.slice(1) : "";
}

async function fetchDomtelAthletes(token: string) {
  const url =
    "https://domtel-sport.pl/statystyka/api/zawodnik.php?NrZawodnika=ALL";

  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30000,
  });

  const data = res.data;
  return Array.isArray(data) ? data : Object.values(data || {});
}

async function loadExistingUpdatedMap(db: FirebaseFirestore.Firestore) {
  const snap = await db.collection("athletes").select("sourceUpdatedAt").get();
  const map = new Map<string, string>();
  snap.forEach((doc) =>
    map.set(doc.id, (doc.get("sourceUpdatedAt") as string) || "")
  );
  return map;
}

async function writeChanges(
  db: FirebaseFirestore.Firestore,
  rows: any[],
  existingMap: Map<string, string>
) {
  const writer = db.bulkWriter();
  let changed = 0;

  for (const a of rows) {
    const id = String(a?.NrZawodnika || "");
    if (!id) continue;

    const sourceUpdatedAt = String(a?.DataZmian || "");
    const prev = existingMap.get(id) || "";
    if (prev === sourceUpdatedAt) continue;

    const doc = {
      id,
      firstName: titleCaseSafe(a.Imie),
      lastName: titleCaseSafe(a.Nazwisko),
      gender: String(a.Plec || ""),
      birthDate: String(a.DataUr || ""),
      category: String(a.Kategoria || ""),
      club: String(a.Klub || ""),
      sourceUpdatedAt,
      searchKey: normalizeForSearch(
        `${a.Nazwisko} ${a.Imie} ${a.Klub} ${a.Kategoria}`
      ),
      updatedAt: FieldValue.serverTimestamp(),
    };

    writer.set(db.collection("athletes").doc(id), doc, { merge: true });
    changed++;
  }

  await writer.close();
  return changed;
}

export async function syncAthletes(token: string) {
  const db = getFirestore();
  const rows = await fetchDomtelAthletes(token);
  const existing = await loadExistingUpdatedMap(db);
  const changed = await writeChanges(db, rows, existing);

  await db.collection("sync_meta").doc("athletes").set(
    {
      lastRunAt: Timestamp.now(),
      changedCount: changed,
      totalFromApi: rows.length,
    },
    { merge: true }
  );

  return { changed, total: rows.length };
}
