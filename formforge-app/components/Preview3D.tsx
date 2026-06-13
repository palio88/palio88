import { Suspense } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '@/constants/tokens';

// react-three-fiber requires a native GL context via expo-gl.
// This component is a typed stub that will render a native GLView-backed
// Canvas once the full expo-gl + r3f integration is wired up at Wk 7-8.
// The editor screen uses inline preview state until then.

interface Props {
  glbUrl: string | null;
  isLoading?: boolean;
  style?: object;
}

export function Preview3D({ glbUrl, isLoading, style }: Props) {
  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator color={colors.teal} />
        <Text style={styles.label}>Generating…</Text>
      </View>
    );
  }

  if (!glbUrl) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.placeholder}>⬡</Text>
        <Text style={styles.label}>Adjust parameters to preview</Text>
      </View>
    );
  }

  // GLB loaded — placeholder for native GL canvas
  return (
    <View style={[styles.container, styles.loaded, style]}>
      <Text style={styles.placeholder}>⬡</Text>
      <Text style={styles.readyLabel}>3D preview ready</Text>
      <Text style={styles.urlHint} numberOfLines={1}>{glbUrl.split('/').pop()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   {
    height: 240,
    backgroundColor: '#0c1828',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loaded:      { backgroundColor: '#091a18' },
  placeholder: { fontSize: 52, color: colors.teal, opacity: 0.35 },
  label:       { color: colors.muted, fontSize: 13 },
  readyLabel:  { color: colors.teal, fontSize: 14, fontWeight: '600' },
  urlHint:     { color: colors.muted, fontSize: 10, fontFamily: 'JetBrainsMono_400Regular', maxWidth: 260 },
});
