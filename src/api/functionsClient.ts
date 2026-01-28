// src/api/functionsClient.ts

type Primitive = string | number | boolean;
export type Query = Record<string, Primitive | null | undefined>;

// twardy fallback – jak env nie wejdzie (dev/preview), app dalej działa
const FALLBACK_BASE = "https://europe-west3-pzls-app.cloudfunctions.net";
const FALLBACK_KEY = ""; // możesz wpisać na stałe jeśli chcesz

const FUNCTIONS_BASE =
  process.env.EXPO_PUBLIC_FUNCTIONS_BASE ||
  process.env.EXPO_PUBLIC_FUNCTIONS_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  FALLBACK_BASE;

const APP_KEY = process.env.EXPO_PUBLIC_APP_API_KEY || FALLBACK_KEY;

function getBaseUrl() {
  // nie wywalaj całej aplikacji wyjątkiem – to robi kaskadę błędów w UI
  const base = (FUNCTIONS_BASE || FALLBACK_BASE).trim();
  return base.replace(/\/+$/, "");
}

function buildUrl(base: string, path: string, query?: Query) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(base + cleanPath);

  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function shortBody(text: string) {
  return String(text).replace(/\s+/g, " ").slice(0, 220);
}

export async function functionsGet<T>(path: string, query?: Query): Promise<T> {
  const base = getBaseUrl();
  const url = buildUrl(base, path, query);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(APP_KEY ? { "X-App-Key": APP_KEY } : {}),
    },
  });

  const text = await res.text();

  if (!res.ok) {
    try {
      const j = JSON.parse(text);
      const msg = j?.error || j?.message || shortBody(text);
      throw new Error(`HTTP ${res.status}: ${msg}`);
    } catch {
      throw new Error(`HTTP ${res.status}: ${shortBody(text)}`);
    }
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Nie-JSON z backendu: ${shortBody(text)}`);
  }
}
