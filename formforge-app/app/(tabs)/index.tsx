import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useDesignStore } from '@/stores/design.store';
import { TemplateCard } from '@/components/TemplateCard';
import { colors, spacing, radius } from '@/constants/tokens';
import type { Template } from '@/lib/types';
import templates from '@/data/templates.json';

const CATEGORIES = ['all', 'storage', 'desk', 'home', 'personalized'];

export default function BrowseScreen() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const setActiveTemplate = useDesignStore((s) => s.setActiveTemplate);

  const filtered = (templates as Template[]).filter((t) => {
    const matchCat = activeCategory === 'all' || t.category === activeCategory;
    const matchSearch =
      search.trim() === '' ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  const handleSelect = useCallback(
    (template: Template) => {
      setActiveTemplate(template);
      router.push(`/editor/${template.id}`);
    },
    [setActiveTemplate],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search templates…"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.categories}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setActiveCategory(cat)}
            style={[styles.catPill, activeCategory === cat && styles.catPillActive]}
          >
            <Text
              style={[styles.catLabel, activeCategory === cat && styles.catLabelActive]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <TemplateCard template={item} onPress={() => handleSelect(item)} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No templates match your search.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.bg },
  searchBar:       { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  searchInput:     {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.hl,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
  },
  categories:      { flexDirection: 'row', paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: 8 },
  catPill:         {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  catPillActive:   { borderColor: colors.teal, backgroundColor: '#091a18' },
  catLabel:        { fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  catLabelActive:  { color: colors.teal },
  grid:            { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  row:             { gap: 12, marginBottom: 12 },
  empty:           { color: colors.muted, textAlign: 'center', marginTop: 48, fontSize: 14 },
});
