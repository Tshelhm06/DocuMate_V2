import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import * as authService from '../services/auth';
import { ensureLocalUser, getLocalUser, updateLocalUser, deleteLocalUser } from '../db/usersRepo';
import { getBoolSetting, setBoolSetting, getSetting, setSetting } from '../db/settingsRepo';
import { getDb } from '../db/database';
import { OFFLINE_UID } from '../utils/constants';

/**
 * Who is using the app?
 *   - a Firebase user (signed in)            -> session.offline = false
 *   - "Continue offline" as your account      -> session.offline = true, uid = that account's uid
 *       (no internet login, but the same documents that are stored on this phone)
 *   - "Continue offline" as a guest           -> session.offline = true, session.guest = true, uid = 'offline'
 *   - nobody                                  -> session = null (login screens)
 * Every document and reminder row is tagged with session.uid.
 * The last account used on this phone is remembered so offline mode can reopen it.
 */

function parseAccount(text) {
  try {
    const a = JSON.parse(text);
    return a && a.uid ? { uid: String(a.uid), name: a.name || '', email: a.email || '' } : null;
  } catch (_) {
    return null;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [offline, setOffline] = useState(false);
  const [profile, setProfile] = useState(null);
  const [lastAccount, setLastAccount] = useState(null); // last account used on this phone
  const [offlineAs, setOfflineAs] = useState(null); // account reopened offline (or null = guest)

  // Start-up: open the database, read the offline flag, listen to Firebase.
  useEffect(() => {
    let unsubscribe = null;
    let cancelled = false;

    (async () => {
      try {
        await getDb();
        const wasOffline = await getBoolSetting('offline_mode', false);
        const last = parseAccount(await getSetting('last_account', ''));
        const as = parseAccount(await getSetting('offline_as', ''));
        if (!cancelled) {
          setOffline(wasOffline);
          setLastAccount(last);
          setOfflineAs(wasOffline ? as : null);
        }
      } catch (e) {
        // The database failing to open is surfaced by the screens that use it.
      }

      if (auth) {
        unsubscribe = onAuthStateChanged(auth, (user) => {
          if (cancelled) return;
          setFirebaseUser(user);
          setReady(true);
        });
      } else if (!cancelled) {
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const uid = firebaseUser ? firebaseUser.uid : offline ? offlineAs?.uid || OFFLINE_UID : null;

  // Load (or create) the local profile row for the active user.
  const rememberAccount = useCallback(async (account) => {
    try {
      await setSetting('last_account', JSON.stringify(account));
      setLastAccount(account);
    } catch (_) {
      // Only used to offer "Continue offline" with the same account.
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!uid) {
      setProfile(null);
      return null;
    }
    let row;
    if (firebaseUser) {
      row = await ensureLocalUser(uid, { name: firebaseUser.displayName || '', email: firebaseUser.email || '' });
      rememberAccount({ uid, name: row?.name || firebaseUser.displayName || '', email: firebaseUser.email || '' });
    } else if (offlineAs) {
      row = await ensureLocalUser(uid, { name: offlineAs.name, email: offlineAs.email });
    } else {
      row = await ensureLocalUser(uid, { name: 'Student', email: '' });
    }
    setProfile(row);
    return row;
  }, [uid, firebaseUser, offlineAs, rememberAccount]);

  useEffect(() => {
    refreshProfile().catch(() => {});
  }, [refreshProfile]);

  const session = useMemo(() => {
    if (!uid) return null;
    return {
      uid,
      offline: !firebaseUser, // not signed in to the cloud right now (no backup / password reset)
      guest: uid === OFFLINE_UID, // no account at all
      name: profile?.name || firebaseUser?.displayName || offlineAs?.name || 'Student',
      email: firebaseUser?.email || offlineAs?.email || profile?.email || '',
      degree: profile?.degree || '',
      studentId: profile?.studentId || '',
    };
  }, [uid, firebaseUser, profile, offlineAs]);

  // ---- actions ---------------------------------------------------------------

  const signUp = useCallback(async ({ name, email, password }) => {
    const user = await authService.signUp({ name, email, password });
    await ensureLocalUser(user.uid, { name: name.trim(), email: email.trim() });
    await setBoolSetting('offline_mode', false);
    await setSetting('offline_as', null);
    setOffline(false);
    setOfflineAs(null);
    setFirebaseUser(user);
    return user;
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const user = await authService.signIn({ email, password });
    await setBoolSetting('offline_mode', false);
    await setSetting('offline_as', null);
    setOffline(false);
    setOfflineAs(null);
    return user;
  }, []);

  /** @param {boolean} [asAccount] true = reopen the last account's documents; false/undefined = guest space. */
  const continueOffline = useCallback(
    async (asAccount = false) => {
      const account = asAccount ? lastAccount : null;
      await setBoolSetting('offline_mode', true);
      await setSetting('offline_as', account ? JSON.stringify(account) : null);
      setOfflineAs(account);
      setOffline(true);
    },
    [lastAccount]
  );

  const signOut = useCallback(async () => {
    await authService.signOut();
    await setBoolSetting('offline_mode', false);
    await setSetting('offline_as', null);
    setOffline(false);
    setOfflineAs(null);
    setFirebaseUser(null);
    setProfile(null);
  }, []);

  const saveProfile = useCallback(
    async ({ name, degree, studentId }) => {
      if (!uid) return;
      const updated = await updateLocalUser(uid, { name, degree, studentId });
      if (firebaseUser) {
        try {
          await authService.updateDisplayName(name);
        } catch (_) {
          // Saved locally; the Firebase display name will catch up next time.
        }
      }
      setProfile(updated);
      if (firebaseUser) rememberAccount({ uid, name: updated?.name || name, email: firebaseUser.email || '' });
    },
    [uid, firebaseUser, rememberAccount]
  );

  const resetPassword = useCallback((email) => authService.sendResetEmail(email), []);

  const value = useMemo(
    () => ({
      ready,
      session,
      lastAccount,
      signUp,
      signIn,
      signOut,
      continueOffline,
      saveProfile,
      resetPassword,
      refreshProfile,
    }),
    [ready, session, lastAccount, signUp, signIn, signOut, continueOffline, saveProfile, resetPassword, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}