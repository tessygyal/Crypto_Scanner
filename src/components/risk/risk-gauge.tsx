import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { riskColors } from '@/theme';
import type { RiskLevel } from '@/utils/risk/types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 200;
const STROKE = 16;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * A ring that fills to the risk score (0–100, higher = more risk indicators),
 * with the number in the middle. The fill animates in, and appears instantly
 * when the phone's "reduce motion" setting is on. Hidden from screen readers:
 * the summary around it reads out the level and score.
 */
export function RiskGauge({ level, score }: { level: RiskLevel; score: number }) {
  const theme = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.max(0, Math.min(100, score)) / 100, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [progress, score]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  return (
    <View
      className="items-center justify-center self-center"
      style={{ width: SIZE, height: SIZE }}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden>
      {/* Rotated so the ring starts at 12 o'clock. */}
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={theme.surface} strokeWidth={STROKE} fill="none" />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={riskColors[level]}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={arcProps}
        />
      </Svg>
      <View className="absolute items-center">
        <ThemedText className="text-[56px] font-extrabold leading-[60px] tabular-nums">{score}</ThemedText>
        <ThemedText variant="smallBold" color="textSecondary">
          risk score / 100
        </ThemedText>
      </View>
    </View>
  );
}
