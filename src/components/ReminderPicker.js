import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { LEAD_OPTIONS } from '../utils/constants';
import { describeSchedule } from '../services/notifications';
import Chip from './Chip';
import DateField from './DateField';

/**
 * Due date + "notify me N days before" chips.
 * Used by Add/Edit document and by Add reminder.
 */
export default function ReminderPicker({ dueAt, leadDays, onChangeDue, onChangeLead, dueError }) {
  const toggle = (days) => {
    const next = leadDays.includes(days) ? leadDays.filter((d) => d !== days) : [...leadDays, days];
    onChangeLead(next);
  };

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

      <Text style={styles.label}>Notify me</Text>
      <View style={styles.chips}>
        {LEAD_OPTIONS.map((o) => (
          <Chip key={o.days} label={o.label} selected={leadDays.includes(o.days)} onPress={() => toggle(o.days)} />
        ))}
      </View>

      {dueAt ? (
        <View style={styles.hint}>
          <Text style={styles.hintText}>
            {leadDays.length === 0
              ? 'No notification will be sent. Pick at least one time.'
              : `Notifications at 9:00 AM: ${describeSchedule(dueAt, leadDays.join(','))}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginBottom: 9, marginLeft: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  hint: { backgroundColor: colors.tint, borderRadius: radius.sm, padding: 12, marginTop: 4, marginBottom: 6 },
  hintText: { fontSize: 13, color: colors.primaryDark, lineHeight: 18 },
});