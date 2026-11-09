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
        'min-h-12 items-center justify-center rounded-pill border-2 px-md active:scale-[0.97] active:opacity-80',
        selected ? 'border-primary bg-primary' : 'border-border bg-background'
      )}>
      <ThemedText variant="smallBold" color={selected ? 'onPrimary' : 'text'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}
