import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { formatDate } from '../utils/dates';
import Button from './Button';

/**
 * Tap-to-pick date. Android shows the system dialog, iOS shows a calendar in a sheet.
 * `value` is milliseconds (or null).
 */
export default function DateField({ label, value, onChange, minimumDate, placeholder = 'Choose a date', error }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || Date.now());

  const openPicker = () => {
    setDraft(value || Date.now());
    setOpen(true);
  };

  const handleAndroid = (event, selected) => {
    setOpen(false);
    if (event.type === 'set' && selected) onChange(selected.getTime());
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable onPress={openPicker} style={[styles.box, error && styles.boxError]} accessibilityRole="button">
        <Text style={[styles.value, !value && { color: colors.textSecondary }]}>
          {value ? formatDate(value) : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={new Date(draft)}
          mode="date"
          display="default"
          minimumDate={minimumDate ? new Date(minimumDate) : undefined}
          onChange={handleAndroid}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <View style={styles.backdrop}>
            <View style={styles.sheet}>
              <DateTimePicker
                value={new Date(draft)}
                mode="date"
                display="inline"
                themeVariant="light"
                accentColor={colors.primary}
                minimumDate={minimumDate ? new Date(minimumDate) : undefined}
                onChange={(_, selected) => selected && setDraft(selected.getTime())}
              />
              <View style={styles.sheetButtons}>
                <Button title="Cancel" variant="secondary" compact style={{ flex: 1, marginRight: 10 }} onPress={() => setOpen(false)} />
                <Button
                  title="Done"
                  compact
                  style={{ flex: 1 }}
                  onPress={() => {
                    onChange(draft);
                    setOpen(false);
                  }}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginBottom: 7, marginLeft: 2 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    minHeight: 54,
  },
  boxError: { borderColor: colors.danger },
  value: { fontSize: 16, color: colors.textPrimary },
  error: { color: colors.danger, fontSize: 12.5, marginTop: 6, marginLeft: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 16, paddingBottom: 30 },
  sheetButtons: { flexDirection: 'row', marginTop: 8 },
});
