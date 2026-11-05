import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getLockConfig, disableLock } from '../services/appLock';

/**
 * Decides when the lock screen is shown.
 * The app is locked every time it is opened: on a cold start, and whenever it
 * returns from the background.
 *
 * `runWithoutLock(fn)` wraps things like the file picker or share sheet.
 * On Android those leave the app for a moment, which must NOT re-lock it.
 */

const LockContext = createContext(null);

export function LockProvider({ children }) {
  const [loaded, setLoaded] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [locked, setLocked] = useState(true);

  const suspended = useRef(0);
  const enabledRef = useRef(false);

  const reload = useCallback(async () => {
    const cfg = await getLockConfig();
    enabledRef.current = cfg.enabled;
    setEnabled(cfg.enabled);
    setBiometric(cfg.biometric);
    return cfg;
  }, []);

  // Cold start
  useEffect(() => {
    (async () => {
      const cfg = await reload();
      setLocked(cfg.enabled);
      setLoaded(true);
    })();
  }, [reload]);

  // Back from the background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      // Only "background" counts. "inactive" also happens during the iOS Face ID
      // prompt, the app switcher and system dialogs.
      if (state === 'background' && enabledRef.current && suspended.current === 0) {
        setLocked(true);
      }
    });
    return () => sub.remove();
  }, []);

  const unlock = useCallback(() => setLocked(false), []);

  /** Called after a fresh login: the user has just proven who they are. */
  const markUnlocked = useCallback(() => setLocked(false), []);

  const runWithoutLock = useCallback(async (fn) => {
    suspended.current += 1;
    try {
      return await fn();
    } finally {
      // Small delay: AppState events can arrive just after the picker closes.
      setTimeout(() => {
        suspended.current = Math.max(0, suspended.current - 1);
      }, 800);
    }
  }, []);

  /** Used by "Forgot PIN": removes the lock completely. */
  const removeLock = useCallback(async () => {
    await disableLock();
    await reload();
    setLocked(false);
  }, [reload]);

  const value = useMemo(
    () => ({ loaded, enabled, biometric, locked, unlock, markUnlocked, reload, runWithoutLock, removeLock }),
    [loaded, enabled, biometric, locked, unlock, markUnlocked, reload, runWithoutLock, removeLock]
  );

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>;
}

export function useLock() {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock must be used inside <LockProvider>');
  return ctx;
}