import { getDb } from './database';

function mapUser(r) {
  if (!r) return null;
  return {
    uid: r.uid,
    name: r.name,
    email: r.email,
    degree: r.degree,
    studentId: r.student_id,
    createdAt: r.created_at,
  };
}

export async function getLocalUser(uid) {
  const db = await getDb();
  return mapUser(await db.getFirstAsync('SELECT * FROM users WHERE uid = ?', [uid]));
}

/** Create the local profile row if missing; fill name/email if they were blank. */
export async function ensureLocalUser(uid, { name = '', email = '' } = {}) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO users (uid, name, email, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(uid) DO UPDATE SET
       name  = CASE WHEN users.name  = '' THEN excluded.name  ELSE users.name  END,
       email = CASE WHEN users.email = '' THEN excluded.email ELSE users.email END`,
    [uid, name, email, Date.now()]
  );
  return getLocalUser(uid);
}

export async function updateLocalUser(uid, { name, degree, studentId }) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE users SET name = ?, degree = ?, student_id = ? WHERE uid = ?',
    [name, degree, studentId, uid]
  );
  return getLocalUser(uid);
}

export async function deleteLocalUser(uid) {
  const db = await getDb();
  await db.runAsync('DELETE FROM users WHERE uid = ?', [uid]);
}
