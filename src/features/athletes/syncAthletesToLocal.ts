import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import {
  AthleteRow,
  getAthletesCount,
  getMeta,
  initAthletesDb,
  setMeta,
  upsertAthletes,
} from "../../storage/athletesDb";

const PAGE_SIZE = 500;
const META_KEY = "athletes_last_sync_ms";
const GUARD_KEY = "athletes_last_attempt_ms";
const MIN_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h

function normalizeForSearch(t: string) {
  return (t ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function buildSearchKey(
  firstNameKey: string,
  lastNameKey: string,
  clubKey: string,
  categoryKey: string,
) {
  return `${lastNameKey} ${firstNameKey} ${firstNameKey} ${lastNameKey} ${clubKey} ${categoryKey}`
    .replace(/\s+/g, " ")
    .trim();
}

export async function syncAthletesToLocal() {
  await initAthletesDb();

  const now = Date.now();
  const localCount = await getAthletesCount();
  const isBootstrap = localCount === 0;

  const lastAttempt = await getMeta(GUARD_KEY);
  if (
    !isBootstrap &&
    lastAttempt &&
    now - Number(lastAttempt) < MIN_INTERVAL_MS
  ) {
    return {
      skipped: true,
      reason: "guard",
      nextInMs: MIN_INTERVAL_MS - (now - Number(lastAttempt)),
    };
  }

  // guard ustawiaj tylko dla normalnych synców (nie dla bootstrapu)
  if (!isBootstrap) {
    await setMeta(GUARD_KEY, String(now));
  }

  const last = await getMeta(META_KEY);
  let lastSyncMs = last ? Number(last) : 0;

  let baseQuery: FirebaseFirestoreTypes.Query = firestore()
    .collection("athletes")
    .orderBy("updatedAt", "asc")
    .limit(PAGE_SIZE);

  if (lastSyncMs > 0) {
    baseQuery = baseQuery.where(
      "updatedAt",
      ">",
      firestore.Timestamp.fromMillis(lastSyncMs),
    );
  }

  let lastDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot | null = null;
  let total = 0;
  let maxSeenMs = lastSyncMs;

  while (true) {
    let q = baseQuery;
    if (lastDoc) q = q.startAfter(lastDoc);

    const snap = await q.get();
    if (snap.empty) break;

    const rows: AthleteRow[] = snap.docs.map((d) => {
      const a = d.data() as any;

      const firstName = String(a.firstName ?? "");
      const lastName = String(a.lastName ?? "");
      const club = String(a.club ?? "");
      const category = String(a.category ?? "");

      const firstNameKey = normalizeForSearch(firstName);
      const lastNameKey = normalizeForSearch(lastName);
      const clubKey = normalizeForSearch(club);
      const categoryKey = normalizeForSearch(category);

      const updatedAtMs = a.updatedAt?.toDate?.()
        ? a.updatedAt.toDate().getTime()
        : 0;
      if (updatedAtMs > maxSeenMs) maxSeenMs = updatedAtMs;

      return {
        id: String(a.id ?? d.id),
        firstName,
        lastName,
        gender: String(a.gender ?? ""),
        birthDate: String(a.birthDate ?? ""),
        category,
        club,
        sourceUpdatedAt: String(a.sourceUpdatedAt ?? ""),
        updatedAtMs,

        firstNameKey,
        lastNameKey,
        clubKey,
        categoryKey,
        searchKey: buildSearchKey(
          firstNameKey,
          lastNameKey,
          clubKey,
          categoryKey,
        ),
      };
    });

    await upsertAthletes(rows);
    total += rows.length;

    lastDoc = snap.docs[snap.docs.length - 1];

    // oddaj CPU UI
    await new Promise((r) => setTimeout(r, 0));
  }

  await setMeta(META_KEY, String(maxSeenMs));
  return { totalDownloaded: total, lastSyncMs: maxSeenMs };
}
