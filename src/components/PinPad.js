import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { PIN_LENGTH } from '../utils/constants';

/**
 * Dots + 0-9 keypad. Fully controlled: parent owns `value`.
 */
export default function PinPad({ value, onChange, disabled = false, error = false, length = PIN_LENGTH }) {
  const press = (digit) => {
    if (disabled || value.length >= length) return;
    onChange(value + digit);
  };
  const back = () => {
    if (disabled || value.length === 0) return;
    onChange(value.slice(0, -1));
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <View style={styles.wrap}>
      <View style={styles.dots} accessibilityLabel={`${value.length} of ${length} digits entered`}>
        {Array.from({ length }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i < value.length && styles.dotFilled, error && styles.dotError]}
          />
        ))}
      </View>

      <View style={styles.grid}>
        {keys.map((k) => (
          <Key key={k} label={k} onPress={() => press(k)} disabled={disabled} />
        ))}
        <View style={styles.keySpacer} />
        <Key label="0" onPress={() => press('0')} disabled={disabled} />
        <Pressable
          onPress={back}
          disabled={disabled}
          style={styles.keySpacer}
          accessibilityRole="button"
          accessibilityLabel="Delete last digit"
        >
          <Ionicons name="backspace-outline" size={28} color={colors.textPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

function Key({ label, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.key, pressed && { backgroundColor: colors.secondary }, disabled && { opacity: 0.4 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.keyText}>{label}</Text>
    </Pressable>
  );
}

const KEY = 74;

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  dots: { flexDirection: 'row', marginBottom: 34, height: 20, alignItems: 'center' },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: colors.primary, marginHorizontal: 11 },
  dotFilled: { backgroundColor: colors.primary },
  dotError: { borderColor: colors.danger, backgroundColor: colors.danger },
  grid: { width: KEY * 3 + 48, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  key: {
    width: KEY,
    height: KEY,
    borderRadius: KEY / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  keyText: { fontSize: 28, fontWeight: '500', color: colors.textPrimary },
  keySpacer: { width: KEY, height: KEY, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
});