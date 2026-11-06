/**
 * Design tokens: the single source of truth for colors and sizes.
 *
 * Components are styled with NativeWind classes (tailwind.config.js), which use
 * these values: colors through CSS variables, sizes copied into the config (a
 * test keeps them in sync). Use `useTheme()` only where a raw color value is
 * needed, e.g. icon colors, ActivityIndicator or navigator options.
 */

export const palette = {
  light: {
    background: '#ffffff',
    surface: '#f4f5f7',
    surfaceSelected: '#e6e8ec',
    border: '#d9dce1',
    text: '#0b0b0b',
    textSecondary: '#52514e',
    primary: '#1c5cab',
    onPrimary: '#ffffff',
    danger: '#b42318',
    onDanger: '#ffffff',
  },
  dark: {
    background: '#0d0d0d',
    surface: '#1a1a19',
    surfaceSelected: '#2c2c2a',
    border: '#383835',
    text: '#f0efec',
    textSecondary: '#c3c2b7',
    primary: '#5598e7',
    onPrimary: '#0b0b0b',
    danger: '#f97066',
    onDanger: '#0b0b0b',
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
  lg: 20,
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
