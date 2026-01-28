// functions/src/date.ts

// Zamienia "31.10.2024" -> "2024-10-31" (stary helper – zostawiamy dla zgodności)
export function firstDateToISO(range: string): string {
  const m = range.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return "";
  const dd = m[1];
  const mm = m[2];
  const yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
}

// === PZLS date range parser ===
const MONTHS_PL: Record<string, number> = {
  sty: 1, styczen: 1, styczeń: 1, stycznia: 1,
  lut: 2, luty: 2, lutego: 2,
  mar: 3, marzec: 3, marca: 3,
  kwi: 4, kwiecien: 4, kwiecień: 4, kwietnia: 4,
  maj: 5, maja: 5,
  cze: 6, czerwiec: 6, czerwca: 6,
  lip: 7, lipiec: 7, lipca: 7,
  sie: 8, sierpien: 8, sierpień: 8, sierpnia: 8,
  wrz: 9, wrzesien: 9, wrzesień: 9, wrzesnia: 9, września: 9,
  paz: 10, paź: 10, pazdziernik: 10, październik: 10, pazdziernika: 10, października: 10,
  lis: 11, listopad: 11, listopada: 11,
  gru: 12, grudzien: 12, grudzień: 12, grudnia: 12,
};

function pad(n: number) { return String(n).padStart(2, "0"); }
function iso(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function norm(input: string) {
  // BEZ replaceAll – używamy regex /g
  return input
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/[–—−]/g, "-")
    .replace(/\./g, ".")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // usuwamy ogonki
}

/**
 * Parsuje formaty z PZŁS:
 *  - "1-3.11.2025"
 *  - "30.11-2.12.2025"
 *  - "1-3 listopada 2025"
 *  - "02.11.2025"
 * Zwraca: startISO, endISO, days[], displayText
 */
export function parsePZLSDateRange(raw: string): {
  startISO: string;
  endISO: string;
  days: string[];
  displayText: string;
} {
  const s = norm(raw).trim();

  const days: string[] = [];
  let start: Date;
  let end: Date;

  const nowYear = new Date().getFullYear();

  // 1) 30.11-2.12.2025 (różne miesiące)
  let m = s.match(/^(\d{1,2})\.(\d{1,2})-(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const d1 = Number(m[1]);
    const M1 = Number(m[2]);
    const d2 = Number(m[3]);
    const M2 = Number(m[4]);
    const Y = Number(m[5]);
    start = new Date(Y, M1 - 1, d1);
    end = new Date(Y, M2 - 1, d2);
  } else {
    // 2) 1-3.11.2025 (ten sam miesiąc)
    m = s.match(/^(\d{1,2})-(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (m) {
      const d1 = Number(m[1]);
      const d2 = Number(m[2]);
      const M = Number(m[3]);
      const Y = Number(m[4]);
      start = new Date(Y, M - 1, d1);
      end = new Date(Y, M - 1, d2);
    } else {
      // 3) 1-3 listopada 2025
      m = s.match(/^(\d{1,2})-(\d{1,2})\s+([a-ząćęłńóśźż\.]+)\s+(\d{4})$/i);
      if (m) {
        const d1 = Number(m[1]);
        const d2 = Number(m[2]);
        const mon = m[3].replace(".", "");
        const Y = Number(m[4]);
        const M = MONTHS_PL[mon] ?? 1;
        start = new Date(Y, M - 1, d1);
        end = new Date(Y, M - 1, d2);
      } else {
        // 4) 02.11.2025 (pojedynczy dzień)
        m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
        if (m) {
          const d = Number(m[1]);
          const M = Number(m[2]);
          const Y = Number(m[3]);
          start = new Date(Y, M - 1, d);
          end = new Date(Y, M - 1, d);
        } else {
          // fallback: np. "1-3" -> bieżący m-c/rok
          m = s.match(/^(\d{1,2})-(\d{1,2})$/);
          if (m) {
            const d1 = Number(m[1]);
            const d2 = Number(m[2]);
            const M = new Date().getMonth() + 1;
            start = new Date(nowYear, M - 1, d1);
            end = new Date(nowYear, M - 1, d2);
          } else {
            // ostateczny fallback
            const d = new Date(s);
            if (isNaN(d.getTime())) throw new Error(`Nieznany format daty: ${raw}`);
            start = d;
            end = d;
          }
        }
      }
    }
  }

  // porządek
  if (start > end) { const tmp = start; start = end; end = tmp; }

  // lista dni
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(iso(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  // label do UI
  const sameMonth = (start.getMonth() === end.getMonth()) && (start.getFullYear() === end.getFullYear());
  const displayText = sameMonth
    ? `${start.getDate()}–${end.getDate()}.${pad(start.getMonth() + 1)}.${start.getFullYear()}`
    : `${start.getDate()}.${pad(start.getMonth() + 1)}–${end.getDate()}.${pad(end.getMonth() + 1)}.${end.getFullYear()}`;

  return {
    startISO: iso(start),
    endISO: iso(end),
    days,
    displayText,
  };
}
