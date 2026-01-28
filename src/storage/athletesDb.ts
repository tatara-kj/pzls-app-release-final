import * as SQLite from "expo-sqlite";

export type AthleteSort = "alpha" | "recent";

export type AthleteRow = {
  id: string;
  firstName: string;
  lastName: string;
  gender: string; // "M" | "K" (czasem "F")
  birthDate: string;
  category: string;
  club: string;
  sourceUpdatedAt: string;

  // wyszukiwanie / sort:
  searchKey: string;
  updatedAtMs: number;

  // klucze bez polskich znaków:
  firstNameKey: string;
  lastNameKey: string;
  clubKey: string;
  categoryKey: string;
};

const db = SQLite.openDatabaseSync("pzls.db");

function normalizeForSearch(t: string) {
  return (t ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function buildSearchKey(
  a: Pick<
    AthleteRow,
    "firstNameKey" | "lastNameKey" | "clubKey" | "categoryKey"
  >,
) {
  // zawiera OBIE kolejności imienia/nazwiska
  return `${a.lastNameKey} ${a.firstNameKey} ${a.firstNameKey} ${a.lastNameKey} ${a.clubKey} ${a.categoryKey}`
    .replace(/\s+/g, " ")
    .trim();
}

export async function initAthletesDb() {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS athletes (
      id TEXT PRIMARY KEY NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      gender TEXT NOT NULL,
      birthDate TEXT NOT NULL,
      category TEXT NOT NULL,
      club TEXT NOT NULL,
      sourceUpdatedAt TEXT NOT NULL,

      searchKey TEXT NOT NULL,
      updatedAtMs INTEGER NOT NULL DEFAULT 0,

      firstNameKey TEXT NOT NULL DEFAULT '',
      lastNameKey TEXT NOT NULL DEFAULT '',
      clubKey TEXT NOT NULL DEFAULT '',
      categoryKey TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  // migracje (kolumny mogą nie istnieć w starszej bazie)
  const addCol = async (sql: string) => {
    try {
      await db.execAsync(sql);
    } catch {
      // już jest
    }
  };

  await addCol(
    `ALTER TABLE athletes ADD COLUMN updatedAtMs INTEGER NOT NULL DEFAULT 0;`,
  );
  await addCol(
    `ALTER TABLE athletes ADD COLUMN firstNameKey TEXT NOT NULL DEFAULT '';`,
  );
  await addCol(
    `ALTER TABLE athletes ADD COLUMN lastNameKey TEXT NOT NULL DEFAULT '';`,
  );
  await addCol(
    `ALTER TABLE athletes ADD COLUMN clubKey TEXT NOT NULL DEFAULT '';`,
  );
  await addCol(
    `ALTER TABLE athletes ADD COLUMN categoryKey TEXT NOT NULL DEFAULT '';`,
  );

  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_athletes_searchKey ON athletes(searchKey);
    CREATE INDEX IF NOT EXISTS idx_athletes_lastNameKey ON athletes(lastNameKey);
    CREATE INDEX IF NOT EXISTS idx_athletes_updatedAtMs ON athletes(updatedAtMs);
  `);

  // jednorazowe przeliczenie kluczy dla istniejących 5k rekordów
  const MIG_KEY = "athletes_searchkeys_v1";
  const done = await getMeta(MIG_KEY);
  if (done === "1") return;

  const rows = await db.getAllAsync<{
    id: string;
    firstName: string;
    lastName: string;
    club: string;
    category: string;
  }>(`SELECT id, firstName, lastName, club, category FROM athletes;`);

  if (!rows.length) {
    await setMeta(MIG_KEY, "1");
    return;
  }

  await db.withTransactionAsync(async () => {
    const stmt = await db.prepareAsync(
      `UPDATE athletes
       SET firstNameKey=?, lastNameKey=?, clubKey=?, categoryKey=?, searchKey=?
       WHERE id=?;`,
    );
    try {
      let i = 0;
      for (const r of rows) {
        const firstNameKey = normalizeForSearch(r.firstName);
        const lastNameKey = normalizeForSearch(r.lastName);
        const clubKey = normalizeForSearch(r.club);
        const categoryKey = normalizeForSearch(r.category);
        const searchKey = buildSearchKey({
          firstNameKey,
          lastNameKey,
          clubKey,
          categoryKey,
        });

        await stmt.executeAsync([
          firstNameKey,
          lastNameKey,
          clubKey,
          categoryKey,
          searchKey,
          r.id,
        ]);

        i++;
        if (i % 400 === 0) await new Promise((res) => setTimeout(res, 0));
      }
    } finally {
      await stmt.finalizeAsync();
    }
  });

  await setMeta(MIG_KEY, "1");
}

export async function getMeta(key: string) {
  const rows = await db.getAllAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key = ? LIMIT 1;`,
    [key],
  );
  return rows[0]?.value ?? null;
}

export async function setMeta(key: string, value: string) {
  await db.runAsync(
    `INSERT INTO meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [key, value],
  );
}

const UPSERT_SQL = `
  INSERT INTO athletes (
    id,
    firstName, lastName, gender, birthDate, category, club,
    sourceUpdatedAt,
    searchKey,
    updatedAtMs,
    firstNameKey, lastNameKey, clubKey, categoryKey
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    firstName=excluded.firstName,
    lastName=excluded.lastName,
    gender=excluded.gender,
    birthDate=excluded.birthDate,
    category=excluded.category,
    club=excluded.club,
    sourceUpdatedAt=excluded.sourceUpdatedAt,
    searchKey=excluded.searchKey,
    updatedAtMs=excluded.updatedAtMs,
    firstNameKey=excluded.firstNameKey,
    lastNameKey=excluded.lastNameKey,
    clubKey=excluded.clubKey,
    categoryKey=excluded.categoryKey;
`;

export async function upsertAthletes(rows: AthleteRow[]) {
  if (!rows.length) return;

  await db.withTransactionAsync(async () => {
    const stmt = await db.prepareAsync(UPSERT_SQL);
    try {
      for (const r of rows) {
        await stmt.executeAsync([
          r.id,
          r.firstName,
          r.lastName,
          r.gender,
          r.birthDate,
          r.category,
          r.club,
          r.sourceUpdatedAt,
          r.searchKey,
          r.updatedAtMs,
          r.firstNameKey,
          r.lastNameKey,
          r.clubKey,
          r.categoryKey,
        ]);
      }
    } finally {
      await stmt.finalizeAsync();
    }
  });
}

export async function getAthletesLike(
  query: string,
  limit = 240,
  sort: AthleteSort = "alpha",
) {
  const q = normalizeForSearch(query);

  const orderBy =
    sort === "recent"
      ? `ORDER BY updatedAtMs DESC, lastNameKey ASC`
      : `ORDER BY lastNameKey ASC, firstNameKey ASC`;

  if (!q) {
    return db.getAllAsync<AthleteRow>(
      `SELECT * FROM athletes ${orderBy} LIMIT ?;`,
      [limit],
    );
  }

  const like = `%${q}%`;
  return db.getAllAsync<AthleteRow>(
    `
    SELECT * FROM athletes
    WHERE
      (lastNameKey || ' ' || firstNameKey) LIKE ?
      OR (firstNameKey || ' ' || lastNameKey) LIKE ?
      OR clubKey LIKE ?
      OR categoryKey LIKE ?
      OR searchKey LIKE ?
    ${orderBy}
    LIMIT ?;
    `,
    [like, like, like, like, like, limit],
  );
}

export async function getAthletesCount() {
  const rows = await db.getAllAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM athletes;`,
  );
  return rows[0]?.c ?? 0;
}
export async function getAthleteByIdRow(id: string) {
  const rows = await db.getAllAsync<AthleteRow>(
    `SELECT * FROM athletes WHERE id = ? LIMIT 1;`,
    [id],
  );
  return rows[0] ?? null;
}
