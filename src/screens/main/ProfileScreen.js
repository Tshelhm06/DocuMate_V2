import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import SettingRow from '../../components/SettingRow';
import useLoad from '../../components/useLoad';
import { colors, radius } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useLock } from '../../context/LockContext';
import { documentCounts } from '../../db/documentsRepo';
import { countUpcomingReminders } from '../../db/remindersRepo';
import { APP_VERSION } from '../../utils/constants';
import { pluralize } from '../../utils/format';

export default function ProfileScreen({ navigation }) {
  const { session, signOut } = useAuth();
  const { enabled: lockEnabled } = useLock();
  const [docCount, setDocCount] = useState(0);
  const [reminderCount, setReminderCount] = useState(0);

  useLoad(async () => {
    const [counts, upcoming] = await Promise.all([
      documentCounts(session.uid),
      countUpcomingReminders(session.uid),
    ]);
    setDocCount(counts.total);
    setReminderCount(upcoming);
  }, [session.uid]);

  const confirmLogout = () => {
    Alert.alert(
      'Log out?',
      session.offline
        ? 'You will return to the login screen. Documents saved in offline mode stay on this phone.'
        : 'Your documents stay on this phone. You can log in again any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () => signOut().catch(() => Alert.alert('Could not log out', 'Please try again.')),
        },
      ]
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.card}>
          <Avatar name={session.name} size={78} />
          <View style={styles.cardText}>
            <Text style={styles.name} numberOfLines={1}>
              {session.name}
            </Text>
            {session.offline ? (
              <Text style={styles.line}>Offline mode · no account</Text>
            ) : (
              <>
                {session.degree ? <Text style={styles.line}>{session.degree}</Text> : null}
                {session.studentId ? <Text style={styles.line}>{`Student ID · ${session.studentId}`}</Text> : null}
                {!session.degree && !session.studentId ? <Text style={styles.line}>{session.email}</Text> : null}
              </>
            )}
          </View>
        </View>

        <SettingRow card title="Storage" subtitle={pluralize(docCount, 'document')} onPress={() => navigation.navigate('Documents')} />
        <SettingRow
          card
          title="Offline mode"
          subtitle="Enabled"
          onPress={() =>
            Alert.alert('Offline mode', 'Your documents are always saved on this phone, so you can view, add, edit and search them without internet.')
          }
        />
        <SettingRow card title="Reminders" subtitle={`${reminderCount} active`} onPress={() => navigation.navigate('Reminders')} />

        <Text style={styles.section}>Account</Text>
        <SettingRow title="Edit profile" subtitle="Update your details" onPress={() => navigation.navigate('EditProfile')} />
        <SettingRow
          title="Security"
          subtitle={lockEnabled ? 'App lock is on' : 'App lock, PIN and password'}
          onPress={() => navigation.navigate('Security')}
        />
        <SettingRow title="About DocuMate" subtitle={`Version ${APP_VERSION}`} onPress={() => navigation.navigate('About')} last />

        <Button title="Log out" variant="danger" onPress={confirmLogout} style={{ marginTop: 24 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40 },
  title: { fontSize: 34, fontWeight: '700', color: colors.textPrimary, marginBottom: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: 22,
    marginBottom: 22,
  },
  cardText: { flex: 1, marginLeft: 18 },
  name: { fontSize: 26, fontWeight: '700', color: colors.white },
  line: { fontSize: 15, color: 'rgba(255,255,255,0.88)', marginTop: 4 },
  section: { fontSize: 26, fontWeight: '700', color: colors.textPrimary, marginTop: 20, marginBottom: 4 },
});
