import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Rect } from 'react-native-svg';
import { barRatio, niceUpperBound } from '../features/progress/chart-helpers';
import { theme } from '../theme';

export interface TrendChartProps {
  /** One value per day, oldest → newest. */
  values: number[];
  /** Same length as `values`; null = unlabeled slot. */
  labels: (string | null)[];
  target: number | null;
  /** Metric color for the bars. */
  color: string;
  height?: number;
}

const ZERO_STUB_HEIGHT = 3;
const TRACK = 'rgba(0, 0, 0, 0.08)';

/**
 * Single-series daily bar chart: thin rounded bars anchored to the baseline,
 * zero days as track-colored stubs (present, not gaps), and a dashed target
 * line overlaid outside the mount animation so it never stretches.
 */
export function TrendChart({ values, labels, target, color, height = 132 }: TrendChartProps) {
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);

  // Re-grow from the baseline whenever the series changes (metric/window switch).
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [values, progress]);

  const growStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: progress.value }] }));

  const bound = niceUpperBound(values, target);
  const gap = values.length > 14 ? 3 : 6;
  const barWidth =
    values.length > 0 ? Math.max(2, (width - gap * (values.length - 1)) / values.length) : 0;
  const radius = Math.min(4, barWidth / 2);
  const targetY = target !== null && target > 0 ? height * (1 - barRatio(target, bound)) : null;
  const sparse = labels.some((label) => label === null);

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View style={{ height }}>
        {width > 0 ? (
          <>
            <Animated.View style={[growStyle, { transformOrigin: 'bottom' }]}>
              <Svg width={width} height={height}>
                {values.map((value, index) => {
                  const barHeight = Math.max(barRatio(value, bound) * height, ZERO_STUB_HEIGHT);
                  return (
                    <Rect
                      key={index}
                      x={index * (barWidth + gap)}
                      y={height - barHeight}
                      width={barWidth}
                      height={barHeight}
                      rx={radius}
                      fill={value > 0 ? color : TRACK}
                    />
                  );
                })}
              </Svg>
            </Animated.View>
            {targetY !== null ? (
              <View
                pointerEvents="none"
                style={{ position: 'absolute', top: targetY - 1, left: 0, right: 0 }}
              >
                <Svg width={width} height={2}>
                  <Line
                    x1={0}
                    y1={1}
                    x2={width}
                    y2={1}
                    stroke={theme.colors.content.tertiary}
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                  />
                </Svg>
              </View>
            ) : null}
          </>
        ) : null}
      </View>
      {sparse ? (
        <View className="mt-2 flex-row justify-between">
          {labels
            .filter((label): label is string => label !== null)
            .map((label, index) => (
              <Text key={`${label}-${index}`} className="text-xs text-content-tertiary">
                {label}
              </Text>
            ))}
        </View>
      ) : (
        <View className="mt-2 flex-row">
          {labels.map((label, index) => (
            <Text key={index} className="flex-1 text-center text-xs text-content-tertiary">
              {label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}
