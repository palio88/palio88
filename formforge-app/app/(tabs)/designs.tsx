import { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import { useDesignStore } from '@/stores/design.store';
import { useAuthStore } from '@/stores/auth.store';
import { supabase } from '@/lib/supabase';
import { colors, spacing } from '@/constants/tokens';
import type { SavedDesign } from '@/lib/types';

export default function DesignsScreen() {
  const { savedDesigns, setSavedDesigns } = useDesignStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('designs')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        if (data) setSavedDesigns(data as SavedDesign[]);
      });
  }, [user, setSavedDesigns]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.headline}>Sign in to save designs</Text>
          <Text style={styles.body}>Your designs sync across devices when you have an account.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={savedDesigns}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <DesignRow design={item} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.headline}>No saved designs yet</Text>
            <Text style={styles.body}>Browse templates, customize, and save your first design.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function DesignRow({ design }: { design: SavedDesign }) {
  const date = new Date(design.updated_at).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  return (
    <View style={styles.row}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{design.template_name}</Text>
        <Text style={styles.rowDate}>{date}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list:      { padding: spacing.md },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, marginTop: 80 },
  headline:  { color: colors.hl, fontSize: 18, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  body:      { color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  row:       {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowInfo:   { flex: 1 },
  rowName:   { color: colors.hl, fontSize: 14, fontWeight: '600' },
  rowDate:   { color: colors.muted, fontSize: 12, marginTop: 2 },
});
