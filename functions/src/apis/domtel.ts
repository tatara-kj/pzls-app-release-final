import axios from "axios";

const BASE_URL = "https://domtel-sport.pl/statystyka/api/";

type DomtelParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export async function domtelFetch<T = any>(
  endpoint: string,
  token: string,
  params: DomtelParams
): Promise<T[]> {
  const url = `${BASE_URL}${endpoint}`;

  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    params,
    timeout: 30000,
  });

  const data = res.data;

  // Domtel czasem zwraca tablicę, a czasem obiekt { "1": {...}, "2": {...} }
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") return Object.values(data) as T[];
  return [];
}
