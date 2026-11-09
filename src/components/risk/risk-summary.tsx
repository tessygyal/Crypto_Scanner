import { View } from 'react-native';

import { RiskGauge } from '@/components/risk/risk-gauge';
import { RiskIcon } from '@/components/risk/risk-icon';
import { ThemedText } from '@/components/themed-text';
import { riskTint } from '@/theme';
import { LEVEL_COPY } from '@/utils/risk/scoring';
import type { RiskLevel } from '@/utils/risk/types';

/**
 * The headline of a result: score ring, then the level as a tinted pill, then a
 * short explanation. The level is always icon + text label + color together,
 * never color alone.
 */
export function RiskSummary({ level, score }: { level: RiskLevel; score: number }) {
  const copy = LEVEL_COPY[level];

  return (
    <View
      className="items-center gap-md"
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${copy.label}. Risk score ${score} out of 100. ${copy.summary}`}
      accessibilityLiveRegion="polite">
      <RiskGauge level={level} score={score} />

      <View
        className="flex-row items-center gap-sm rounded-pill px-lg py-sm"
        // The tint depends on the level at runtime, so it stays a style.
        style={{ backgroundColor: riskTint(level) }}>
        <RiskIcon level={level} size={24} />
        <ThemedText variant="heading">{copy.label}</ThemedText>
      </View>

      <ThemedText color="textSecondary" className="text-center">
        {copy.summary}
      </ThemedText>
    </View>
  );
}
