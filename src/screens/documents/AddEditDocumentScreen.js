import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import Chip from '../../components/Chip';
import ReminderPicker from '../../components/ReminderPicker';
import { colors, radius } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { getDocument } from '../../db/documentsRepo';
import { getReminderByDocument } from '../../db/remindersRepo';
import { addDocument, editDocument } from '../../services/documents';
import { CATEGORIES, MAX_FILE_BYTES } from '../../utils/constants';
import { startOfDay } from '../../utils/dates';
import { detectFileType, fileTypeLabel } from '../../utils/files';
import { formatBytes } from '../../utils/format';
import { validateTitle } from '../../utils/validation';

export default function AddEditDocumentScreen({ navigation, route }) {
  const editingId = route.params?.id ?? null;
  const isEdit = editingId !== null;

  const { session } = useAuth();

  const [original, setOriginal] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [pickedFile, setPickedFile] = useState(null); // newly chosen file
  const [remind, setRemind] = useState(false);
  const [dueAt, setDueAt] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  // Edit mode: fill the form with the saved values.
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const d = await getDocument(editingId, session.uid);
      if (!d) {
        navigation.goBack();
        return;
      }
      setOriginal(d);
      setTitle(d.title);
      setCategory(d.category);
      setDescription(d.description);
      const r = await getReminderByDocument(editingId, session.uid);
      if (r) {
        setRemind(true);
        setDueAt(r.dueAt);
      }
      setLoading(false);
    })();
  }, [isEdit, editingId, session.uid, navigation]);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      if (detectFileType(asset.name, asset.mimeType) === 'other') {
        setErrors((e) => ({ ...e, file: 'Only PDF and image files can be added.' }));
        return;
      }
      if (asset.size && asset.size > MAX_FILE_BYTES) {
        setErrors((e) => ({ ...e, file: `That file is too large (max ${formatBytes(MAX_FILE_BYTES)}).` }));
        return;
      }
      setErrors((e) => ({ ...e, file: null }));
      setPickedFile({ uri: asset.uri, name: asset.name, size: asset.size, mimeType: asset.mimeType });
      if (!title.trim()) setTitle(asset.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
    } catch (e) {
      Alert.alert('Could not open the file picker', 'Please try again.');
    }
  };

  const validate = () => {
    const next = {};
    next.title = validateTitle(title);
    if (!isEdit && !pickedFile) next.file = 'Choose a PDF or image file.';
    if (remind) {
      if (!dueAt) next.due = 'Pick the due date.';
      else if (dueAt < startOfDay(Date.now())) next.due = 'Pick today or a later date.';
    }
    const filtered = Object.fromEntries(Object.entries(next).filter(([, v]) => v));
    setErrors(filtered);
    return Object.keys(filtered).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const reminder = remind ? { dueAt } : null;
      const form = { title, category, description, reminder };
      if (isEdit) await editDocument(original, { ...form, file: pickedFile });
      else await addDocument(session.uid, { ...form, file: pickedFile });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not save', 'Something went wrong while saving this document. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <Header title="Edit document" onBack={() => navigation.goBack()} />
      </Screen>
    );
  }

  // What to show in the "File" card
  const shownFile = pickedFile
    ? { name: pickedFile.name, meta: `${pickedFile.size ? formatBytes(pickedFile.size) + ' · ' : ''}${fileTypeLabel(detectFileType(pickedFile.name, pickedFile.mimeType))}` }
    : original
    ? { name: original.fileName, meta: `${formatBytes(original.fileSize)} · ${fileTypeLabel(original.fileType)}` }
    : null;

  return (
    <Screen>
      <Header title={isEdit ? 'Edit document' : 'Add document'} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TextField
            label="Document title"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Academic Transcript"
            autoCapitalize="sentences"
            error={errors.title}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => (
              <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
            ))}
          </View>

          <TextField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Optional notes, e.g. Semester 5 official transcript"
            autoCapitalize="sentences"
            multiline
            style={{ marginTop: 8 }}
          />

          <Text style={styles.label}>File</Text>
          <View style={[styles.fileCard, errors.file && { borderColor: colors.danger }]}>
            {shownFile ? (
              <>
                <Text style={styles.fileName} numberOfLines={2}>
                  {shownFile.name}
                </Text>
                <Text style={styles.fileMeta}>{shownFile.meta}</Text>
              </>
            ) : (
              <Text style={styles.fileMeta}>No file chosen yet</Text>
            )}
          </View>
          {errors.file ? <Text style={styles.error}>{errors.file}</Text> : null}
          <Button
            title={shownFile ? 'Replace file' : 'Choose PDF or image'}
            variant="secondary"
            onPress={pickFile}
            style={{ marginTop: 12, marginBottom: 22 }}
          />

          <View style={styles.reminderCard}>
            <View style={styles.reminderHead}>
              <Ionicons name="alarm-outline" size={22} color={colors.primary} />
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={styles.reminderTitle}>Expiry reminder</Text>
                <Text style={styles.reminderSub}>{remind ? 'You will get a notification before the date' : 'No reminder set'}</Text>
              </View>
              <Switch
                value={remind}
                onValueChange={setRemind}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor={colors.white}
              />
            </View>

            {remind ? (
              <View style={{ marginTop: 18 }}>
                <ReminderPicker
                  dueAt={dueAt}
                  onChangeDue={setDueAt}
                  dueError={errors.due}
                />
              </View>
            ) : null}
          </View>

          <Button title={isEdit ? 'Save changes' : 'Save document'} onPress={save} loading={saving} style={{ marginTop: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 50 },
  label: { fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginBottom: 9, marginLeft: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  fileCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 18,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fileName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  fileMeta: { fontSize: 13.5, color: colors.textSecondary, marginTop: 4 },
  error: { color: colors.danger, fontSize: 12.5, marginTop: 6, marginLeft: 4 },
  reminderCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18 },
  reminderHead: { flexDirection: 'row', alignItems: 'center' },
  reminderTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  reminderSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
});
