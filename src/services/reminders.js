import {
  insertReminder,
  updateReminderRow,
  setNotificationIds,
  deleteReminderRow,
  getReminder,
  listReminders,
} from '../db/remindersRepo';
import { scheduleForReminder, cancelNotifications } from './notifications';
import { addPendingDelete } from '../db/documentsRepo';
import { newId } from '../utils/id';
import { serializeLeadDays } from '../utils/reminderSchedule';

/**
 * Reminder business logic: keeps the SQLite row and the phone's scheduled
 * notifications in step with each other.
 */

async function scheduleAndSave(reminder) {
  const result = await scheduleForReminder(reminder);
  await setNotificationIds(reminder.id, result.ids);
  return result;
}

/**
 * @returns {{id:number, scheduled:number, granted:boolean}}
 */
export async function createReminder({ ownerId, title, category, dueAt, leadDays, documentId = null }) {
  const leadText = serializeLeadDays(leadDays);
  const id = await insertReminder({
    cloudId: newId(),
    ownerId,
    documentId,
    title,
    category,
    dueAt,
    leadDays: leadText,
    notificationIds: [],
  });
  const result = await scheduleAndSave({ id, title, dueAt, leadDays: leadText });
  return { id, ...result };
}

export async function updateReminder(id, ownerId, { title, category, dueAt, leadDays }) {
  const existing = await getReminder(id, ownerId);
  if (!existing) throw new Error('Reminder not found');

  await cancelNotifications(existing.notificationIds);
  const leadText = serializeLeadDays(leadDays);
  await updateReminderRow(id, ownerId, { title, category, dueAt, leadDays: leadText });
  const result = await scheduleAndSave({ id, title, dueAt, leadDays: leadText });
  return { id, ...result };
}

export async function removeReminder(reminder) {
  await cancelNotifications(reminder.notificationIds);
  await deleteReminderRow(reminder.id, reminder.ownerId);
  if (reminder.backedUpAt) {
    await addPendingDelete({ ownerId: reminder.ownerId, kind: 'reminder', cloudId: reminder.cloudId });
  }
}

/** Used by Restore: inserts a reminder that already has a cloud id. */
export async function restoreReminder({ cloudId, ownerId, documentId, title, category, dueAt, leadDays }) {
  const id = await insertReminder({
    cloudId,
    ownerId,
    documentId,
    title,
    category,
    dueAt,
    leadDays,
    notificationIds: [],
    backedUpAt: Date.now(),
  });
  await scheduleAndSave({ id, title, dueAt, leadDays });
  return id;
}