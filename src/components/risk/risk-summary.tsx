import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, riskColors, spacing } from '@/theme';
import { LEVEL_COPY } from '@/utils/risk/scoring';
import type { RiskLevel } from '@/utils/risk/types';

const ICONS: Record<RiskLevel, ComponentProps<typeof Ionicons>['name']> = {
  none: 'checkmark-circle',
  low: 'information-circle',
  medium: 'warning',
  high: 'alert-circle',
};

/**
 * The headline of a result. The level is always shown as icon + text label +
 * color together, never color alone.
 */
export function RiskSummary({ level, score }: { level: RiskLevel; score: number }) {
  const theme = useTheme();
  const copy = LEVEL_COPY[level];
  const color = riskColors[level];

  return (
    <View
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, borderLeftColor: color }]}
      accessibilityRole="summary"
      accessibilityLabel={`${copy.label}. Risk score ${score} out of 100. ${copy.summary}`}>
      <View style={styles.header}>
        <Ionicons name={ICONS[level]} size={32} color={color} />
        <ThemedText variant="heading" style={styles.label}>
          {copy.label}
        </ThemedText>
      </View>

      <View style={styles.meterRow}>
        <View
          style={[styles.track, { backgroundColor: theme.surfaceSelected }]}
          importantForAccessibility="no-hide-descendants">
          {score > 0 && <View style={[styles.fill, { width: `${score}%`, backgroundColor: color }]} />}
        </View>
        <ThemedText variant="smallBold" style={styles.scoreText}>
          {score}/100
        </ThemedText>
      </View>

      <ThemedText color="textSecondary">{copy.summary}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderLeftWidth: 6,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    flex: 1,
  },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  scoreText: {
    minWidth: 52,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
