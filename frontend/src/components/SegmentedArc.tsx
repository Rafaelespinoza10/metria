import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { theme } from '../theme';

export interface SegmentedArcProps {
  /** 0–1 progress. */
  ratio: number;
  size?: number;
  segments?: number;
  /** Rendered inside the arc (big number, labels). */
  children?: React.ReactNode;
}

/** How many of `total` segments light up for a 0–1 ratio (full segments only). */
export function filledSegments(ratio: number, total: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 0;
  return Math.min(total, Math.floor(ratio * total + 1e-9));
}

/** Semicircular segmented gauge (the reference's calorie arc): rounded ticks fanned
 *  over 180°, filled in brand orange, remainder on the neutral track color. */
export function SegmentedArc({ ratio, size = 220, segments = 9, children }: SegmentedArcProps) {
  const filled = filledSegments(ratio, segments);
  const center = size / 2;
  const tickWidth = size * 0.1;
  const tickHeight = size * 0.16;
  const radius = center - tickHeight / 2 - 2;
  const height = center + tickHeight / 2;

  return (
    <View style={{ width: size, height }}>
      <Svg width={size} height={height}>
        {Array.from({ length: segments }, (_, index) => {
          // Fan from 180° (left) to 0° (right).
          const angle = 180 - (index * 180) / (segments - 1);
          const rad = (angle * Math.PI) / 180;
          const x = center + radius * Math.cos(rad);
          const y = center - radius * Math.sin(rad);
          return (
            <Rect
              key={index}
              x={-tickWidth / 2}
              y={-tickHeight / 2}
              width={tickWidth}
              height={tickHeight}
              rx={tickWidth / 2}
              fill={index < filled ? theme.colors.brand.DEFAULT : '#E7E0D6'}
              transform={`translate(${x}, ${y}) rotate(${90 - angle})`}
            />
          );
        })}
      </Svg>
      <View
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: size * 0.28 }}
        className="items-center justify-end"
      >
        {children}
      </View>
    </View>
  );
}
