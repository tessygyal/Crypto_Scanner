/**
 * Design tokens. Components read colors through `useTheme()` (light/dark aware)
 * and import spacing, radius and typography directly from here.
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
