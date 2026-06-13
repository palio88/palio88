import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { colors, spacing, radius } from '@/constants/tokens';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signInWithEmail } = useAuthStore();

  const handleSignIn = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      await signInWithEmail(email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>FormForge</Text>
          <Text style={styles.tagline}>3D print design on mobile</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={colors.muted}
            secureTextEntry
            autoComplete="password"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.bg} />
              : <Text style={styles.btnText}>Sign In</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/auth/sign-up')}>
            <Text style={styles.link}>Don't have an account? <Text style={styles.linkAccent}>Sign Up</Text></Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipRow} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.skip}>Continue without account →</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  inner:       { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  header:      { alignItems: 'center', marginBottom: spacing.xxl },
  logo:        { fontSize: 32, fontWeight: '700', color: colors.teal, letterSpacing: -0.5 },
  tagline:     { fontSize: 14, color: colors.muted, marginTop: 6 },
  form:        { gap: 8 },
  fieldLabel:  { fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2, marginTop: 8 },
  input:       {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.hl, paddingHorizontal: spacing.md, paddingVertical: 13,
    fontSize: 15,
  },
  error:       { color: colors.red, fontSize: 13, marginTop: 4 },
  btn:         {
    backgroundColor: colors.teal, borderRadius: radius.sm,
    paddingVertical: 14, alignItems: 'center', marginTop: spacing.md,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: colors.bg, fontWeight: '700', fontSize: 15 },
  linkRow:     { alignItems: 'center', marginTop: spacing.md },
  link:        { color: colors.muted, fontSize: 13 },
  linkAccent:  { color: colors.accent },
  skipRow:     { alignItems: 'center', marginTop: spacing.sm },
  skip:        { color: colors.muted, fontSize: 12 },
});
