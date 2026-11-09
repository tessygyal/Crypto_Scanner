import { View, type ViewProps } from 'react-native';

import { cn } from '@/utils/cn';

/** A soft lavender card (deep purple in dark mode), flat with no shadow. Pass extra classes for spacing or layout. */
export function Card({ className, ...rest }: ViewProps & { className?: string }) {
  return <View className={cn('gap-sm rounded-lg bg-surface p-lg', className)} {...rest} />;
}
