import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { riskTint } from '@/theme';
import type { Signal } from '@/utils/risk/types';
import { cn } from '@/utils/cn';

type ListedSignal = Pick<Signal, 'id' | 'title' | 'weight'> & { detail?: string };

/** Each risk indicator with its plain-language explanation, as rows in one lavender card. */
export function SignalList({ signals }: { signals: ListedSignal[] }) {
  const theme = useTheme();
  const indicators = [...signals].sort((a, b) => b.weight - a.weight);

  return (
    <View className="rounded-lg bg-surface px-md">
      {indicators.map((s, i) => {
        const isInfo = s.weight === 0;
        return (
          <View
            key={s.id}
            className={cn('flex-row gap-md py-md', i > 0 && 'border-t border-border')}
            accessible
            accessibilityLabel={`${isInfo ? 'Note' : 'Risk indicator'}: ${s.title}.${s.detail ? ` ${s.detail}` : ''}`}>
            <View
              className="h-8 w-8 items-center justify-center rounded-pill bg-surface-selected"
              // Indicators get a soft red circle; notes stay neutral.
              style={isInfo ? undefined : { backgroundColor: riskTint('high') }}>
              <Ionicons
                name={isInfo ? 'information' : 'alert'}
                size={18}
                // Icon colors are props, so they need the raw value.
                color={isInfo ? theme.textSecondary : theme.danger}
              />
            </View>
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
