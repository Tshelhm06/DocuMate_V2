import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import Screen from '../../components/Screen';
import Header from '../../components/Header';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import { colors } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { validateName } from '../../utils/validation';

export default function EditProfileScreen({ navigation }) {
  const { session, saveProfile } = useAuth();
  const [name, setName] = useState(session.name === 'Student' ? '' : session.name);
  const [degree, setDegree] = useState(session.degree);
  const [studentId, setStudentId] = useState(session.studentId);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const problem = validateName(name);
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      await saveProfile({ name: name.trim(), degree: degree.trim(), studentId: studentId.trim() });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not save', String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Header title="Edit profile" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TextField label="Full name" value={name} onChangeText={setName} autoCapitalize="words" placeholder="Your full name" error={error} />
          <TextField label="Degree / programme" value={degree} onChangeText={setDegree} autoCapitalize="words" placeholder="e.g. BE Information Technology" />
          <TextField label="Student ID" value={studentId} onChangeText={setStudentId} placeholder="e.g. 02240188" keyboardType="number-pad" />
          {!session.guest ? <Text style={styles.email}>{`${session.offline ? 'Using offline as' : 'Signed in as'} ${session.email}`}</Text> : null}
          <Button title="Save changes" onPress={save} loading={saving} style={{ marginTop: 16 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  email: { fontSize: 13.5, color: colors.textSecondary, marginLeft: 4 },
});