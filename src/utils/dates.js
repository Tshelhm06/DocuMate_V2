const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Whole calendar days from `now` to `dueAt` (negative when overdue). */
export function daysUntil(dueAt, now = Date.now()) {
  const a = new Date(startOfDay(dueAt));
  const b = new Date(startOfDay(now));
  // Use UTC of the local Y/M/D to stay correct across daylight-saving changes.
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcA - utcB) / DAY_MS);
}

/** 27 Sep 2026 */
export function formatDate(ms) {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** September 18, 2026 */
export function formatLongDate(ms) {
  const d = new Date(ms);
  return `${MONTHS_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** 27 September, 2026 (used on the "next reminder" card) */
export function formatDateWithMonthName(ms) {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]}, ${d.getFullYear()}`;
}

/** "Updated 2 days ago" / "Updated Aug 12" */
export function formatUpdated(ms, now = Date.now()) {
  const diff = daysUntil(now, ms); // days since ms
  if (diff <= 0) return 'Updated today';
  if (diff === 1) return 'Updated yesterday';
  if (diff < 7) return `Updated ${diff} days ago`;
  const d = new Date(ms);
  const base = `${MONTHS_SHORT[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
  return d.getFullYear() === new Date(now).getFullYear()
    ? `Updated ${base}`
    : `Updated ${base}, ${d.getFullYear()}`;
}

export function formatDateTime(ms) {
  const d = new Date(ms);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${formatDate(ms)}, ${h12}:${m} ${ampm}`;
}

/** Label for the countdown: "38 days", "Tomorrow", "Today", "Overdue by 3 days" */
export function formatCountdown(dueAt, now = Date.now()) {
  const d = daysUntil(dueAt, now);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d > 1) return `${d} days`;
  const over = Math.abs(d);
  return `Overdue by ${over} day${over === 1 ? '' : 's'}`;
}

export function greetingForHour(hour) {
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}
