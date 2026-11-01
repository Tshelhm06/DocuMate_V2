import * as Crypto from 'expo-crypto';

/** Random id used to match a record on this phone with its cloud backup. */
export function newId() {
  return Crypto.randomUUID();
}
