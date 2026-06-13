import PostHog from 'posthog-react-native';

let _client: PostHog | null = null;

function client(): PostHog | null {
  if (_client) return _client;
  const key = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
  if (!key) return null;
  _client = new PostHog(key, { host: 'https://app.posthog.com' });
  return _client;
}

export const analytics = {
  identify(userId: string, props?: Record<string, unknown>) {
    client()?.identify(userId, props);
  },

  track(event: string, props?: Record<string, unknown>) {
    client()?.capture(event, props);
  },

  screen(name: string, props?: Record<string, unknown>) {
    client()?.screen(name, props);
  },

  reset() {
    client()?.reset();
  },
};

// ─── Typed event catalogue ────────────────────────────────────────────────────

export const Events = {
  TEMPLATE_SELECTED:    'template_selected',
  PARAM_CHANGED:        'param_changed',
  GENERATION_STARTED:   'generation_started',
  GENERATION_COMPLETED: 'generation_completed',
  GENERATION_FAILED:    'generation_failed',
  EXPORT_TAPPED:        'export_tapped',
  DESIGN_SAVED:         'design_saved',
  UPGRADE_TAPPED:       'upgrade_tapped',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  AUTH_SIGNED_IN:       'auth_signed_in',
  AUTH_SIGNED_UP:       'auth_signed_up',
} as const;
