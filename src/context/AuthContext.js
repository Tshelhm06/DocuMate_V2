import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import * as authService from '../services/auth';
import { ensureLocalUser, getLocalUser, updateLocalUser, deleteLocalUser } from '../db/usersRepo';
import { getBoolSetting, setBoolSetting } from '../db/settingsRepo';
import { getDb } from '../db/database';
import { OFFLINE_UID } from '../utils/constants';

/**
 * Who is using the app?
 *   - a Firebase user (signed in)            -> session.offline = false
 *   - "Continue offline" (no account)         -> session.offline = true, uid = 'offline'
 *   - nobody                                  -> session = null (login screens)
 * Every document and reminder row is tagged with session.uid.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [offline, setOffline] = useState(false);
  const [profile, setProfile] = useState(null);

  // Start-up: open the database, read the offline flag, listen to Firebase.
  useEffect(() => {
    let unsubscribe = null;
    let cancelled = false;

    (async () => {
      try {
        await getDb();
        const wasOffline = await getBoolSetting('offline_mode', false);
        if (!cancelled) setOffline(wasOffline);
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

  const uid = firebaseUser ? firebaseUser.uid : offline ? OFFLINE_UID : null;

  // Load (or create) the local profile row for the active user.
  const refreshProfile = useCallback(async () => {
    if (!uid) {
      setProfile(null);
      return null;
    }
    const row = firebaseUser
      ? await ensureLocalUser(uid, { name: firebaseUser.displayName || '', email: firebaseUser.email || '' })
      : await ensureLocalUser(uid, { name: 'Student', email: '' });
    setProfile(row);
    return row;
  }, [uid, firebaseUser]);

  useEffect(() => {
    refreshProfile().catch(() => {});
  }, [refreshProfile]);

  const session = useMemo(() => {
    if (!uid) return null;
    return {
      uid,
      offline: !firebaseUser,
      name: profile?.name || firebaseUser?.displayName || 'Student',
      email: firebaseUser?.email || profile?.email || '',
      degree: profile?.degree || '',
      studentId: profile?.studentId || '',
    };
  }, [uid, firebaseUser, profile]);

  // ---- actions ---------------------------------------------------------------

  const signUp = useCallback(async ({ name, email, password }) => {
    const user = await authService.signUp({ name, email, password });
    await ensureLocalUser(user.uid, { name: name.trim(), email: email.trim() });
    await setBoolSetting('offline_mode', false);
    setOffline(false);
    setFirebaseUser(user);
    return user;
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const user = await authService.signIn({ email, password });
    await setBoolSetting('offline_mode', false);
    setOffline(false);
    return user;
  }, []);

  const continueOffline = useCallback(async () => {
    await setBoolSetting('offline_mode', true);
    setOffline(true);
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    await setBoolSetting('offline_mode', false);
    setOffline(false);
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
    },
    [uid, firebaseUser]
  );


  const value = useMemo(
    () => ({
      ready,
      session,
      signUp,
      signIn,
      signOut,
      continueOffline,
      saveProfile,
      refreshProfile,
    }),
    [ready, session, signUp, signIn, signOut, continueOffline, saveProfile, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
