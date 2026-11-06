import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { radius, spacing } from '@/theme';
import type { Signal } from '@/utils/risk/types';

/** Each risk indicator with its plain-language explanation. */
export function SignalList({ signals }: { signals: Signal[] }) {
  const theme = useTheme();
  const indicators = [...signals].sort((a, b) => b.weight - a.weight);

  return (
    <View style={styles.list}>
      {indicators.map((s) => {
        const isInfo = s.weight === 0;
        return (
          <View
            key={s.id}
            style={[styles.item, { backgroundColor: theme.surface, borderColor: theme.border }]}
            accessible
            accessibilityLabel={`${isInfo ? 'Note' : 'Risk indicator'}: ${s.title}. ${s.detail}`}>
            <Ionicons
              name={isInfo ? 'information-circle-outline' : 'alert-circle-outline'}
              size={22}
              color={isInfo ? theme.textSecondary : theme.danger}
              style={styles.icon}
            />
            <View style={styles.text}>
              <View style={styles.titleRow}>
                <ThemedText variant="bodyBold" style={styles.title}>
                  {s.title}
                </ThemedText>
                {!isInfo && (
                  <ThemedText variant="small" color="textSecondary">
                    +{s.weight}
                  </ThemedText>
                )}
              </View>
              <ThemedText variant="small" color="textSecondary">
                {s.detail}
              </ThemedText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  icon: {
    marginTop: 1,
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
  },
});
