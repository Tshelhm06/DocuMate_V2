import { getDb } from './database';

export async function getSetting(key, fallback = null) {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT value FROM settings WHERE key = ?', [key]);
  return row && row.value !== null && row.value !== undefined ? row.value : fallback;
}

export async function setSetting(key, value) {
  const db = await getDb();
  if (value === null || value === undefined) {
    await db.runAsync('DELETE FROM settings WHERE key = ?', [key]);
    return;
  }
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, String(value)]
  );
}

export async function getBoolSetting(key, fallback = false) {
  const v = await getSetting(key, null);
  if (v === null) return fallback;
  return v === '1' || v === 'true';
}

export async function setBoolSetting(key, value) {
  await setSetting(key, value ? '1' : '0');
}
