import { useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  useWindowDimensions, SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, radius } from '@/constants/tokens';

const SLIDES = [
  {
    id: '1',
    icon: '⬡',
    title: 'Design on your phone',
    body: 'Pick from 40+ curated parametric templates. Adjust sliders and see your design update in real time.',
  },
  {
    id: '2',
    icon: '✓',
    title: 'Print-ready, guaranteed',
    body: 'Every export is validated for manifold geometry, wall thickness, and overhang angles — before you send to your printer.',
  },
  {
    id: '3',
    icon: '⬇',
    title: 'Export in seconds',
    body: 'Download STL or 3MF directly to your slicer. Supports Bambu Lab, Prusa, Creality, and every other printer that reads standard formats.',
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const advance = async () => {
    if (index < SLIDES.length - 1) {
      const next = index + 1;
      listRef.current?.scrollToIndex({ index: next, animated: true });
      setIndex(next);
    } else {
      await AsyncStorage.setItem('onboarding_done', 'true');
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.id}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity style={styles.btn} onPress={advance}>
          <Text style={styles.btnText}>
            {index < SLIDES.length - 1 ? 'Next' : 'Start Designing'}
          </Text>
        </TouchableOpacity>

        {index < SLIDES.length - 1 && (
          <TouchableOpacity
            onPress={async () => {
              await AsyncStorage.setItem('onboarding_done', 'true');
              router.replace('/(tabs)');
            }}
          >
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  slide:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  icon:      { fontSize: 72, color: colors.teal, marginBottom: spacing.lg, opacity: 0.85 },
  title:     { fontSize: 26, fontWeight: '700', color: colors.hl, textAlign: 'center', marginBottom: 14 },
  body:      { fontSize: 15, color: colors.text, textAlign: 'center', lineHeight: 24 },
  footer:    { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md, alignItems: 'center' },
  dots:      { flexDirection: 'row', gap: 8 },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.teal, width: 18 },
  btn:       {
    backgroundColor: colors.teal, borderRadius: radius.sm,
    paddingVertical: 14, paddingHorizontal: spacing.xxl,
    alignItems: 'center', width: '100%',
  },
  btnText:   { color: colors.bg, fontWeight: '700', fontSize: 15 },
  skip:      { color: colors.muted, fontSize: 13 },
});
