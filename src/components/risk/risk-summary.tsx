import { View } from 'react-native';

import { RiskIcon } from '@/components/risk/risk-icon';
import { ThemedText } from '@/components/themed-text';
import { cardShadow, riskColors } from '@/theme';
import { LEVEL_COPY } from '@/utils/risk/scoring';
import type { RiskLevel } from '@/utils/risk/types';

/**
 * The headline of a result. The level is always shown as icon + text label +
 * color together, never color alone.
 */
export function RiskSummary({ level, score }: { level: RiskLevel; score: number }) {
  const copy = LEVEL_COPY[level];
  // The level color and the score change at runtime, so those stay as styles.
  const color = riskColors[level];

  return (
    <View
      className="gap-md rounded-lg border border-l-[6px] border-border bg-surface p-md"
      style={[cardShadow, { borderLeftColor: color }]}
      accessibilityRole="summary"
      accessibilityLabel={`${copy.label}. Risk score ${score} out of 100. ${copy.summary}`}>
      <View className="flex-row items-center gap-sm">
        <RiskIcon level={level} size={32} />
        <ThemedText variant="heading" className="flex-1">
          {copy.label}
        </ThemedText>
      </View>

      <View className="flex-row items-center gap-sm">
        <View
          className="h-2 flex-1 overflow-hidden rounded-pill bg-surface-selected"
          importantForAccessibility="no-hide-descendants">
          {score > 0 && <View className="h-full rounded-pill" style={{ width: `${score}%`, backgroundColor: color }} />}
        </View>
        <ThemedText variant="smallBold" className="min-w-[52px] text-right tabular-nums">
          {score}/100
        </ThemedText>
      </View>

      <ThemedText color="textSecondary">{copy.summary}</ThemedText>
    </View>
  );
}
