import { MMKV } from "react-native-mmkv";
import { useSyncExternalStore } from "react";

const storage = new MMKV({ id: "pzls" });
const KEY = "fav_athletes_v1";

let cache: Set<string> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function loadSet(): Set<string> {
  if (cache) return cache;

  const raw = storage.getString(KEY);
  if (!raw) {
    cache = new Set();
    return cache;
  }

  try {
    const arr = JSON.parse(raw);
    cache = Array.isArray(arr) ? new Set(arr.map((x) => String(x))) : new Set();
  } catch {
    cache = new Set();
  }
  return cache!;
}

function saveSet(next: Set<string>) {
  cache = next;
  storage.set(KEY, JSON.stringify([...next]));
  version++;
  listeners.forEach((l) => l());
}

export function toggleFavoriteAthlete(id: string) {
  const current = loadSet();
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  saveSet(next);
  return next.has(id);
}

export function useFavoritesSet() {
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
    () => version
  );
  return loadSet();
}
