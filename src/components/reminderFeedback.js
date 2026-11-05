import { Alert, Linking } from 'react-native';

/**
 * Tell the user what happened to their notifications after saving a reminder.
 * Calls `done()` when the alert is dismissed (or straight away if all is well).
 */
export function explainReminderResult(result, done) {
  if (!result) {
    done();
    return;
  }

  if (!result.granted) {
    Alert.alert(
      'Reminder saved, notifications are off',
      'DocuMate needs permission to send expiry alerts. You can turn notifications on in Settings.',
      [
        { text: 'Not now', style: 'cancel', onPress: done },
        {
          text: 'Open Settings',
          onPress: () => {
            Linking.openSettings();
            done();
          },
        },
      ]
    );
    return;
  }

  if (result.scheduled === 0) {
    Alert.alert(
      'Reminder saved',
      'All of the chosen notification times have already passed, so no alert will be sent. Pick a later date or a shorter lead time to get one.',
      [{ text: 'OK', onPress: done }]
    );
    return;
  }

  done();
}