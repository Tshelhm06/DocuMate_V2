/**
 * PIN lockout rules (pure functions, no native modules, so they are easy to test).
 *
 * The first 4 wrong PINs in a row just show "attempts left". From the 5th wrong
 * PIN on, the pad locks for longer and longer. The failure counter is only reset
 * by a correct PIN, so waiting out a lock and failing again gives a longer lock.
 */

export const FREE_ATTEMPTS = 5;

/**
 * How many seconds the PIN pad stays locked after `fails` wrong PINs in a row.
 * @param {number} fails
 * @returns {number} 0 means "not locked".
 */
export function lockoutSeconds(fails) {
  const n = Number(fails) || 0;
  if (n < FREE_ATTEMPTS) return 0;
  if (n === FREE_ATTEMPTS) return 30;
  if (n === FREE_ATTEMPTS + 1) return 60;
  if (n === FREE_ATTEMPTS + 2) return 300;
  return 900;
}

/**
 * Whole seconds left until `until` (a Date.now() style timestamp in ms).
 * @param {number} until
 * @param {number} [now]
 * @returns {number} 0 when the lock is over or was never set.
 */
export function remainingLockSeconds(until, now = Date.now()) {
  const end = Number(until) || 0;
  if (end <= now) return 0;
  return Math.ceil((end - now) / 1000);
}
