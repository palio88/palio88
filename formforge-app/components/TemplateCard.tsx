import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '@/constants/tokens';
import type { Template } from '@/lib/types';

interface Props {
  template: Template;
  onPress: () => void;
}

export function TemplateCard({ template, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.preview}>
        <Text style={styles.previewIcon}>⬡</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{template.name}</Text>
        <Text style={styles.description} numberOfLines={2}>{template.description}</Text>
        <View style={styles.footer}>
          <View style={[styles.catBadge]}>
            <Text style={styles.catText}>{template.category}</Text>
          </View>
          {!template.free && (
            <View style={styles.proBadge}>
              <Text style={styles.proText}>PRO</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  preview: {
    height: 110,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  previewIcon: { fontSize: 40, color: colors.teal, opacity: 0.5 },
  info:    { padding: spacing.sm },
  name:    { color: colors.hl, fontSize: 13, fontWeight: '700', marginBottom: 3 },
  description: { color: colors.muted, fontSize: 11, lineHeight: 16, marginBottom: 8 },
  footer:  { flexDirection: 'row', gap: 6, alignItems: 'center' },
  catBadge: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: radius.sm, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface2,
  },
  catText:  { color: colors.muted, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
  proBadge: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: radius.sm, borderWidth: 1,
    borderColor: '#1a3050', backgroundColor: '#0a1a2a',
  },
  proText:  { color: colors.accent, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
});
