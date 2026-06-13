import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, radius } from '@/constants/tokens';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  feature?: string;
}

export function UpgradePrompt({ visible, onDismiss, feature }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onDismiss}>
        <View style={styles.sheet}>
          <View style={styles.pill} />
          <Text style={styles.icon}>⭐</Text>
          <Text style={styles.headline}>Pro Feature</Text>
          <Text style={styles.body}>
            {feature
              ? `${feature} is available on FormForge Pro.`
              : 'This feature is available on FormForge Pro.'}
            {' '}Upgrade to unlock unlimited saves, AI generation, STEP export, and more.
          </Text>
          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={() => {
              onDismiss();
              router.push('/(tabs)/account');
            }}
          >
            <Text style={styles.upgradeBtnText}>See Plans →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDismiss}>
            <Text style={styles.dismiss}>Not now</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:        {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet:          {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center', gap: spacing.sm,
  },
  pill:           {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, marginBottom: 8,
  },
  icon:           { fontSize: 40 },
  headline:       { color: colors.hl, fontSize: 20, fontWeight: '700' },
  body:           {
    color: colors.text, fontSize: 14, textAlign: 'center',
    lineHeight: 22, maxWidth: 300,
  },
  upgradeBtn:     {
    backgroundColor: colors.teal, borderRadius: radius.sm,
    paddingVertical: 14, paddingHorizontal: spacing.xxl,
    alignItems: 'center', width: '100%', marginTop: 8,
  },
  upgradeBtnText: { color: colors.bg, fontWeight: '700', fontSize: 15 },
  dismiss:        { color: colors.muted, fontSize: 13, marginTop: 4 },
});
