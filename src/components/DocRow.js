import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { fileTypeLabel } from '../utils/files';
import { formatUpdated } from '../utils/dates';
import { formatBytes } from '../utils/format';

/**
 * One document in a list.
 * variant "list"   -> Category · PDF + "Updated 2 days ago" (Documents screen)
 * variant "recent" -> PDF · 1.2 MB                          (Home screen)
 */
export default function DocRow({ doc, onPress, variant = 'list', tone = 0 }) {
  const typeLabel = fileTypeLabel(doc.fileType);
  const tile = tone % 2 === 0 ? colors.secondary : colors.tint;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]} accessibilityRole="button">
      <View style={[styles.tile, { backgroundColor: tile }]}>
        <Text style={styles.tileText}>{doc.fileType === 'image' ? 'IMG' : doc.fileType === 'pdf' ? 'PDF' : 'DOC'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {doc.title}
        </Text>
        {variant === 'recent' ? (
          <Text style={styles.sub}>{`${typeLabel} · ${formatBytes(doc.fileSize)}`}</Text>
        ) : (
          <>
            <Text style={styles.meta} numberOfLines={1}>{`${doc.category} · ${typeLabel}`}</Text>
            <Text style={styles.sub}>{formatUpdated(doc.updatedAt)}</Text>
          </>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 12,
  },
  tile: { width: 62, height: 62, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  tileText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  info: { flex: 1, marginRight: 8 },
  title: { fontSize: 17, fontWeight: '600', color: colors.textPrimary },
  meta: { fontSize: 14, color: colors.primary, marginTop: 3 },
  sub: { fontSize: 13, color: colors.textSecondary, marginTop: 3 },
});
