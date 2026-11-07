import { View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';

/** Placeholder for a tab whose feature arrives in a later milestone. */
export function ComingSoon({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <Screen>
      <ThemedText variant="title">{title}</ThemedText>
      <ThemedText color="textSecondary">{description}</ThemedText>
      <View className="self-start rounded-pill border border-border bg-surface px-md py-xs">
        <ThemedText variant="smallBold">Coming in a later milestone</ThemedText>
      </View>
      {children}
    </Screen>
  );
}
