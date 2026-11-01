import {
  insertDocument,
  updateDocument,
  deleteDocumentRow,
  addPendingDelete,
} from '../db/documentsRepo';
import { getReminderByDocument } from '../db/remindersRepo';
import { createReminder, updateReminder, removeReminder } from './reminders';
import { importFile, makeStoredName, removeFile } from './fileStorage';
import { detectFileType, mimeFromName } from '../utils/files';
import { newId } from '../utils/id';

/**
 * Document business logic (add / edit / delete) - Objective 3.
 * A picked file is copied into the app's own storage first, then the database
 * row is written. If the database write fails the copy is removed again.
 */

export const reminderTitleFor = (docTitle) => `${docTitle.trim()} expiry`;

async function storePickedFile(file) {
  const storedName = makeStoredName(file.name);
  const { size } = await importFile(file.uri, storedName);
  const mimeType = file.mimeType || mimeFromName(file.name);
  return {
    storedName,
    fileName: file.name,
    mimeType,
    fileType: detectFileType(file.name, mimeType),
    fileSize: size || file.size || 0,
  };
}

/**
 * @param {string} ownerId
 * @param {{title:string, category:string, description:string,
 *          file:{uri:string,name:string,size?:number,mimeType?:string},
 *          reminder?: {dueAt:number} | null}} form
 * @returns {{id:number, reminder: null | {scheduled:number, granted:boolean}}}
 */
export async function addDocument(ownerId, form) {
  const stored = await storePickedFile(form.file);

  let id;
  try {
    id = await insertDocument({
      cloudId: newId(),
      ownerId,
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim(),
      ...stored,
    });
  } catch (e) {
    await removeFile(stored.storedName);
    throw e;
  }

  let reminder = null;
  if (form.reminder) {
    reminder = await createReminder({
      ownerId,
      title: reminderTitleFor(form.title),
      category: form.category,
      dueAt: form.reminder.dueAt,
      documentId: id,
    });
  }
  return { id, reminder };
}

/**
 * `form.file` is null to keep the current file, or a picked file to replace it.
 * `form.reminder` is null to remove the reminder, or {dueAt} to set/update it.
 */
export async function editDocument(doc, form) {
  const ownerId = doc.ownerId;
  let fileFields = {
    fileName: doc.fileName,
    storedName: doc.storedName,
    fileType: doc.fileType,
    mimeType: doc.mimeType,
    fileSize: doc.fileSize,
  };
  let newStored = null;

  if (form.file) {
    newStored = await storePickedFile(form.file);
    fileFields = newStored;
  }

  try {
    await updateDocument(doc.id, ownerId, {
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim(),
      ...fileFields,
    });
  } catch (e) {
    if (newStored) await removeFile(newStored.storedName);
    throw e;
  }

  // The old file is only deleted once the new one is safely saved.
  if (newStored && doc.storedName && doc.storedName !== newStored.storedName) {
    await removeFile(doc.storedName);
  }

  // Reminder attached to this document
  const existing = await getReminderByDocument(doc.id, ownerId);
  let reminder = null;

  if (form.reminder) {
    const fields = {
      title: reminderTitleFor(form.title),
      category: form.category,
      dueAt: form.reminder.dueAt,
    };
    reminder = existing
      ? await updateReminder(existing.id, ownerId, fields)
      : await createReminder({ ownerId, documentId: doc.id, ...fields });
  } else if (existing) {
    await removeReminder(existing);
  }

  return { id: doc.id, reminder };
}

export async function removeDocument(doc) {
  const reminder = await getReminderByDocument(doc.id, doc.ownerId);
  if (reminder) await removeReminder(reminder);

  await deleteDocumentRow(doc.id, doc.ownerId);
  await removeFile(doc.storedName);

  if (doc.backedUpAt) {
    await addPendingDelete({ ownerId: doc.ownerId, kind: 'document', cloudId: doc.cloudId });
  }
}
