import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/constants/tokens';

const queryClient = new QueryClient();

export default function RootLayout() {
  const setSession = useAuthStore((s) => s.setSession);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const [{ data: { session } }, onboardingDone] = await Promise.all([
        supabase.auth.getSession(),
        AsyncStorage.getItem('onboarding_done'),
      ]);
      setSession(session);
      if (!onboardingDone) {
        router.replace('/onboarding');
      }
      setReady(true);
    };
    void init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [setSession]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" backgroundColor={colors.bg} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.hl,
          headerTitleStyle: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16 },
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="auth/sign-in" options={{ title: 'Sign In', headerBackTitle: 'Back' }} />
        <Stack.Screen name="auth/sign-up" options={{ title: 'Create Account', headerBackTitle: 'Back' }} />
        <Stack.Screen
          name="editor/[templateId]"
          options={{ title: 'Editor', headerBackTitle: 'Browse' }}
        />
      </Stack>
    </QueryClientProvider>
  );
}
