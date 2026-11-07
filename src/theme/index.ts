/**
 * Design tokens: the single source of truth for colors and sizes.
 *
 * Components are styled with NativeWind classes (tailwind.config.js), which use
 * these values: colors through CSS variables, sizes copied into the config (a
 * test keeps them in sync). Use `useTheme()` only where a raw color value is
 * needed, e.g. icon colors, ActivityIndicator or navigator options.
 */

export const palette = {
  // "Trustworthy blue": navy header area, tinted page, white cards. Every text/background
  // pair here meets WCAG AA contrast (4.5:1) in both modes.
  light: {
    background: '#f2f5fa',
    surface: '#ffffff',
    surfaceSelected: '#e3eaf5',
    border: '#d6deea',
    text: '#0f1b2d',
    textSecondary: '#4a5568',
    primary: '#1f5fbf',
    onPrimary: '#ffffff',
    danger: '#b42318',
    onDanger: '#ffffff',
    hero: '#0b2a4a',
    onHero: '#ffffff',
    heroMuted: '#b9cbe6',
  },
  dark: {
    background: '#0a111d',
    surface: '#121c2c',
    surfaceSelected: '#1d2a40',
    border: '#2a3a55',
    text: '#eef2f8',
    textSecondary: '#a9b6ca',
    primary: '#6aa5ff',
    onPrimary: '#0a111d',
    danger: '#f97066',
    onDanger: '#0a111d',
    hero: '#0d1f38',
    onHero: '#ffffff',
    heroMuted: '#9fb4d4',
  },
} as const;

export type ThemeColors = { [K in keyof typeof palette.light]: string };
export type ThemeColor = keyof ThemeColors;

/** "#1c5cab" → "28 92 171", the form Tailwind's rgb(var(--x) / <alpha-value>) needs. */
export function hexToRgbChannels(hex: string): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** surfaceSelected → --color-surface-selected */
export function cssVariableName(token: string): string {
  return `--color-${token.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
}

/**
 * CSS variables for NativeWind classes such as `bg-surface` or `text-primary`
 * (see tailwind.config.js). Applied at the app root by <ThemeVariables>.
 */
export function cssColorVariables(colors: ThemeColors): Record<string, string> {
  return Object.fromEntries(Object.entries(colors).map(([k, v]) => [cssVariableName(k), hexToRgbChannels(v)]));
}

/**
 * Risk-level colors. Always shown together with an icon and a text label,
 * never on their own. Wording rules: say "risk indicators" or
 * "no known warnings found" — never "safe" or "this is a scam".
 */
export const riskColors = {
  none: '#0ca30c',
  low: '#fab219',
  medium: '#ec835a',
  high: '#d03b3b',
} as const;

export type RiskLevel = keyof typeof riskColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 64,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyBold: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  smallBold: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Content width cap so screens stay readable on tablets and web. */
export const maxContentWidth = 720;

/**
 * Soft shadow for cards. RN's boxShadow works on Android, iOS (New Architecture) and web.
 * Barely visible in dark mode, where the border does the work.
 */
export const cardShadow = { boxShadow: '0 1px 2px rgba(15, 27, 45, 0.06), 0 2px 8px rgba(15, 27, 45, 0.06)' } as const;
