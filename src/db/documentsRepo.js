import { getDb } from './database';
import { CATEGORIES } from '../utils/constants';

function mapDoc(r) {
  if (!r) return null;
  return {
    id: r.id,
    cloudId: r.cloud_id,
    ownerId: r.owner_id,
    title: r.title,
    category: r.category,
    description: r.description,
    fileName: r.file_name,
    storedName: r.stored_name,
    fileType: r.file_type,
    mimeType: r.mime_type,
    fileSize: r.file_size,
    addedAt: r.added_at,
    updatedAt: r.updated_at,
    backedUpAt: r.backed_up_at,
  };
}

function escapeLike(text) {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * List documents for one user.
 * @param {string} ownerId
 * @param {{category?: string|null, query?: string}} filters
 */
export async function listDocuments(ownerId, { category = null, query = '' } = {}) {
  const db = await getDb();
  const where = ['owner_id = ?'];
  const params = [ownerId];

  if (category && category !== 'All') {
    where.push('category = ?');
    params.push(category);
  }

  const q = String(query || '').trim();
  if (q) {
    const like = `%${escapeLike(q)}%`;
    where.push(
      `(title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR file_name LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\')`
    );
    params.push(like, like, like, like);
  }

  const rows = await db.getAllAsync(
    `SELECT * FROM documents WHERE ${where.join(' AND ')} ORDER BY updated_at DESC, id DESC`,
    params
  );
  return rows.map(mapDoc);
}

export async function getDocument(id, ownerId) {
  const db = await getDb();
  return mapDoc(
    await db.getFirstAsync('SELECT * FROM documents WHERE id = ? AND owner_id = ?', [id, ownerId])
  );
}

export async function getDocumentByCloudId(cloudId, ownerId) {
  const db = await getDb();
  return mapDoc(
    await db.getFirstAsync('SELECT * FROM documents WHERE cloud_id = ? AND owner_id = ?', [cloudId, ownerId])
  );
}

export async function recentDocuments(ownerId, limit = 3) {
  const db = await getDb();
  const rows = await db.getAllAsync(
    'SELECT * FROM documents WHERE owner_id = ? ORDER BY added_at DESC, id DESC LIMIT ?',
    [ownerId, limit]
  );
  return rows.map(mapDoc);
}

/** { total, Academic, Certificates, Career, Personal } */
export async function documentCounts(ownerId) {
  const db = await getDb();
  const rows = await db.getAllAsync(
    'SELECT category, COUNT(*) AS n FROM documents WHERE owner_id = ? GROUP BY category',
    [ownerId]
  );
  const counts = { total: 0 };
  CATEGORIES.forEach((c) => {
    counts[c] = 0;
  });
  rows.forEach((r) => {
    counts[r.category] = r.n;
    counts.total += r.n;
  });
  return counts;
}

export async function totalFileSize(ownerId) {
  const db = await getDb();
  const row = await db.getFirstAsync(
    'SELECT COALESCE(SUM(file_size), 0) AS total FROM documents WHERE owner_id = ?',
    [ownerId]
  );
  return row?.total ?? 0;
}

export async function insertDocument(doc) {
  const db = await getDb();
  const now = Date.now();
  const res = await db.runAsync(
    `INSERT INTO documents
      (cloud_id, owner_id, title, category, description, file_name, stored_name,
       file_type, mime_type, file_size, added_at, updated_at, backed_up_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      doc.cloudId,
      doc.ownerId,
      doc.title,
      doc.category,
      doc.description ?? '',
      doc.fileName ?? '',
      doc.storedName ?? '',
      doc.fileType ?? 'other',
      doc.mimeType ?? '',
      doc.fileSize ?? 0,
      doc.addedAt ?? now,
      doc.updatedAt ?? now,
      doc.backedUpAt ?? null,
    ]
  );
  return res.lastInsertRowId;
}

export async function updateDocument(id, ownerId, fields) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE documents SET
       title = ?, category = ?, description = ?,
       file_name = ?, stored_name = ?, file_type = ?, mime_type = ?, file_size = ?,
       updated_at = ?
     WHERE id = ? AND owner_id = ?`,
    [
      fields.title,
      fields.category,
      fields.description ?? '',
      fields.fileName,
      fields.storedName,
      fields.fileType,
      fields.mimeType,
      fields.fileSize,
      Date.now(),
      id,
      ownerId,
    ]
  );
}

export async function deleteDocumentRow(id, ownerId) {
  const db = await getDb();
  await db.runAsync('DELETE FROM documents WHERE id = ? AND owner_id = ?', [id, ownerId]);
}

export async function markDocumentBackedUp(id, at = Date.now()) {
  const db = await getDb();
  await db.runAsync('UPDATE documents SET backed_up_at = ? WHERE id = ?', [at, id]);
}

export async function deleteAllForOwner(ownerId) {
  const db = await getDb();
  await db.runAsync('DELETE FROM documents WHERE owner_id = ?', [ownerId]);
}

// --- backup tombstones -----------------------------------------------------

export async function addPendingDelete({ ownerId, kind, cloudId, storagePath = null }) {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO pending_deletes (owner_id, kind, cloud_id, storage_path) VALUES (?, ?, ?, ?)',
    [ownerId, kind, cloudId, storagePath]
  );
}

export async function listPendingDeletes(ownerId) {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM pending_deletes WHERE owner_id = ?', [ownerId]);
}

export async function clearPendingDelete(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM pending_deletes WHERE id = ?', [id]);
}
