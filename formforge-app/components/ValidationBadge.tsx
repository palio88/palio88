import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '@/constants/tokens';
import type { ValidationResult } from '@/lib/types';

interface Props {
  validation: ValidationResult;
}

export function ValidationBadge({ validation }: Props) {
  const hasWarnings = validation.warnings.length > 0;
  const ok = validation.manifold && validation.wall_thickness_ok;

  const bg    = ok && !hasWarnings ? '#091a18' : hasWarnings ? '#1a150a' : '#1a0a0a';
  const border = ok && !hasWarnings ? '#0f3530' : hasWarnings ? '#3a2e0a' : '#3a1010';
  const text  = ok && !hasWarnings ? colors.teal : hasWarnings ? colors.gold : colors.red;
  const label = ok && !hasWarnings ? 'PRINT READY ✓'
              : hasWarnings        ? `${validation.warnings.length} WARNING${validation.warnings.length > 1 ? 'S' : ''} ⚠`
              :                      'CHECK GEOMETRY ✗';

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    fontFamily: 'JetBrainsMono_400Regular',
  },
});
