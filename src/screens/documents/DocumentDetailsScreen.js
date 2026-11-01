import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import Button from '../../components/Button';
import useLoad from '../../components/useLoad';
import { colors, radius } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { getDocument } from '../../db/documentsRepo';
import { getReminderByDocument } from '../../db/remindersRepo';
import { removeDocument } from '../../services/documents';
import { fileExists, uriFor } from '../../services/fileStorage';
import { formatLongDate, formatDate, formatCountdown } from '../../utils/dates';
import { formatBytes } from '../../utils/format';

export default function DocumentDetailsScreen({ navigation, route }) {
  const { id } = route.params;
  const { session } = useAuth();

  const [doc, setDoc] = useState(null);
  const [reminder, setReminder] = useState(null);
  const [fileOk, setFileOk] = useState(true);
  const [missing, setMissing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { loading } = useLoad(async () => {
    const d = await getDocument(id, session.uid);
    if (!d) {
      setMissing(true);
      return;
    }
    setDoc(d);
    setReminder(await getReminderByDocument(id, session.uid));
    setFileOk(await fileExists(d.storedName));
  }, [id, session.uid]);

  const openFile = async () => {
    if (!fileOk) {
      Alert.alert(
        'File not found',
        'This document’s file is missing from the phone. If you have a cloud backup, use Profile > Storage > Restore.'
      );
      return;
    }
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Not available', 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(uriFor(doc.storedName), {
        mimeType: doc.mimeType || undefined,
        UTI: doc.fileType === 'pdf' ? 'com.adobe.pdf' : 'public.image',
        dialogTitle: doc.title,
      });
    } catch (e) {
      Alert.alert('Could not open file', 'Something went wrong while opening this file.');
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete document?', `“${doc.title}” and its reminder will be removed from this phone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await removeDocument(doc);
            navigation.goBack();
          } catch (e) {
            setDeleting(false);
            Alert.alert('Could not delete', 'Please try again.');
          }
        },
      },
    ]);
  };

  if (missing) {
    return (
      <Screen>
        <Header title="Document details" onBack={() => navigation.goBack()} />
        <Text style={styles.notFound}>This document no longer exists.</Text>
      </Screen>
    );
  }

  if (loading || !doc) {
    return (
      <Screen>
        <Header title="Document details" onBack={() => navigation.goBack()} />
      </Screen>
    );
  }

  const storage = doc.backedUpAt && doc.backedUpAt >= doc.updatedAt ? 'Offline + cloud backup' : 'Offline';

  return (
    <Screen>
      <Header title="Document details" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.previewCard}>
          {doc.fileType === 'image' && fileOk ? (
            <Image source={{ uri: uriFor(doc.storedName) }} style={styles.previewImage} resizeMode="contain" />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Ionicons name={doc.fileType === 'pdf' ? 'document-text-outline' : 'document-outline'} size={44} color={colors.primary} />
              <Text style={styles.previewLabel}>{doc.fileType === 'pdf' ? 'PDF DOCUMENT' : 'DOCUMENT'}</Text>
              <Text style={styles.previewHint}>{fileOk ? 'Tap Share / View to open it' : 'File missing from this phone'}</Text>
            </View>
          )}
        </View>

        <Text style={styles.title}>{doc.title}</Text>
        <Text style={styles.category}>{doc.category.toUpperCase()}</Text>
        {doc.description ? <Text style={styles.description}>{doc.description}</Text> : null}

        <View style={styles.rows}>
          <Row label="File name" value={doc.fileName || '—'} />
          <Row label="Added" value={formatLongDate(doc.addedAt)} />
          <Row label="Size" value={formatBytes(doc.fileSize)} />
          <Row label="Storage" value={storage} />
          {reminder ? (
            <Row
              label="Reminder"
              value={`${formatDate(reminder.dueAt)} (${formatCountdown(reminder.dueAt)})`}
            />
          ) : null}
        </View>

        <View style={styles.actions}>
          <Button
            title="Edit document"
            variant="light"
            style={{ flex: 1, marginRight: 12 }}
            onPress={() => navigation.navigate('AddEditDocument', { id: doc.id })}
          />
          <Button title="Share / View" style={{ flex: 1 }} onPress={openFile} />
        </View>

        <Button title="Delete document" variant="danger" loading={deleting} onPress={confirmDelete} style={{ marginTop: 6 }} />
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  notFound: { padding: 24, fontSize: 16, color: colors.textSecondary },
  previewCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 18, marginBottom: 24 },
  previewImage: { width: '100%', height: 230, borderRadius: radius.md },
  previewPlaceholder: {
    height: 230,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  previewLabel: { color: colors.primary, fontWeight: '700', fontSize: 15, marginTop: 10 },
  previewHint: { color: colors.textSecondary, fontSize: 13, marginTop: 6, textAlign: 'center' },
  title: { fontSize: 30, fontWeight: '700', color: colors.textPrimary },
  category: { fontSize: 13, fontWeight: '700', color: colors.primary, marginTop: 8, letterSpacing: 0.5 },
  description: { fontSize: 15, color: colors.textSecondary, marginTop: 12, lineHeight: 21 },
  rows: { marginTop: 20, marginBottom: 26 },
  row: { flexDirection: 'row', paddingVertical: 11 },
  rowLabel: { width: 100, fontSize: 15, color: colors.textSecondary },
  rowValue: { flex: 1, fontSize: 16, color: colors.textPrimary, lineHeight: 22 },
  actions: { flexDirection: 'row', marginBottom: 14 },
});
