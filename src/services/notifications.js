import { Platform } from 'react-native';
import { NOTIFICATION_CHANNEL_ID } from '../utils/constants';
import { buildTriggerTimes, parseLeadDays, leadLabel } from '../utils/reminderSchedule';
import { formatDate } from '../utils/dates';

// Loaded safely: some Expo Go builds do not include every native part of expo-notifications
// (e.g. "Cannot find native module ExpoTopicSubscriptionModule"). Without this try/catch the
// whole app would crash at startup. If it is missing, reminders are still saved - only the
// phone notifications are skipped.
let Notifications = null;
try {
  // eslint-disable-next-line global-require
  Notifications = require('expo-notifications');
} catch (e) {
  Notifications = null;
}

/**
 * Local scheduled notifications only (no remote push).
 * Show them even while the app is open.
 */
if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    // ignore
  }
}

const DATE_TRIGGER = Notifications?.SchedulableTriggerInputTypes?.DATE ?? 'date';

export async function ensureChannel() {
  if (!Notifications || Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'Document expiry reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#315C57',
    });
  } catch (e) {
    // Some Expo Go builds cannot create channels. Reminders are still saved.
  }
}

export async function getPermissionStatus() {
  if (!Notifications) return 'denied';
  try {
    const current = await Notifications.getPermissionsAsync();
    return current.granted ? 'granted' : current.canAskAgain ? 'undetermined' : 'denied';
  } catch (e) {
    return 'denied';
  }
}

/** Asks for permission the first time it is needed. Returns true if allowed. */
export async function requestPermission() {
  if (!Notifications) return false;
  try {
    await ensureChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
    return Boolean(asked.granted);
  } catch (e) {
    return false;
  }
}

function contentFor(reminder, lead) {
  const due = formatDate(reminder.dueAt);
  const when =
    lead === 0
      ? 'is due today'
      : `is due in ${lead} day${lead === 1 ? '' : 's'}`;
  return {
    title: `${reminder.title} ${when}`,
    body: `Due date: ${due}. Open DocuMate to check the document.`,
    data: { reminderId: reminder.id, leadDays: lead },
    sound: false,
  };
}

/**
 * Schedule one notification per lead time that is still in the future.
 * @returns {{ids: string[], scheduled: number, granted: boolean}}
 */
export async function scheduleForReminder(reminder, now = Date.now()) {
  const leadDays = parseLeadDays(reminder.leadDays);
  const times = buildTriggerTimes(reminder.dueAt, leadDays, now);
  if (times.length === 0) return { ids: [], scheduled: 0, granted: true };

  const granted = await requestPermission();
  if (!granted) return { ids: [], scheduled: 0, granted: false };

  const ids = [];
  for (const t of times) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: contentFor(reminder, t.leadDays),
        trigger: {
          type: DATE_TRIGGER,
          date: new Date(t.at),
          channelId: NOTIFICATION_CHANNEL_ID,
        },
      });
      ids.push(id);
    } catch (e) {
      // Keep going: one failure should not stop the other notifications.
    }
  }
  return { ids, scheduled: ids.length, granted: true };
}

export async function cancelNotifications(ids = []) {
  if (!Notifications) return;
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (_) {
      // Already fired or removed.
    }
  }
}

export async function cancelAllNotifications() {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function describeSchedule(dueAt, leadDaysText, now = Date.now()) {
  const times = buildTriggerTimes(dueAt, parseLeadDays(leadDaysText), now);
  if (times.length === 0) return 'No future notification times left for this date.';
  return times.map((t) => `${leadLabel(t.leadDays)} (${formatDate(t.at)})`).join(', ');
}

export { Notifications };