import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth.store';
import { colors, spacing, radius } from '@/constants/tokens';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const { signUpWithEmail } = useAuthStore();

  const handleSignUp = async () => {
    if (!email.trim() || password.length < 8) {
      setError('Email required and password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signUpWithEmail(email.trim().toLowerCase(), password);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.checkmark}>✓</Text>
          <Text style={styles.headline}>Check your email</Text>
          <Text style={styles.body}>We sent a confirmation link to {email}. Click it to activate your account.</Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.replace('/auth/sign-in')}>
            <Text style={styles.btnText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>FormForge</Text>
          <Text style={styles.tagline}>Create your account</Text>
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
          />

          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="8+ characters"
            placeholderTextColor={colors.muted}
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.bg} />
              : <Text style={styles.btnText}>Create Account</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => router.back()}>
            <Text style={styles.link}>Already have an account? <Text style={styles.linkAccent}>Sign In</Text></Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  inner:       { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
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
  checkmark:   { fontSize: 48, color: colors.teal, marginBottom: 16 },
  headline:    { fontSize: 22, fontWeight: '700', color: colors.hl, marginBottom: 10, textAlign: 'center' },
  body:        { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
});
