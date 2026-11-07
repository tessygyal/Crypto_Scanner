import { View, type ViewProps } from 'react-native';

import { cardShadow } from '@/theme';
import { cn } from '@/utils/cn';

/** A white (dark: raised) card with a soft shadow. Pass extra classes for spacing or layout. */
export function Card({ className, style, ...rest }: ViewProps & { className?: string }) {
  return (
    <View
      className={cn('gap-sm rounded-lg border border-border bg-surface p-md', className)}
      style={[cardShadow, style]}
      {...rest}
    />
  );
}
