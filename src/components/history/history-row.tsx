import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import { ScorePill } from '@/components/risk/score-pill';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { CheckRow } from '@/types/database';
import { CHECK_TYPE_LABEL, formatWhen } from '@/utils/history';
import { LEVEL_COPY } from '@/utils/risk/scoring';

/** One check in the history list: score pill (icon + number), what was checked, level label, when. */
export function HistoryRow({ check, onPress }: { check: CheckRow; onPress: () => void }) {
  const theme = useTheme();
  const label = LEVEL_COPY[check.risk_level].label;
  const when = formatWhen(check.created_at);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${CHECK_TYPE_LABEL[check.type]} check: ${check.input}. ${label}, risk score ${check.score} out of 100. ${when}.`}
      accessibilityHint="Opens the saved result"
      className="min-h-[72px] flex-row items-center gap-md rounded-lg bg-surface px-md py-sm active:scale-[0.98] active:opacity-80">
      <ScorePill level={check.risk_level} score={check.score} />
      <View className="flex-1 gap-0.5">
        <ThemedText variant="bodyBold" numberOfLines={1}>
          {check.input}
        </ThemedText>
        <ThemedText variant="small" color="textSecondary" numberOfLines={1}>
          {label}
        </ThemedText>
        <ThemedText variant="small" color="textSecondary">
          {CHECK_TYPE_LABEL[check.type]} · {when}
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} importantForAccessibility="no" />
    </Pressable>
  );
}
