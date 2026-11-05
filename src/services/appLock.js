import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';
import { isValidPin } from '../utils/validation';
import { lockoutSeconds, remainingLockSeconds } from '../utils/lockout';

/**
 * App lock: fingerprint / Face ID with a PIN fallback.
 *
 * Everything security-related lives in expo-secure-store (Keychain on iOS,
 * Keystore-backed storage on Android) - not in the SQLite database - so it
 * cannot be switched off by editing a database file.
 * The PIN itself is never stored, only a salted SHA-256 hash of it.
 */

const KEYS = {
  enabled: 'documate.lock.enabled',
  biometric: 'documate.lock.biometric',
  salt: 'documate.pin.salt',
  hash: 'documate.pin.hash',
  fails: 'documate.pin.fails',
  until: 'documate.pin.until',
};

const OPTIONS = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

const get = (key) => SecureStore.getItemAsync(key, OPTIONS);
const set = (key, value) => SecureStore.setItemAsync(key, String(value), OPTIONS);
const del = (key) => SecureStore.deleteItemAsync(key, OPTIONS);

async function hashPin(pin, salt) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

// settings

export async function getLockConfig() {
  try {
    const [enabled, biometric, hash] = await Promise.all([get(KEYS.enabled), get(KEYS.biometric), get(KEYS.hash)]);
    // "Enabled" only counts if a PIN really exists (the PIN is the fallback for every device).
    return { enabled: enabled === '1' && Boolean(hash), biometric: biometric === '1' };
  } catch (_) {
    return { enabled: false, biometric: false };
  }
}

export async function biometricStatus() {
  try {
    const [hasHardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    let label = 'Biometrics';
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const T = LocalAuthentication.AuthenticationType;
      if (types.includes(T.FACIAL_RECOGNITION) && !types.includes(T.FINGERPRINT)) label = 'Face ID';
      else if (types.includes(T.FINGERPRINT) && !types.includes(T.FACIAL_RECOGNITION)) label = 'Fingerprint';
    } catch (_) {
      // label stays generic
    }
    return { available: hasHardware && enrolled, hasHardware, enrolled, label };
  } catch (_) {
    return { available: false, hasHardware: false, enrolled: false, label: 'Biometrics' };
  }
}

/** Turn the lock on (or change the PIN while keeping it on). */
export async function savePin(pin) {
  if (!isValidPin(pin)) throw new Error('Invalid PIN');
  const salt = Crypto.randomUUID();
  await set(KEYS.salt, salt);
  await set(KEYS.hash, await hashPin(pin, salt));
  await set(KEYS.enabled, '1');
  await resetFailures();
}

export async function setBiometricEnabled(enabled) {
  await set(KEYS.biometric, enabled ? '1' : '0');
}

/** Turn the lock off and forget the PIN. */
export async function disableLock() {
  await Promise.all(Object.values(KEYS).map((k) => del(k).catch(() => {})));
}

// biometrics

/** Returns { success, cancelled }. Never throws. */
export async function authenticateWithBiometrics(promptMessage = 'Unlock DocuMate') {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Use PIN',
      disableDeviceFallback: true, // our own PIN is the fallback
    });
    return { success: result.success, cancelled: !result.success };
  } catch (_) {
    return { success: false, cancelled: true };
  }
}

// PIN

async function resetFailures() {
  await del(KEYS.fails).catch(() => {});
  await del(KEYS.until).catch(() => {});
}

export async function getLockoutRemaining() {
  const until = Number(await get(KEYS.until).catch(() => 0)) || 0;
  return remainingLockSeconds(until);
}

/**
 * Check a PIN. Wrong attempts are counted; after 5 in a row the pad locks for a while.
 * @returns {{ok:boolean, lockedSeconds:number, attemptsLeft:number|null}}
 */
export async function verifyPin(pin) {
  const waiting = await getLockoutRemaining();
  if (waiting > 0) return { ok: false, lockedSeconds: waiting, attemptsLeft: 0 };

  const [salt, hash] = await Promise.all([get(KEYS.salt), get(KEYS.hash)]);
  if (!salt || !hash) return { ok: false, lockedSeconds: 0, attemptsLeft: null };

  const candidate = await hashPin(pin, salt);
  if (candidate === hash) {
    await resetFailures();
    return { ok: true, lockedSeconds: 0, attemptsLeft: null };
  }

  const fails = (Number(await get(KEYS.fails).catch(() => 0)) || 0) + 1;
  await set(KEYS.fails, fails);

  const lockSeconds = lockoutSeconds(fails);
  if (lockSeconds > 0) {
    await set(KEYS.until, Date.now() + lockSeconds * 1000);
    return { ok: false, lockedSeconds: lockSeconds, attemptsLeft: 0 };
  }
  return { ok: false, lockedSeconds: 0, attemptsLeft: 5 - fails };
}