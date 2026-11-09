import { useEffect, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const CORNER = 'absolute h-12 w-12 border-white';

/**
 * Corner brackets and a gently moving scan line drawn over the camera preview.
 * Decorative only (hidden from screen readers). The line holds still in the
 * middle when the phone's "reduce motion" setting is on.
 */
export function ViewfinderOverlay() {
  const reduceMotion = useReducedMotion();
  const [height, setHeight] = useState(0);
  const y = useSharedValue(0);

  useEffect(() => {
    if (!height) return;
    if (reduceMotion) {
      y.value = height / 2;
      return;
    }
    y.value = 0;
    y.value = withRepeat(withTiming(height, { duration: 2200, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [height, reduceMotion, y]);

  const lineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <View
      pointerEvents="none"
      className="absolute inset-0"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden>
      <View className={`${CORNER} left-5 top-5 rounded-tl-[18px] border-l-[5px] border-t-[5px]`} />
      <View className={`${CORNER} right-5 top-5 rounded-tr-[18px] border-r-[5px] border-t-[5px]`} />
      <View className={`${CORNER} bottom-5 left-5 rounded-bl-[18px] border-b-[5px] border-l-[5px]`} />
      <View className={`${CORNER} bottom-5 right-5 rounded-br-[18px] border-b-[5px] border-r-[5px]`} />

      <View
        className="absolute inset-x-[12%] inset-y-[14%]"
        onLayout={(e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height)}>
        <Animated.View
          className="h-[3px] rounded-pill bg-[#c6a8ff]"
          style={[{ boxShadow: '0 0 14px 4px rgba(155, 107, 255, 0.55)' }, lineStyle]}
        />
      </View>
    </View>
  );
}
