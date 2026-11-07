import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { Signal } from '@/utils/risk/types';
import { cardShadow } from '@/theme';

type ListedSignal = Pick<Signal, 'id' | 'title' | 'weight'> & { detail?: string };

/** Each risk indicator with its plain-language explanation (if there is one). */
export function SignalList({ signals }: { signals: ListedSignal[] }) {
  const theme = useTheme();
  const indicators = [...signals].sort((a, b) => b.weight - a.weight);

  return (
    <View className="gap-sm">
      {indicators.map((s) => {
        const isInfo = s.weight === 0;
        return (
          <View
            key={s.id}
            className="flex-row gap-sm rounded-lg border border-border bg-surface p-md"
            style={cardShadow}
            accessible
            accessibilityLabel={`${isInfo ? 'Note' : 'Risk indicator'}: ${s.title}.${s.detail ? ` ${s.detail}` : ''}`}>
            <Ionicons
              name={isInfo ? 'information-circle-outline' : 'alert-circle-outline'}
              size={22}
              // Icon colors are props, so they need the raw value.
              color={isInfo ? theme.textSecondary : theme.danger}
              style={{ marginTop: 1 }}
            />
            <View className="flex-1 gap-xs">
              <View className="flex-row items-start gap-sm">
                <ThemedText variant="bodyBold" className="flex-1">
                  {s.title}
                </ThemedText>
                {!isInfo && (
                  <ThemedText variant="small" color="textSecondary">
                    +{s.weight}
                  </ThemedText>
                )}
              </View>
              {s.detail ? (
                <ThemedText variant="small" color="textSecondary">
                  {s.detail}
                </ThemedText>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
