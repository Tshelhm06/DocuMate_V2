import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

export default function TextField({
  label,
  error,
  secure = false,
  multiline = false,
  style,
  inputRef,
  ...rest
}) {
  const [hidden, setHidden] = useState(secure);

  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.box, multiline && styles.boxMulti, error && styles.boxError]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, multiline && styles.inputMulti]}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={hidden}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          autoCapitalize="none"
          {...rest}
        />
        {secure ? (
          <Pressable
            hitSlop={10}
            onPress={() => setHidden((h) => !h)}
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginBottom: 7, marginLeft: 2 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 18,
    minHeight: 54,
  },
  boxMulti: { alignItems: 'flex-start', paddingVertical: 12 },
  boxError: { borderColor: colors.danger },
  input: { flex: 1, fontSize: 16, color: colors.textPrimary, paddingVertical: 12 },
  inputMulti: { minHeight: 72, paddingVertical: 0 },
  error: { color: colors.danger, fontSize: 12.5, marginTop: 6, marginLeft: 4 },
});
