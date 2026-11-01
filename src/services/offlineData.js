import { getDb } from '../db/database';
import { OFFLINE_UID } from '../utils/constants';

/** Documents saved in "Continue offline" mode, waiting for an account. */
export async function countOfflineDocuments() {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT COUNT(*) AS n FROM documents WHERE owner_id = ?', [OFFLINE_UID]);
  return row?.n ?? 0;
}

/** Move offline documents and reminders into a signed-in account. */
export async function adoptOfflineData(uid) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE documents SET owner_id = ?, backed_up_at = NULL WHERE owner_id = ?', [uid, OFFLINE_UID]);
    await db.runAsync('UPDATE reminders SET owner_id = ?, backed_up_at = NULL WHERE owner_id = ?', [uid, OFFLINE_UID]);
  });
}
