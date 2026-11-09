import { View } from 'react-native';

import { RiskIcon } from '@/components/risk/risk-icon';
import { ThemedText } from '@/components/themed-text';
import { riskTint } from '@/theme';
import type { RiskLevel } from '@/utils/risk/types';

/**
 * A small tinted pill with the level icon and the risk score. Decorative for
 * screen readers: the row it sits in reads out the level label and score.
 */
export function ScorePill({ level, score }: { level: RiskLevel; score: number }) {
  return (
    <View
      className="h-9 min-w-[64px] flex-row items-center justify-center gap-xs rounded-pill px-sm"
      // The tint depends on the level at runtime, so it stays a style.
      style={{ backgroundColor: riskTint(level) }}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden>
      <RiskIcon level={level} size={16} />
      <ThemedText variant="smallBold" className="tabular-nums">
        {score}
      </ThemedText>
    </View>
  );
}
