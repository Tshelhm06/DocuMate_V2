import React from 'react';
import { View } from 'react-native';
import DateField from './DateField';

/**
 * Due / expiry date picker.
 * Used by Add/Edit document and by Add reminder.
 */
export default function ReminderPicker({ dueAt, onChangeDue, dueError }) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return (
    <View>
      <DateField
        label="Due / expiry date"
        value={dueAt}
        onChange={onChangeDue}
        minimumDate={startOfToday.getTime()}
        error={dueError}
      />
    </View>
  );
}
