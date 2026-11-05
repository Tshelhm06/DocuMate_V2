import React, { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import useLoad from '../../components/useLoad';
import { colors, radius } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { listReminders } from '../../db/remindersRepo';
import { removeReminder } from '../../services/reminders';
import { getPermissionStatus } from '../../services/notifications';
import { daysUntil, formatCountdown, formatDate, formatDateWithMonthName, startOfDay } from '../../utils/dates';

export default function RemindersScreen({ navigation }) {
  const { session } = useAuth();
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [permission, setPermission] = useState('granted');

  const { reload } = useLoad(async () => {
    const all = await listReminders(session.uid);
    const today = startOfDay(Date.now());
    setUpcoming(all.filter((r) => r.dueAt >= today));
    setPast(all.filter((r) => r.dueAt < today).reverse());
    setPermission(await getPermissionStatus());
  }, [session.uid]);

  const next = upcoming[0];

  const open = (r) => {
    if (r.documentId) navigation.navigate('DocumentDetails', { id: r.documentId });
    else navigation.navigate('AddReminder', { id: r.id });
  };

  const confirmDelete = (r) => {
    Alert.alert('Delete reminder?', `“${r.title}” and its notifications will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeReminder(r);
            await reload();
          } catch (e) {
            Alert.alert('Could not delete', 'Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Reminders</Text>
        <Text style={styles.subtitle}>Important dates, kept in one place.</Text>
        
        {permission === 'denied' ? (
          <Pressable style={styles.banner} onPress={() => Linking.openSettings()} accessibilityRole="button">
            <Ionicons name="notifications-off-outline" size={20} color={colors.accent} />
            <Text style={styles.bannerText}>Notifications are turned off, so you will not get expiry alerts. Tap to open Settings.</Text>
          </Pressable>
        ) : null}

        {next ? (
          <View style={styles.next}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextLabel}>NEXT REMINDER</Text>
              <Text style={styles.nextTitle} numberOfLines={2}>
                {next.title}
              </Text>
              <Text style={styles.nextDate}>{formatDateWithMonthName(next.dueAt)}</Text>
            </View>
            <View style={styles.nextDays}>
              <Text style={styles.nextDaysText}>{daysUntil(next.dueAt) > 1 ? daysUntil(next.dueAt) : formatCountdown(next.dueAt)}</Text>
              {daysUntil(next.dueAt) > 1 ? <Text style={styles.nextDaysUnit}>days</Text> : null}
            </View>
          </View>
        ) : null}

        <Text style={styles.section}>Upcoming</Text>
        {upcoming.length === 0 ? (
          <EmptyState icon="alarm-outline" title="No upcoming reminders" message="Add a reminder for dates like your CID expiry, or attach one when saving a document." />
        ) : (
          upcoming.map((r) => <ReminderRow key={r.id} r={r} onPress={() => open(r)} onDelete={() => confirmDelete(r)} />)
        )}

        <Button
          title="+  Add reminder"
          variant="light"
          onPress={() => navigation.navigate('AddReminder')}
          style={{ marginTop: 6 }}
        />

        {past.length > 0 ? (
          <>
            <Text style={[styles.section, { marginTop: 30 }]}>Past</Text>
            {past.map((r) => (
              <ReminderRow key={r.id} r={r} dim onPress={() => open(r)} onDelete={() => confirmDelete(r)} />
            ))}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function ReminderRow({ r, onPress, onDelete, dim }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, dim && { opacity: 0.6 }, pressed && { opacity: 0.85 }]} accessibilityRole="button">
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {r.title}
        </Text>
        <Text style={styles.rowDate}>{`${formatDate(r.dueAt)}${dim ? '' : ` · ${formatCountdown(r.dueAt)}`}`}</Text>
      </View>
      <Text style={styles.rowCategory}>{r.category}</Text>
      <Pressable onPress={onDelete} hitSlop={12} style={styles.trash} accessibilityRole="button" accessibilityLabel={`Delete reminder ${r.title}`}>
        <Ionicons name="trash-outline" size={19} color={colors.textSecondary} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40 },
  title: { fontSize: 34, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 4, marginBottom: 20 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: 14,
    marginBottom: 18,
  },
  bannerText: { flex: 1, marginLeft: 10, fontSize: 13.5, color: colors.textPrimary, lineHeight: 19 },
  next: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: 22,
    marginBottom: 26,
  },
  nextLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', letterSpacing: 0.4 },
  nextTitle: { color: colors.white, fontSize: 26, fontWeight: '700', marginTop: 6 },
  nextDate: { color: colors.white, fontSize: 15, marginTop: 6 },
  nextDays: { alignItems: 'center', marginLeft: 10 },
  nextDaysText: { color: colors.white, fontSize: 24, fontWeight: '700' },
  nextDaysUnit: { color: colors.white, fontSize: 18, fontWeight: '700' },
  section: { fontSize: 26, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  rowTitle: { fontSize: 18, fontWeight: '500', color: colors.textPrimary },
  rowDate: { fontSize: 14.5, color: colors.primary, marginTop: 6 },
  rowCategory: { fontSize: 14, color: colors.textSecondary, marginRight: 8 },
  trash: { padding: 6 },
});
