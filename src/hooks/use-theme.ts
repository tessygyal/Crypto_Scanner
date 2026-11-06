import { useColorScheme } from '@/hooks/use-color-scheme';
import { palette, type ThemeColors } from '@/theme';

/** The color tokens for the current light/dark mode. */
export function useTheme(): ThemeColors {
  return useColorScheme() === 'dark' ? palette.dark : palette.light;
}
