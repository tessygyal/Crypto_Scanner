import { cssColorVariables, cssVariableName, hexToRgbChannels, palette, radius, spacing, typography } from '..';

// Jest runs in Node; the app's tsconfig has no Node types, so declare just what this test uses.
declare const __dirname: string;
/* eslint-disable @typescript-eslint/no-require-imports -- plain CommonJS config and Node's fs */
const tailwind = require('../../../tailwind.config.js');
const fs: { readFileSync: (file: string, encoding: 'utf8') => string } = require('fs');
/* eslint-enable @typescript-eslint/no-require-imports */
const ext = tailwind.theme.extend;
const css = fs.readFileSync(`${__dirname}/../../../global.css`, 'utf8');

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

describe('color variables', () => {
  it('converts hex to rgb channels', () => {
    expect(hexToRgbChannels('#1c5cab')).toBe('28 92 171');
    expect(hexToRgbChannels('#fff')).toBe('255 255 255');
    expect(cssVariableName('surfaceSelected')).toBe('--color-surface-selected');
  });

  it('every theme color has a Tailwind color that reads its variable', () => {
    for (const token of Object.keys(palette.light)) {
      expect(ext.colors[kebab(token)]).toBe(`rgb(var(${cssVariableName(token)}) / <alpha-value>)`);
    }
  });

  it('global.css (used on web) has the same light and dark values as src/theme', () => {
    const [light, dark] = css.split('prefers-color-scheme: dark');
    for (const [name, value] of Object.entries(cssColorVariables(palette.light))) {
      expect(light).toContain(`${name}: ${value};`);
    }
    for (const [name, value] of Object.entries(cssColorVariables(palette.dark))) {
      expect(dark).toContain(`${name}: ${value};`);
    }
  });

  it("uses darkMode 'class' (the default 'media' crashes NativeWind on web)", () => {
    expect(tailwind.darkMode).toBe('class');
  });

  it('light and dark define the same tokens', () => {
    expect(Object.keys(palette.dark).sort()).toEqual(Object.keys(palette.light).sort());
  });
});

describe('sizes match src/theme', () => {
  it('spacing', () => {
    for (const [k, v] of Object.entries(spacing)) expect(ext.spacing[k]).toBe(`${v}px`);
  });

  it('radius', () => {
    for (const [k, v] of Object.entries(radius)) expect(ext.borderRadius[k]).toBe(`${v}px`);
  });

  it('typography', () => {
    for (const [k, v] of Object.entries(typography)) {
      expect(ext.fontSize[kebab(k)]).toEqual([
        `${v.fontSize}px`,
        { lineHeight: `${v.lineHeight}px`, fontWeight: v.fontWeight },
      ]);
    }
  });
});
