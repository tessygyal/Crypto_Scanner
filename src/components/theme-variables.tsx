import { vars } from 'nativewind';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { cssColorVariables, palette } from '@/theme';

const lightVars = vars(cssColorVariables(palette.light));
const darkVars = vars(cssColorVariables(palette.dark));

/**
 * Sets the color variables used by NativeWind classes (bg-surface, text-primary…)
 * for the current light/dark mode. Wraps the whole app in app/_layout.tsx.
 */
export function ThemeVariables({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  return <View style={[{ flex: 1 }, scheme === 'dark' ? darkVars : lightVars]}>{children}</View>;
}
