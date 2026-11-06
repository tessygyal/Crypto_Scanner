import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, riskColors, spacing } from '@/theme';

/** A banner for a form's overall result: an error from the server, or a success note. */
export function FormMessage({ tone, title, message }: { tone: 'error' | 'success'; title?: string; message: string }) {
  const theme = useTheme();
  const color = tone === 'error' ? theme.danger : riskColors.none;
  return (
    <View
      style={[styles.box, { borderColor: color, backgroundColor: theme.surface }]}
      accessibilityRole={tone === 'error' ? 'alert' : 'summary'}
      accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}>
      {title && (
        <ThemedText variant="bodyBold" style={tone === 'error' ? { color } : undefined}>
          {title}
        </ThemedText>
      )}
      <ThemedText variant="small" color={title ? 'textSecondary' : 'text'}>
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
});
