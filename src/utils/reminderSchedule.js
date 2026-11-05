import { NOTIFY_HOUR } from './constants';

/**
 * Work out when each "N days before" notification should fire.
 * Returns only times that are still in the future.
 */
export function buildTriggerTimes(dueAt, leadDays, now = Date.now(), hour = NOTIFY_HOUR) {
  const seen = new Set();
  const result = [];

  for (const lead of leadDays) {
    if (!Number.isInteger(lead) || lead < 0 || seen.has(lead)) continue;
    seen.add(lead);

    const d = new Date(dueAt);
    d.setHours(hour, 0, 0, 0);
    d.setDate(d.getDate() - lead); // setDate handles month/year roll-over and DST
    const at = d.getTime();

    if (at > now) result.push({ leadDays: lead, at });
  }

  return result.sort((a, b) => a.at - b.at);
}

export function parseLeadDays(text) {
  if (!text) return [];
  return String(text)
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 0);
}

export function serializeLeadDays(days) {
  return [...new Set(days)].sort((a, b) => b - a).join(',');
}

export function leadLabel(days) {
  if (days === 0) return 'on the day';
  return `${days} day${days === 1 ? '' : 's'} before`;
}