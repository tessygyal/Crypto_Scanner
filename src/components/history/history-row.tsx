import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { RiskIcon } from '@/components/risk/risk-icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme';
import type { CheckRow } from '@/types/database';
import { CHECK_TYPE_LABEL, formatWhen } from '@/utils/history';
import { LEVEL_COPY } from '@/utils/risk/scoring';

/** One check in the history list: risk level (icon + label), what was checked, when. */
export function HistoryRow({ check, onPress }: { check: CheckRow; onPress: () => void }) {
  const theme = useTheme();
  const label = LEVEL_COPY[check.risk_level].label;
  const when = formatWhen(check.created_at);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${CHECK_TYPE_LABEL[check.type]} check: ${check.input}. ${label}, score ${check.score}. ${when}.`}
      accessibilityHint="Opens the saved result"
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <RiskIcon level={check.risk_level} size={28} />
      <View style={styles.text}>
        <ThemedText variant="bodyBold" numberOfLines={1}>
          {check.input}
        </ThemedText>
        <ThemedText variant="small" color="textSecondary" numberOfLines={1}>
          {label} · {check.score}/100
        </ThemedText>
        <ThemedText variant="small" color="textSecondary">
          {CHECK_TYPE_LABEL[check.type]} · {when}
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
