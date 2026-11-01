import { getDb } from './database';

function mapReminder(r) {
  if (!r) return null;
  let notificationIds = [];
  try {
    notificationIds = JSON.parse(r.notification_ids || '[]');
  } catch (_) {
    notificationIds = [];
  }
  return {
    id: r.id,
    cloudId: r.cloud_id,
    ownerId: r.owner_id,
    documentId: r.document_id,
    title: r.title,
    category: r.category,
    dueAt: r.due_at,
    leadDays: r.lead_days,
    notificationIds,
    createdAt: r.created_at,
    backedUpAt: r.backed_up_at,
  };
}

export async function listReminders(ownerId) {
  const db = await getDb();
  const rows = await db.getAllAsync(
    'SELECT * FROM reminders WHERE owner_id = ? ORDER BY due_at ASC, id ASC',
    [ownerId]
  );
  return rows.map(mapReminder);
}

export async function getReminder(id, ownerId) {
  const db = await getDb();
  return mapReminder(
    await db.getFirstAsync('SELECT * FROM reminders WHERE id = ? AND owner_id = ?', [id, ownerId])
  );
}

export async function getReminderByDocument(documentId, ownerId) {
  const db = await getDb();
  return mapReminder(
    await db.getFirstAsync(
      'SELECT * FROM reminders WHERE document_id = ? AND owner_id = ? ORDER BY id DESC LIMIT 1',
      [documentId, ownerId]
    )
  );
}

export async function getReminderByCloudId(cloudId, ownerId) {
  const db = await getDb();
  return mapReminder(
    await db.getFirstAsync('SELECT * FROM reminders WHERE cloud_id = ? AND owner_id = ?', [cloudId, ownerId])
  );
}

export async function countUpcomingReminders(ownerId, now = Date.now()) {
  const db = await getDb();
  const row = await db.getFirstAsync(
    'SELECT COUNT(*) AS n FROM reminders WHERE owner_id = ? AND due_at >= ?',
    [ownerId, startOfToday(now)]
  );
  return row?.n ?? 0;
}

function startOfToday(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export async function insertReminder(r) {
  const db = await getDb();
  const res = await db.runAsync(
    `INSERT INTO reminders
       (cloud_id, owner_id, document_id, title, category, due_at, lead_days, notification_ids, created_at, backed_up_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      r.cloudId,
      r.ownerId,
      r.documentId ?? null,
      r.title,
      r.category,
      r.dueAt,
      r.leadDays,
      JSON.stringify(r.notificationIds ?? []),
      r.createdAt ?? Date.now(),
      r.backedUpAt ?? null,
    ]
  );
  return res.lastInsertRowId;
}

export async function updateReminderRow(id, ownerId, { title, category, dueAt, leadDays }) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE reminders SET title = ?, category = ?, due_at = ?, lead_days = ?, backed_up_at = NULL
     WHERE id = ? AND owner_id = ?`,
    [title, category, dueAt, leadDays, id, ownerId]
  );
}

export async function setNotificationIds(id, ids) {
  const db = await getDb();
  await db.runAsync('UPDATE reminders SET notification_ids = ? WHERE id = ?', [JSON.stringify(ids), id]);
}

export async function deleteReminderRow(id, ownerId) {
  const db = await getDb();
  await db.runAsync('DELETE FROM reminders WHERE id = ? AND owner_id = ?', [id, ownerId]);
}

export async function markReminderBackedUp(id, at = Date.now()) {
  const db = await getDb();
  await db.runAsync('UPDATE reminders SET backed_up_at = ? WHERE id = ?', [at, id]);
}

export async function deleteAllRemindersForOwner(ownerId) {
  const db = await getDb();
  await db.runAsync('DELETE FROM reminders WHERE owner_id = ?', [ownerId]);
}
