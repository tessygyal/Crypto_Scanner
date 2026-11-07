import { Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { cn } from '@/utils/cn';

/** A pill-shaped toggle for picking one option (mode switches, yes/no answers). */
export function ChoiceChip({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={4}
      className={cn(
        'min-h-10 items-center justify-center rounded-pill border px-md active:opacity-70',
        selected ? 'border-primary bg-primary' : 'border-border bg-surface'
      )}>
      <ThemedText variant="smallBold" color={selected ? 'onPrimary' : 'text'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}
