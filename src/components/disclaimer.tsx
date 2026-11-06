import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export const DISCLAIMER_TEXT =
  'This app shows risk indicators only. It cannot confirm that an offer, token or website is ' +
  'legitimate or a scam, and it never handles money. Always check with official sources before ' +
  'sending money or crypto to anyone.';

/** The app-wide disclaimer. Keep it visible on every screen that shows a result. */
export function Disclaimer() {
  return (
    <View className="gap-xs rounded-md border border-border bg-surface p-md" accessibilityRole="summary">
      <ThemedText variant="smallBold">Disclaimer</ThemedText>
      <ThemedText variant="small" color="textSecondary">
        {DISCLAIMER_TEXT}
      </ThemedText>
    </View>
  );
}
