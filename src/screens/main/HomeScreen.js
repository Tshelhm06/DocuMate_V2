import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import Avatar from '../../components/Avatar';
import DocRow from '../../components/DocRow';
import EmptyState from '../../components/EmptyState';
import useLoad from '../../components/useLoad';
import { colors, radius } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { documentCounts, recentDocuments } from '../../db/documentsRepo';
import { CATEGORIES } from '../../utils/constants';
import { firstName } from '../../utils/format';
import { greetingForHour } from '../../utils/dates';

export default function HomeScreen({ navigation }) {
  const { session } = useAuth();
  const [counts, setCounts] = useState(null);
  const [recent, setRecent] = useState([]);

  useLoad(async () => {
    const [c, r] = await Promise.all([documentCounts(session.uid), recentDocuments(session.uid, 3)]);
    setCounts(c);
    setRecent(r);
  }, [session.uid]);

  const total = counts?.total ?? 0;
  const pad = (n) => String(n ?? 0).padStart(2, '0');

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greetingForHour(new Date().getHours())}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {firstName(session.name)}
            </Text>
          </View>
          <Pressable onPress={() => navigation.navigate('Profile')} accessibilityRole="button" accessibilityLabel="Open profile">
            <Avatar name={session.name} size={56} />
          </Pressable>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Your documents</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryCount}>{total}</Text>
            <Text style={styles.summaryText}>organized {total === 1 ? 'file' : 'files'}</Text>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => navigation.navigate('AddEditDocument')} hitSlop={10} accessibilityRole="button">
              <Text style={styles.add}>+ Add document</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.section}>Quick access</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c}
              style={({ pressed }) => [styles.cat, pressed && { opacity: 0.85 }]}
              onPress={() => navigation.navigate('Documents', { category: c, stamp: Date.now() })}
              accessibilityRole="button"
              accessibilityLabel={`${c}, ${counts?.[c] ?? 0} documents`}
            >
              <Text style={styles.catName}>{c}</Text>
              <Text style={styles.catCount}>{pad(counts?.[c])}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Recent</Text>
        {recent.length === 0 ? (
          <EmptyState
            title="No documents yet"
            message="Tap “+ Add document” to save your first transcript, certificate or ID."
          />
        ) : (
          recent.map((d, i) => (
            <DocRow key={d.id} doc={d} variant="recent" tone={i} onPress={() => navigation.navigate('DocumentDetails', { id: d.id })} />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 30 },
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  greeting: { fontSize: 18, color: colors.textSecondary },
  name: { fontSize: 36, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
  summary: { backgroundColor: colors.primary, borderRadius: radius.xl, padding: 22, marginBottom: 26 },
  summaryLabel: { color: colors.white, fontSize: 18 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 6 },
  summaryCount: { color: colors.white, fontSize: 52, fontWeight: '700', lineHeight: 58 },
  summaryText: { color: 'rgba(255,255,255,0.85)', fontSize: 16, marginLeft: 12, marginBottom: 9 },
  add: { color: colors.white, fontSize: 16, fontWeight: '700', marginBottom: 9 },
  section: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 14 },
  cat: { width: '48.2%', backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 18, paddingHorizontal: 18, marginBottom: 14 },
  catName: { fontSize: 17, color: colors.textPrimary },
  catCount: { fontSize: 26, fontWeight: '700', color: colors.primary, marginTop: 6 },
});
