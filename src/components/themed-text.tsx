import { Text, type TextProps } from 'react-native';

import type { ThemeColor, TypographyVariant } from '@/theme';
import { cn } from '@/utils/cn';

export type ThemedTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: ThemeColor;
  className?: string;
};

// Full class names (not built from strings) so Tailwind can find them.
const VARIANT: Record<TypographyVariant, string> = {
  title: 'text-title',
  heading: 'text-heading',
  body: 'text-body',
  bodyBold: 'text-body-bold',
  small: 'text-small',
  smallBold: 'text-small-bold',
};

const COLOR: Record<ThemeColor, string> = {
  background: 'text-background',
  surface: 'text-surface',
  surfaceSelected: 'text-surface-selected',
  border: 'text-border',
  text: 'text-text',
  textSecondary: 'text-text-secondary',
  primary: 'text-primary',
  onPrimary: 'text-on-primary',
  danger: 'text-danger',
  onDanger: 'text-on-danger',
};

export function ThemedText({ variant = 'body', color = 'text', className, ...rest }: ThemedTextProps) {
  return <Text className={cn(VARIANT[variant], COLOR[color], className)} {...rest} />;
}
