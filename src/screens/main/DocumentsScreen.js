import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import Chip from '../../components/Chip';
import DocRow from '../../components/DocRow';
import EmptyState from '../../components/EmptyState';
import useLoad from '../../components/useLoad';
import { colors, radius } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { listDocuments, documentCounts } from '../../db/documentsRepo';
import { CATEGORIES } from '../../utils/constants';
import { pluralize } from '../../utils/format';

const FILTERS = ['All', ...CATEGORIES];

export default function DocumentsScreen({ navigation, route }) {
  const { session } = useAuth();
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [docs, setDocs] = useState([]);
  const [total, setTotal] = useState(0);

  // Home's "Quick access" cards open this tab already filtered.
  useEffect(() => {
    if (route.params?.category) setCategory(route.params.category);
  }, [route.params?.category, route.params?.stamp]);

  useLoad(async () => {
    const [list, counts] = await Promise.all([
      listDocuments(session.uid, { category, query }),
      documentCounts(session.uid),
    ]);
    setDocs(list);
    setTotal(counts.total);
  }, [session.uid, category, query]);

  const filtering = category !== 'All' || query.trim().length > 0;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Documents</Text>
        <Text style={styles.count}>{`${pluralize(total, 'file')} · stored offline`}</Text>

        <View style={styles.search}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search documents"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="search"
            autoCorrect={false}
            clearButtonMode="while-editing"
            accessibilityLabel="Search documents"
          />
          <Ionicons name="search" size={20} color={colors.primary} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} keyboardShouldPersistTaps="handled">
          {FILTERS.map((f) => (
            <Chip key={f} label={f} selected={category === f} onPress={() => setCategory(f)} />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={docs}
        keyExtractor={(d) => String(d.id)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({ item, index }) => (
          <DocRow doc={item} tone={index} onPress={() => navigation.navigate('DocumentDetails', { id: item.id })} />
        )}
        ListEmptyComponent={
          filtering ? (
            <EmptyState icon="search-outline" title="No matching documents" message="Try a different search word or category." />
          ) : (
            <EmptyState title="No documents yet" message="Tap the + button to add your first document." />
          )
        }
      />

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
        onPress={() => navigation.navigate('AddEditDocument')}
        accessibilityRole="button"
        accessibilityLabel="Add document"
      >
        <Ionicons name="add" size={32} color={colors.white} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 14 },
  title: { fontSize: 34, fontWeight: '700', color: colors.textPrimary },
  count: { fontSize: 16, color: colors.textSecondary, marginTop: 4, marginBottom: 16 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 20,
    minHeight: 54,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.textPrimary, paddingVertical: 12 },
  chips: { flexGrow: 0, marginBottom: 10 },
  list: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 110, flexGrow: 1 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
