export const colors = {
  bg:          '#060a10',
  surface:     '#0c1420',
  surface2:    '#101c2e',
  border:      '#182035',
  accent:      '#3d9bff',
  teal:        '#00e5cc',
  orange:      '#ff6b35',
  purple:      '#a855f7',
  gold:        '#f5c542',
  green:       '#4ade80',
  pink:        '#f472b6',
  red:         '#f87171',
  muted:       '#48587a',
  text:        '#c4d0ec',
  hl:          '#eef2ff',
} as const;

export const fonts = {
  mono:  'JetBrainsMono_400Regular',
  monoBold: 'JetBrainsMono_600SemiBold',
  sans:  'SpaceGrotesk_400Regular',
  sansBold: 'SpaceGrotesk_600SemiBold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
} as const;
