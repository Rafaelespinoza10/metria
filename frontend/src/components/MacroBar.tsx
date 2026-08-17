import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface MacroBarProps {
  label: string;
  value: number;
  target?: number | undefined;
  unit: string;
  /** Metric token color (hex). */
  color: string;
}

/** Labeled progress bar: track on white/10, fill in the metric color, animated on mount. */
export function MacroBar({ label, value, target, unit, color }: MacroBarProps) {
  const ratio = target && target > 0 ? Math.min(value / target, 1) : 0;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withTiming(ratio, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [progress, ratio]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.get() * 100}%`,
  }));

  return (
    <View>
      <View className="flex-row items-baseline justify-between">
        <Text className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
          {label}
        </Text>
        <Text className="text-sm text-content-secondary">
          <Text className="text-base font-bold text-content-primary">{value}</Text>
          {target !== undefined ? ` / ${target}` : ''} {unit}
        </Text>
      </View>
      <View className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <Animated.View
          style={[fillStyle, { backgroundColor: color }]}
          className="h-full rounded-full"
        />
      </View>
    </View>
  );
}
