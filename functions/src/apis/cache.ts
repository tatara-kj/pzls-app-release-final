import { getFirestore, Timestamp } from "firebase-admin/firestore";

const COL = "api_cache";

type CacheDoc = {
  payload: unknown;
  updatedAt?: Timestamp;
  updatedAtMs?: number;
};

export async function getCache<T>(
  key: string,
  ttlMs: number
): Promise<T | null> {
  const db = getFirestore();
  const ref = db.collection(COL).doc(key);
  const snap = await ref.get();

  if (!snap.exists) return null;

  const data = snap.data() as CacheDoc;

  const updatedAtMs =
    (data.updatedAt && typeof (data.updatedAt as any).toMillis === "function"
      ? data.updatedAt.toMillis()
      : 0) || Number(data.updatedAtMs || 0);

  if (!updatedAtMs) return null;

  const age = Date.now() - updatedAtMs;
  if (age > ttlMs) return null;

  return data.payload as T;
}

export async function setCache<T>(key: string, payload: T): Promise<void> {
  const db = getFirestore();
  const ref = db.collection(COL).doc(key);

  await ref.set(
    {
      payload,
      updatedAt: Timestamp.now(),
      updatedAtMs: Date.now(),
    },
    { merge: true }
  );
}
