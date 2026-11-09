/**
 * Design tokens: the single source of truth for colors and sizes.
 *
 * Components are styled with NativeWind classes (tailwind.config.js), which use
 * these values: colors through CSS variables, sizes copied into the config (a
 * test keeps them in sync). Use `useTheme()` only where a raw color value is
 * needed, e.g. icon colors, ActivityIndicator or navigator options.
 */

export const palette = {
  // Purple: white page, soft lavender cards, deep-purple text, violet accent.
  // Dark mode: deep-purple page with light text. Every text/background pair here
  // meets WCAG AA contrast (4.5:1) in both modes. The header ("hero") is the
  // page colour, so headers sit flat on the page.
  light: {
    background: '#ffffff',
    surface: '#f4eeff',
    surfaceSelected: '#e7dcff',
    border: '#e4dafb',
    text: '#1e0a4f',
    textSecondary: '#5b4b85',
    primary: '#6b1fff',
    onPrimary: '#ffffff',
    danger: '#b42328',
    onDanger: '#ffffff',
    hero: '#ffffff',
    onHero: '#1e0a4f',
    heroMuted: '#5b4b85',
  },
  dark: {
    background: '#140630',
    surface: '#22104a',
    surfaceSelected: '#301a63',
    border: '#3a2470',
    text: '#f3edff',
    textSecondary: '#c3b5e8',
    primary: '#b89bff',
    onPrimary: '#140630',
    danger: '#ff8d90',
    onDanger: '#140630',
    hero: '#140630',
    onHero: '#f3edff',
    heroMuted: '#c3b5e8',
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
  none: '#1fa971',
  low: '#f5a524',
  medium: '#ec835a',
  high: '#e5484d',
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

// Soft, rounded shapes: 16–24px corners on boxes, pills for buttons, chips and inputs.
export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

// Bold, heavy headings.
export const typography = {
  title: { fontSize: 32, lineHeight: 40, fontWeight: '800' },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: '800' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyBold: { fontSize: 16, lineHeight: 24, fontWeight: '700' },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  smallBold: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Content width cap so screens stay readable on tablets and web. */
export const maxContentWidth = 720;

/**
 * A risk colour as a soft tint, for pill and icon backgrounds behind normal text.
 * `#rrggbb` + alpha byte, which React Native and the web both understand.
 */
export function riskTint(level: RiskLevel): string {
  return `${riskColors[level]}2e`;
}
