import { Text, type TextProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { typography, type ThemeColor, type TypographyVariant } from '@/theme';

export type ThemedTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: ThemeColor;
};

export function ThemedText({ variant = 'body', color = 'text', style, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  return <Text style={[typography[variant], { color: theme[color] }, style]} {...rest} />;
}
