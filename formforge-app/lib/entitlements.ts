import { useEffect, useState } from 'react';
import Purchases, { type CustomerInfo } from 'react-native-purchases';
import { useAuthStore } from '@/stores/auth.store';
import type { SubscriptionTier } from '@/lib/types';

const RC_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '';

export function useRevenueCat() {
  const { user, setTier } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!RC_API_KEY_IOS) {
      setIsLoading(false);
      return;
    }

    const init = async () => {
      try {
        Purchases.configure({ apiKey: RC_API_KEY_IOS });
        if (user?.id) {
          await Purchases.logIn(user.id);
        }
        const info = await Purchases.getCustomerInfo();
        setTier(tierFromCustomerInfo(info));
      } catch {
        // RevenueCat unavailable — default to free tier
      } finally {
        setIsLoading(false);
      }
    };

    void init();

    const listener = Purchases.addCustomerInfoUpdateListener((info) => {
      setTier(tierFromCustomerInfo(info));
    });

    return () => listener.remove();
  }, [user?.id, setTier]);

  return { isLoading };
}

function tierFromCustomerInfo(info: CustomerInfo): SubscriptionTier {
  const active = info.entitlements.active;
  if (active['studio']) return 'studio';
  if (active['pro']) return 'pro';
  return 'free';
}

export function useTierGate(requiredTier: SubscriptionTier): boolean {
  const tier = useAuthStore((s) => s.tier);
  const TIER_ORDER: Record<SubscriptionTier, number> = { free: 0, pro: 1, studio: 2 };
  return TIER_ORDER[tier] >= TIER_ORDER[requiredTier];
}
