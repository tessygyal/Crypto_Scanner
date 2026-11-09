// NativeWind (Tailwind CSS v3) config. Colors come from CSS variables set in
// src/theme/theme-vars.tsx, so light/dark mode is handled in one place and the
// hex values stay in src/theme/index.ts. A unit test checks the sizes below
// match src/theme (spacing, radius, typography).
const color = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // Must stay 'class'. With the default 'media', NativeWind on web throws
  // "Cannot manually set color scheme, as dark mode is type 'media'" at startup.
  // Dark mode still follows the phone/browser: colors come from useColorScheme()
  // and the prefers-color-scheme block in global.css, not from dark: classes.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: color('background'),
        surface: color('surface'),
        'surface-selected': color('surface-selected'),
        border: color('border'),
        text: color('text'),
        'text-secondary': color('text-secondary'),
        primary: color('primary'),
        'on-primary': color('on-primary'),
        danger: color('danger'),
        'on-danger': color('on-danger'),
        hero: color('hero'),
        'on-hero': color('on-hero'),
        'hero-muted': color('hero-muted'),
        // Risk colors are the same in light and dark mode. Always pair with an icon + text label.
        risk: { none: '#1fa971', low: '#f5a524', medium: '#ec835a', high: '#e5484d' },
      },
      spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', xxl: '64px' },
      borderRadius: { sm: '10px', md: '16px', lg: '24px', pill: '999px' },
      fontSize: {
        title: ['32px', { lineHeight: '40px', fontWeight: '800' }],
        heading: ['20px', { lineHeight: '28px', fontWeight: '800' }],
        body: ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-bold': ['16px', { lineHeight: '24px', fontWeight: '700' }],
        small: ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'small-bold': ['14px', { lineHeight: '20px', fontWeight: '700' }],
      },
      maxWidth: { content: '720px' },
    },
  },
  plugins: [],
};
