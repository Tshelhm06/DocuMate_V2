import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import Chip from '../../components/Chip';
import ReminderPicker from '../../components/ReminderPicker';
import { explainReminderResult } from '../../components/reminderFeedback';
import { colors } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { getReminder } from '../../db/remindersRepo';
import { createReminder, updateReminder } from '../../services/reminders';
import { CATEGORIES, DEFAULT_LEAD_DAYS } from '../../utils/constants';
import { startOfDay } from '../../utils/dates';
import { parseLeadDays } from '../../utils/reminderSchedule';

/** Standalone reminder (for example "CID expiry") that is not tied to a document. */
export default function AddReminderScreen({ navigation, route }) {
  const editingId = route.params?.id ?? null;
  const isEdit = editingId !== null;
  const { session } = useAuth();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Personal');
  const [dueAt, setDueAt] = useState(null);
  const [leadDays, setLeadDays] = useState(DEFAULT_LEAD_DAYS);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const r = await getReminder(editingId, session.uid);
      if (!r) {
        navigation.goBack();
        return;
      }
      setTitle(r.title);
      setCategory(r.category);
      setDueAt(r.dueAt);
      setLeadDays(parseLeadDays(r.leadDays));
    })();
  }, [isEdit, editingId, session.uid, navigation]);

  const save = async () => {
    const next = {};
    if (!title.trim()) next.title = 'Enter a title, e.g. CID expiry';
    if (!dueAt) next.due = 'Pick the due date.';
    else if (!isEdit && dueAt < startOfDay(Date.now())) next.due = 'Pick today or a later date.';
    if (leadDays.length === 0) next.lead = 'Pick at least one notification time.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const fields = { title: title.trim(), category, dueAt, leadDays };
      const result = isEdit
        ? await updateReminder(editingId, session.uid, fields)
        : await createReminder({ ownerId: session.uid, ...fields });
      explainReminderResult(result, () => navigation.goBack());
    } catch (e) {
      Alert.alert('Could not save', 'Something went wrong while saving this reminder. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Header title={isEdit ? 'Edit reminder' : 'Add reminder'} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TextField
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. CID expiry"
            autoCapitalize="sentences"
            error={errors.title}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => (
              <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
            ))}
          </View>

          <View style={{ marginTop: 10 }}>
            <ReminderPicker
              dueAt={dueAt}
              leadDays={leadDays}
              onChangeDue={setDueAt}
              onChangeLead={setLeadDays}
              dueError={errors.due}
            />
            {errors.lead ? <Text style={styles.error}>{errors.lead}</Text> : null}
          </View>

          <Button title={isEdit ? 'Save changes' : 'Save reminder'} onPress={save} loading={saving} style={{ marginTop: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 50 },
  label: { fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginBottom: 9, marginLeft: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  error: { color: colors.danger, fontSize: 12.5, marginTop: 6, marginLeft: 4 },
});
