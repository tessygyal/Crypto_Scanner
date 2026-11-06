import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme';

export const DISCLAIMER_TEXT =
  'This app shows risk indicators only. It cannot confirm that an offer, token or website is ' +
  'legitimate or a scam, and it never handles money. Always check with official sources before ' +
  'sending money or crypto to anyone.';

/** The app-wide disclaimer. Keep it visible on every screen that shows a result. */
export function Disclaimer() {
  const theme = useTheme();
  return (
    <View
      style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}
      accessibilityRole="summary">
      <ThemedText variant="smallBold">Disclaimer</ThemedText>
      <ThemedText variant="small" color="textSecondary">
        {DISCLAIMER_TEXT}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
});
