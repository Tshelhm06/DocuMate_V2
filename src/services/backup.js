import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import * as LegacyFS from 'expo-file-system/legacy';
import { firestore, isFirebaseConfigured } from '../config/firebase';
import {
  listDocuments,
  getDocumentByCloudId,
  insertDocument,
  markDocumentBackedUp,
  listPendingDeletes,
  clearPendingDelete,
} from '../db/documentsRepo';
import { listReminders, getReminderByCloudId, markReminderBackedUp } from '../db/remindersRepo';
import { getLocalUser, updateLocalUser } from '../db/usersRepo';
import { getSetting, setSetting } from '../db/settingsRepo';
import { fileExists, makeStoredName, uriFor } from './fileStorage';
import { restoreReminder } from './reminders';
import { isOnline, withTimeout } from './network';
import { CHUNK_CHARS, MAX_BACKUP_BYTES } from '../utils/constants';

/**
 * Cloud backup and restore using Firestore.
 *
 * Simple MANUAL backup - not automatic two-way sync. The phone stays the main copy.
 *
 *   users/{uid}                                   profile + last backup time
 *   users/{uid}/documents/{cloudId}               document details
 *   users/{uid}/documents/{cloudId}/chunks/{0000} one piece of the file (base64 text)
 *   users/{uid}/reminders/{cloudId}               reminders
 *
 * A Firestore document can hold about 1 MB, so each file is cut into ~600 KB pieces
 * ("chunks") and joined again on restore. Files bigger than MAX_BACKUP_BYTES are
 * not uploaded (their details are backed up, the file stays on the phone).
 *
 * Every record has a random cloudId, so running Back up or Restore twice never
 * creates duplicates.
 */

const CHUNK_TIMEOUT = 60000;
const DB_TIMEOUT = 30000;

export const lastBackupKey = (uid) => `last_backup_${uid}`;

export async function getLastBackupAt(uid) {
  const v = await getSetting(lastBackupKey(uid), null);
  return v ? Number(v) : null;
}

async function assertReady(session) {
  if (!session || session.offline) {
    throw new Error('Log in to an account to use cloud backup.');
  }
  if (!isFirebaseConfigured || !firestore) {
    throw new Error('Firebase is not set up yet. Fill in the .env file (see README).');
  }
  if (!(await isOnline())) {
    throw new Error('No internet connection. Connect to the internet and try again.');
  }
}

export function friendlyBackupError(error) {
  const code = error?.code || '';
  if (code.includes('permission-denied')) {
    return 'Firebase refused the request. Publish the Firestore rules from the firebase/ folder and make sure you are logged in.';
  }
  if (code.includes('unauthenticated')) return 'Please log in again and retry.';
  if (code.includes('resource-exhausted') || code.includes('quota')) {
    return 'The Firebase free-plan limit was reached for today. Try again tomorrow.';
  }
  if (code.includes('unavailable') || code.includes('network')) return 'Network problem. Please try again.';
  return error?.message || 'Something went wrong. Please try again.';
}

const pad = (i) => String(i).padStart(4, '0');
const docRef = (uid, cloudId) => doc(firestore, 'users', uid, 'documents', cloudId);
const chunkRef = (uid, cloudId, i) => doc(firestore, 'users', uid, 'documents', cloudId, 'chunks', pad(i));
const chunksCol = (uid, cloudId) => collection(firestore, 'users', uid, 'documents', cloudId, 'chunks');

/** Delete stored pieces of a file (all of them, or only those from `fromIndex` on). */
async function deleteChunks(uid, cloudId, fromIndex = 0) {
  const snap = await withTimeout(getDocs(chunksCol(uid, cloudId)), DB_TIMEOUT);
  for (const c of snap.docs) {
    if (Number(c.id) >= fromIndex) await withTimeout(deleteDoc(c.ref), DB_TIMEOUT);
  }
}

/** Upload one file as chunks. Returns how many chunks were written. */
async function uploadFile(uid, d) {
  const base64 = await LegacyFS.readAsStringAsync(uriFor(d.storedName), { encoding: 'base64' });
  const total = Math.max(1, Math.ceil(base64.length / CHUNK_CHARS));
  for (let i = 0; i < total; i += 1) {
    await withTimeout(
      setDoc(chunkRef(uid, d.cloudId, i), { i, data: base64.slice(i * CHUNK_CHARS, (i + 1) * CHUNK_CHARS) }),
      CHUNK_TIMEOUT,
      'Uploading a file took too long.'
    );
  }
  // An older, longer version of the file may have left extra chunks behind.
  await deleteChunks(uid, d.cloudId, total);
  return total;
}

/**
 * Upload everything that is new or changed since the last backup.
 * @param {{uid:string, offline:boolean}} session
 * @param {(msg:string)=>void} [onProgress]
 */
export async function backupNow(session, onProgress = () => {}) {
  await assertReady(session);
  const uid = session.uid;

  const docs = await listDocuments(uid);
  const reminders = await listReminders(uid);
  const docCloudIdByLocalId = new Map(docs.map((d) => [d.id, d.cloudId]));

  const summary = { uploaded: 0, upToDate: 0, failed: 0, removed: 0, tooLarge: 0, firstError: null };

  // 1. Documents 
  let n = 0;
  for (const d of docs) {
    n += 1;
    onProgress(`Backing up documents (${n}/${docs.length})`);

    const changed = !d.backedUpAt || d.updatedAt > d.backedUpAt;
    if (!changed) {
      summary.upToDate += 1;
      continue;
    }

    try {
      const hasFile = await fileExists(d.storedName);
      const tooLarge = hasFile && d.fileSize > MAX_BACKUP_BYTES;
      let chunkCount = 0;

      if (hasFile && !tooLarge) {
        chunkCount = await uploadFile(uid, d);
      } else {
        if (tooLarge) summary.tooLarge += 1;
        if (d.backedUpAt) await deleteChunks(uid, d.cloudId, 0); // file removed or now too large
      }

      // Details are written last, so a restore never sees details without their file.
      await withTimeout(
        setDoc(docRef(uid, d.cloudId), {
          title: d.title,
          category: d.category,
          description: d.description,
          fileName: d.fileName,
          fileType: d.fileType,
          mimeType: d.mimeType,
          fileSize: d.fileSize,
          addedAt: d.addedAt,
          updatedAt: d.updatedAt,
          hasFile: chunkCount > 0,
          chunkCount,
          fileTooLarge: Boolean(tooLarge),
          backedUpAt: Date.now(),
        }),
        DB_TIMEOUT
      );
      await markDocumentBackedUp(d.id);
      summary.uploaded += 1;
    } catch (e) {
      summary.failed += 1;
      summary.firstError = summary.firstError || friendlyBackupError(e);
    }
  }

  // 2. Reminders 
  n = 0;
  for (const r of reminders) {
    n += 1;
    onProgress(`Backing up reminders (${n}/${reminders.length})`);
    if (r.backedUpAt) continue;

    try {
      await withTimeout(
        setDoc(doc(firestore, 'users', uid, 'reminders', r.cloudId), {
          title: r.title,
          category: r.category,
          dueAt: r.dueAt,
          leadDays: r.leadDays,
          documentCloudId: r.documentId ? docCloudIdByLocalId.get(r.documentId) ?? null : null,
          createdAt: r.createdAt,
          backedUpAt: Date.now(),
        }),
        DB_TIMEOUT
      );
      await markReminderBackedUp(r.id);
    } catch (e) {
      summary.failed += 1;
      summary.firstError = summary.firstError || friendlyBackupError(e);
    }
  }

  // 3. Things deleted on this phone since the last backup ----------------------
  const pending = await listPendingDeletes(uid);
  for (const p of pending) {
    onProgress('Removing deleted items from the backup');
    try {
      if (p.kind === 'document') {
        await deleteChunks(uid, p.cloud_id, 0); // Firestore does not delete sub-collections by itself
        await withTimeout(deleteDoc(docRef(uid, p.cloud_id)), DB_TIMEOUT);
      } else {
        await withTimeout(deleteDoc(doc(firestore, 'users', uid, 'reminders', p.cloud_id)), DB_TIMEOUT);
      }
      await clearPendingDelete(p.id);
      summary.removed += 1;
    } catch (e) {
      summary.failed += 1;
      summary.firstError = summary.firstError || friendlyBackupError(e);
    }
  }

  // 4. Profile + timestamp 
  try {
    onProgress('Saving profile');
    const profile = await getLocalUser(uid);
    const now = Date.now();
    await withTimeout(
      setDoc(
        doc(firestore, 'users', uid),
        {
          name: profile?.name ?? '',
          email: profile?.email ?? '',
          degree: profile?.degree ?? '',
          studentId: profile?.studentId ?? '',
          lastBackupAt: now,
        },
        { merge: true }
      ),
      DB_TIMEOUT
    );
    if (summary.failed === 0) await setSetting(lastBackupKey(uid), now);
  } catch (e) {
    summary.failed += 1;
    summary.firstError = summary.firstError || friendlyBackupError(e);
  }

  return summary;
}

/** Download and join the chunks of one file, save it in app storage. */
async function downloadFileFromChunks(uid, cloudId, data) {
  const snap = await withTimeout(getDocs(chunksCol(uid, cloudId)), DB_TIMEOUT);
  const parts = snap.docs.map((c) => c.data()).sort((a, b) => a.i - b.i);
  if (parts.length !== data.chunkCount) {
    throw new Error('Some parts of this file are missing in the backup. Back up again from your other phone.');
  }

  const storedName = makeStoredName(data.fileName || 'document');
  const uri = uriFor(storedName);
  try {
    await LegacyFS.makeDirectoryAsync(uri.slice(0, uri.lastIndexOf('/')), { intermediates: true });
  } catch (_) {
    // folder already exists
  }
  try {
    await LegacyFS.writeAsStringAsync(uri, parts.map((p) => p.data).join(''), { encoding: 'base64' });
  } catch (e) {
    await LegacyFS.deleteAsync(uri, { idempotent: true }).catch(() => {});
    throw e;
  }
  const info = await LegacyFS.getInfoAsync(uri);
  return { storedName, size: info.exists && info.size ? info.size : data.fileSize || 0 };
}

/**
 * Bring the cloud copy back onto this phone (for example a new device).
 * Items that already exist on the phone are left alone.
 */
export async function restoreFromCloud(session, onProgress = () => {}) {
  await assertReady(session);
  const uid = session.uid;

  const summary = { restored: 0, alreadyHere: 0, failed: 0, reminders: 0, firstError: null };

  onProgress('Looking for your backup');
  const remoteDocs = await withTimeout(getDocs(collection(firestore, 'users', uid, 'documents')), DB_TIMEOUT);
  const remoteReminders = await withTimeout(getDocs(collection(firestore, 'users', uid, 'reminders')), DB_TIMEOUT);

  // Items the user deleted on this phone but has not backed up yet must not come back.
  const pendingIds = new Set((await listPendingDeletes(uid)).map((p) => p.cloud_id));

  // 1. Documents 
  let n = 0;
  for (const snap of remoteDocs.docs) {
    n += 1;
    onProgress(`Restoring documents (${n}/${remoteDocs.size})`);
    const cloudId = snap.id;
    const data = snap.data();

    if (pendingIds.has(cloudId)) continue;
    if (await getDocumentByCloudId(cloudId, uid)) {
      summary.alreadyHere += 1;
      continue;
    }

    let storedName = '';
    let size = data.fileSize || 0;
    try {
      if (data.hasFile && data.chunkCount > 0) {
        const saved = await downloadFileFromChunks(uid, cloudId, data);
        storedName = saved.storedName;
        size = saved.size;
      }

      await insertDocument({
        cloudId,
        ownerId: uid,
        title: data.title || 'Untitled',
        category: data.category || 'Personal',
        description: data.description || '',
        fileName: data.fileName || '',
        storedName,
        fileType: data.fileType || 'other',
        mimeType: data.mimeType || '',
        fileSize: size,
        addedAt: data.addedAt || Date.now(),
        updatedAt: data.updatedAt || Date.now(),
        backedUpAt: Date.now(),
      });
      summary.restored += 1;
    } catch (e) {
      summary.failed += 1;
      summary.firstError = summary.firstError || friendlyBackupError(e);
    }
  }

  // 2. Reminders (also re-schedules their notifications on this phone) 
  n = 0;
  for (const snap of remoteReminders.docs) {
    n += 1;
    onProgress(`Restoring reminders (${n}/${remoteReminders.size})`);
    const cloudId = snap.id;
    const data = snap.data();

    if (pendingIds.has(cloudId)) continue;
    if (await getReminderByCloudId(cloudId, uid)) continue;

    try {
      const linked = data.documentCloudId ? await getDocumentByCloudId(data.documentCloudId, uid) : null;
      await restoreReminder({
        cloudId,
        ownerId: uid,
        documentId: linked ? linked.id : null,
        title: data.title,
        category: data.category,
        dueAt: data.dueAt,
        leadDays: data.leadDays || '7,1',
      });
      summary.reminders += 1;
    } catch (e) {
      summary.failed += 1;
      summary.firstError = summary.firstError || friendlyBackupError(e);
    }
  }

  // 3. Profile details 
  try {
    const profileSnap = await withTimeout(getDoc(doc(firestore, 'users', uid)), DB_TIMEOUT);
    const local = await getLocalUser(uid);
    if (profileSnap.exists() && local) {
      const p = profileSnap.data();
      await updateLocalUser(uid, {
        name: local.name || p.name || '',
        degree: local.degree || p.degree || '',
        studentId: local.studentId || p.studentId || '',
      });
    }
  } catch (_) {
    // Profile details are optional.
  }

  return summary;
}