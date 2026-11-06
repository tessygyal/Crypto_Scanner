import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme';

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
  const theme = useTheme();
  return (
    <Screen>
      <ThemedText variant="title">{title}</ThemedText>
      <ThemedText color="textSecondary">{description}</ThemedText>
      <View style={[styles.badge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <ThemedText variant="smallBold">Coming in a later milestone</ThemedText>
      </View>
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
});
