import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

/**
 * A row like "Storage / 24 documents ›" or "App lock [switch]".
 * card=true draws it as a white card (Profile summary rows).
 */
export default function SettingRow({
  title,
  subtitle,
  onPress,
  switchValue,
  onSwitchChange,
  switchDisabled,
  card = false,
  danger = false,
  last = false,
}) {
  const hasSwitch = typeof onSwitchChange === 'function';
  const Wrapper = onPress && !hasSwitch ? Pressable : View;

  return (
    <Wrapper
      {...(Wrapper === Pressable ? { onPress, accessibilityRole: 'button' } : {})}
      style={[styles.row, card && styles.card, !card && !last && styles.divider]}
    >
      <View style={styles.text}>
        <Text style={[styles.title, danger && { color: colors.danger }]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {hasSwitch ? (
        <Switch
          value={Boolean(switchValue)}
          onValueChange={onSwitchChange}
          disabled={switchDisabled}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.white}
        />
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      ) : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 20, marginBottom: 12 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  text: { flex: 1, paddingRight: 12 },
  title: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 3 },
});
