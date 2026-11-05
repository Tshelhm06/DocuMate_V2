// App-wide constants (kept in one place so they match the Project I app).

export const APP_VERSION = '1.0';

export const CATEGORIES = ['Academic', 'Certificates', 'Career', 'Personal'];

// Reminders: choose when notifications fire before the due date.
export const LEAD_OPTIONS = [
  { days: 30, label: '30 days' },
  { days: 7, label: '7 days' },
  { days: 3, label: '3 days' },
  { days: 1, label: '1 day' },
  { days: 0, label: 'On the day' },
];
export const DEFAULT_LEAD_DAYS = [7, 1];

// Notifications fire at 9:00 AM local time on the chosen days.
export const NOTIFY_HOUR = 9;
export const NOTIFICATION_CHANNEL_ID = 'expiry-reminders';

// Owner id used for "Continue offline" (no account) sessions.
export const OFFLINE_UID = 'offline';

// Largest file the app will accept.
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

