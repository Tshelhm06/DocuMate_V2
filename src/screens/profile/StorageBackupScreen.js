import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import Button from '../../components/Button';
import useLoad from '../../components/useLoad';
import { colors, radius } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { documentCounts, totalFileSize } from '../../db/documentsRepo';
import { backupNow, restoreFromCloud, getLastBackupAt, friendlyBackupError } from '../../services/backup';
import { isFirebaseConfigured } from '../../config/firebase';
import { formatDateTime } from '../../utils/dates';
import { formatBytes, pluralize } from '../../utils/format';

export default function StorageBackupScreen({ navigation }) {
  const { session } = useAuth();
  const [count, setCount] = useState(0);
  const [size, setSize] = useState(0);
  const [lastBackup, setLastBackup] = useState(null);
  const [busy, setBusy] = useState(null); // null | 'backup' | 'restore'
  const [progress, setProgress] = useState('');

  const { reload } = useLoad(async () => {
    const [counts, bytes, last] = await Promise.all([
      documentCounts(session.uid),
      totalFileSize(session.uid),
      getLastBackupAt(session.uid),
    ]);
    setCount(counts.total);
    setSize(bytes);
    setLastBackup(last);
  }, [session.uid]);

  const runBackup = async () => {
    setBusy('backup');
    setProgress('Starting');
    try {
      const s = await backupNow(session, setProgress);
      await reload();
      if (s.failed > 0) {
        Alert.alert(
          'Backup finished with problems',
          `${s.uploaded} uploaded, ${s.failed} failed.\n\n${s.firstError || ''}\n\nTap “Back up now” again to retry the failed items.`
        );
      } else {
        const parts = [`${s.uploaded} item${s.uploaded === 1 ? '' : 's'} uploaded`];
        if (s.upToDate > 0) parts.push(`${s.upToDate} already up to date`);
        if (s.removed > 0) parts.push(`${s.removed} removed from the backup`);
        if (s.tooLarge > 0) {
          parts.push(`${s.tooLarge} file${s.tooLarge === 1 ? ' was' : 's were'} over 5 MB, so only the details were backed up`);
        }
        Alert.alert('Backup complete', `${parts.join(', ')}.`);
      }
    } catch (e) {
      Alert.alert('Backup failed', friendlyBackupError(e));
    } finally {
      setBusy(null);
      setProgress('');
    }
  };

  const confirmRestore = () => {
    Alert.alert(
      'Restore from cloud?',
      'Documents and reminders in your backup that are not on this phone will be downloaded. Nothing on this phone is overwritten or deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', onPress: runRestore },
      ]
    );
  };

  const runRestore = async () => {
    setBusy('restore');
    setProgress('Starting');
    try {
      const s = await restoreFromCloud(session, setProgress);
      await reload();
      if (s.failed > 0) {
        Alert.alert(
          'Restore finished with problems',
          `${s.restored} documents restored, ${s.failed} failed.\n\n${s.firstError || ''}\n\nTap “Restore” again to retry.`
        );
      } else if (s.restored === 0 && s.reminders === 0) {
        Alert.alert(
          s.alreadyHere > 0 ? 'Already up to date' : 'No backup found',
          s.alreadyHere > 0
            ? 'Everything in your backup is already on this phone.'
            : 'There is nothing in the cloud for this account yet. Use “Back up now” on your other phone first.'
        );
      } else {
        Alert.alert(
          'Restore complete',
          `${pluralize(s.restored, 'document')} and ${pluralize(s.reminders, 'reminder')} restored.`
        );
      }
    } catch (e) {
      Alert.alert('Restore failed', friendlyBackupError(e));
    } finally {
      setBusy(null);
      setProgress('');
    }
  };

  const cloudReady = !session.offline && isFirebaseConfigured;

  return (
    <Screen>
      <Header title="Storage" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>On this phone</Text>
          <Text style={styles.big}>{pluralize(count, 'document')}</Text>
          <Text style={styles.meta}>{`${formatBytes(size)} · works without internet`}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Cloud backup</Text>
          {session.offline ? (
            <Text style={styles.body}>
              You are using DocuMate offline without an account. Log out, then sign up or log in to back up your documents to the cloud.
            </Text>
          ) : !isFirebaseConfigured ? (
            <Text style={styles.body}>Firebase is not set up yet. Fill in the .env file (see README), then restart the app.</Text>
          ) : (
            <>
              <Text style={styles.big}>{lastBackup ? 'Backed up' : 'Not backed up yet'}</Text>
              <Text style={styles.meta}>
                {lastBackup ? `Last backup ${formatDateTime(lastBackup)}` : 'Tap “Back up now” to save a copy to the cloud.'}
              </Text>
              <Text style={styles.account}>{session.email}</Text>
            </>
          )}
        </View>

        <Button
          title={busy === 'backup' ? progress || 'Backing up' : 'Back up now'}
          onPress={runBackup}
          loading={busy === 'backup'}
          disabled={!cloudReady || busy === 'restore'}
          style={{ marginTop: 6 }}
        />
        <Button
          title={busy === 'restore' ? progress || 'Restoring' : 'Restore from cloud'}
          variant="secondary"
          onPress={confirmRestore}
          loading={busy === 'restore'}
          disabled={!cloudReady || busy === 'backup'}
          style={{ marginTop: 12 }}
        />
        {busy ? <Text style={styles.progress}>{progress}</Text> : null}

        <Text style={styles.note}>
          Your phone always keeps the main copy, so DocuMate works offline. Backup is manual: tap “Back up now” when you are online.
          Files up to 5 MB are backed up; bigger files stay on this phone. On a new phone, log in and tap “Restore from cloud”.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20, marginBottom: 14 },
  cardLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
  big: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: 14.5, color: colors.textSecondary, marginTop: 4 },
  account: { fontSize: 13.5, color: colors.primary, marginTop: 10 },
  body: { fontSize: 15, color: colors.textPrimary, lineHeight: 22 },
  progress: { textAlign: 'center', color: colors.textSecondary, marginTop: 14, fontSize: 14 },
  note: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 20, marginTop: 22, marginHorizontal: 4 },
});