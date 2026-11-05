import * as SQLite from 'expo-sqlite';

/**
 * Local SQLite database (Objective 3: offline storage).
 * The device copy is always the main copy; Firebase is only a backup.
 *
 * Schema versions use PRAGMA user_version, so adding a column later means
 * pushing one more function onto MIGRATIONS.
 */

const DB_NAME = 'documate_v2.db';

const MIGRATIONS = [
  // v1 ---------------------------------------------------------------
  async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        uid         TEXT PRIMARY KEY NOT NULL,
        name        TEXT NOT NULL DEFAULT '',
        email       TEXT NOT NULL DEFAULT '',
        degree      TEXT NOT NULL DEFAULT '',
        student_id  TEXT NOT NULL DEFAULT '',
        created_at  INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS documents (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        cloud_id      TEXT NOT NULL UNIQUE,
        owner_id      TEXT NOT NULL,
        title         TEXT NOT NULL,
        category      TEXT NOT NULL,
        description   TEXT NOT NULL DEFAULT '',
        file_name     TEXT NOT NULL DEFAULT '',
        stored_name   TEXT NOT NULL DEFAULT '',
        file_type     TEXT NOT NULL DEFAULT 'other',
        mime_type     TEXT NOT NULL DEFAULT '',
        file_size     INTEGER NOT NULL DEFAULT 0,
        added_at      INTEGER NOT NULL,
        updated_at    INTEGER NOT NULL,
        backed_up_at  INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id, updated_at DESC);

      CREATE TABLE IF NOT EXISTS reminders (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        cloud_id          TEXT NOT NULL UNIQUE,
        owner_id          TEXT NOT NULL,
        document_id       INTEGER REFERENCES documents(id) ON DELETE CASCADE,
        title             TEXT NOT NULL,
        category          TEXT NOT NULL,
        due_at            INTEGER NOT NULL,
        lead_days         TEXT NOT NULL DEFAULT '7,1',
        notification_ids  TEXT NOT NULL DEFAULT '[]',
        created_at        INTEGER NOT NULL,
        backed_up_at      INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_reminders_owner ON reminders(owner_id, due_at);

      -- Things deleted on this phone that must also be removed from the cloud
      -- backup the next time the user taps "Back up now".
      CREATE TABLE IF NOT EXISTS pending_deletes (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id      TEXT NOT NULL,
        kind          TEXT NOT NULL,          -- 'document' | 'reminder'
        cloud_id      TEXT NOT NULL,
        storage_path  TEXT
      );

      CREATE TABLE IF NOT EXISTS settings (
        key    TEXT PRIMARY KEY NOT NULL,
        value  TEXT
      );
    `);
  },
];

let dbPromise = null;

async function migrate(db) {
  const row = await db.getFirstAsync('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (let v = current; v < MIGRATIONS.length; v += 1) {
    await db.withTransactionAsync(async () => {
      await MIGRATIONS[v](db);
    });
    await db.execAsync(`PRAGMA user_version = ${v + 1}`);
  }
}

async function init() {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migrate(db);
  return db;
}

/** Returns the one shared database connection. */
export function getDb() {
  if (!dbPromise) {
    dbPromise = init().catch((err) => {
      dbPromise = null; // allow a retry on next call
      throw err;
    });
  }
  return dbPromise;
}
