import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useAuthStore } from '@/stores/auth.store';
import { colors, spacing, radius } from '@/constants/tokens';

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  free:   { label: 'Free',   color: colors.muted },
  pro:    { label: 'Pro',    color: colors.accent },
  studio: { label: 'Studio', color: colors.teal },
};

export default function AccountScreen() {
  const { user, tier, signOut } = useAuthStore();

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.headline}>Sign in to FormForge</Text>
          <Text style={styles.body}>Save designs, unlock Pro features, and sync across devices.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tierInfo = TIER_LABELS[tier] ?? TIER_LABELS.free;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.email?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={styles.email}>{user.email}</Text>
        <View style={[styles.tierBadge, { borderColor: tierInfo.color }]}>
          <Text style={[styles.tierLabel, { color: tierInfo.color }]}>{tierInfo.label}</Text>
        </View>
      </View>

      {tier === 'free' && (
        <View style={styles.upgradeCard}>
          <Text style={styles.upgradeHeadline}>Upgrade to Pro</Text>
          <Text style={styles.upgradeBody}>
            Unlimited saves, priority generation, STEP export, and more.
          </Text>
          <TouchableOpacity style={styles.upgradeBtn}>
            <Text style={styles.upgradeBtnText}>Upgrade — $9/mo</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  headline:        { color: colors.hl, fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  body:            { color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  profile:         { alignItems: 'center', paddingVertical: spacing.xl },
  avatar:          {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText:      { color: colors.teal, fontSize: 28, fontWeight: '700' },
  email:           { color: colors.text, fontSize: 15, marginBottom: 8 },
  tierBadge:       {
    paddingHorizontal: 12, paddingVertical: 3,
    borderRadius: radius.full, borderWidth: 1,
  },
  tierLabel:       { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  upgradeCard:     {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg,
  },
  upgradeHeadline: { color: colors.hl, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  upgradeBody:     { color: colors.text, fontSize: 13, lineHeight: 20, marginBottom: spacing.md },
  upgradeBtn:      {
    backgroundColor: colors.teal, borderRadius: radius.sm,
    paddingVertical: 12, alignItems: 'center',
  },
  upgradeBtnText:  { color: colors.bg, fontWeight: '700', fontSize: 14 },
  signOutBtn:      {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingVertical: 12, alignItems: 'center',
  },
  signOutText:     { color: colors.muted, fontSize: 14 },
});
