import {
  insertReminder,
  updateReminderRow,
  deleteReminderRow,
  getReminder,
} from '../db/remindersRepo';
import { newId } from '../utils/id';

/**
 * Reminder business logic. A reminder is a title, a category and a due date that
 * is shown on the Reminders tab (next reminder + upcoming list).
 */

export async function createReminder({ ownerId, title, category, dueAt, documentId = null }) {
  const id = await insertReminder({
    cloudId: newId(),
    ownerId,
    documentId,
    title,
    category,
    dueAt,
    leadDays: '',
    notificationIds: [],
  });
  return { id };
}

export async function updateReminder(id, ownerId, { title, category, dueAt }) {
  const existing = await getReminder(id, ownerId);
  if (!existing) throw new Error('Reminder not found');
  await updateReminderRow(id, ownerId, { title, category, dueAt, leadDays: '' });
  return { id };
}

export async function removeReminder(reminder) {
  await deleteReminderRow(reminder.id, reminder.ownerId);
}
