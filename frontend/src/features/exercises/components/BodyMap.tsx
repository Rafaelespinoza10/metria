import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, Rect } from 'react-native-svg';
import { Chip } from '../../../components/Chip';
import { theme } from '../../../theme';
import type { BodyRegion } from '../regions';

export type BodySide = 'front' | 'back';

interface BodyMapProps {
  side: BodySide;
  onSideChange: (side: BodySide) => void;
  selected: BodyRegion | null;
  onSelect: (region: BodyRegion) => void;
}

const IDLE = '#EAE2D5';
const IDLE_STROKE = '#DCD2C2';
const DECOR = '#F0E9DE';

interface RegionShape {
  region: BodyRegion;
  kind: 'rect' | 'ellipse';
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
}

function mirrored(shape: Omit<RegionShape, 'x'> & { x: number }): RegionShape[] {
  // Mirror around the vertical center (x = 100) for paired limbs.
  return [shape, { ...shape, x: 200 - shape.x - shape.w }];
}

const FRONT_SHAPES: RegionShape[] = [
  { region: 'neck', kind: 'rect', x: 88, y: 46, w: 24, h: 18, rx: 8 },
  ...mirrored({ region: 'shoulders', kind: 'ellipse', x: 46, y: 64, w: 34, h: 22, rx: 0 }),
  { region: 'chest', kind: 'rect', x: 72, y: 66, w: 56, h: 36, rx: 14 },
  { region: 'abs', kind: 'rect', x: 76, y: 106, w: 48, h: 50, rx: 12 },
  ...mirrored({ region: 'biceps', kind: 'rect', x: 44, y: 86, w: 15, h: 44, rx: 7 }),
  ...mirrored({ region: 'forearms', kind: 'rect', x: 40, y: 134, w: 13, h: 46, rx: 6 }),
  ...mirrored({ region: 'quads', kind: 'rect', x: 76, y: 160, w: 22, h: 76, rx: 10 }),
  ...mirrored({ region: 'calves', kind: 'rect', x: 79, y: 242, w: 17, h: 62, rx: 8 }),
];

const BACK_SHAPES: RegionShape[] = [
  { region: 'neck', kind: 'rect', x: 88, y: 46, w: 24, h: 18, rx: 8 },
  ...mirrored({ region: 'shoulders', kind: 'ellipse', x: 46, y: 64, w: 34, h: 22, rx: 0 }),
  { region: 'back', kind: 'rect', x: 72, y: 66, w: 56, h: 90, rx: 14 },
  ...mirrored({ region: 'triceps', kind: 'rect', x: 44, y: 86, w: 15, h: 44, rx: 7 }),
  ...mirrored({ region: 'forearms', kind: 'rect', x: 40, y: 134, w: 13, h: 46, rx: 6 }),
  { region: 'glutes', kind: 'rect', x: 76, y: 160, w: 48, h: 32, rx: 12 },
  ...mirrored({ region: 'hamstrings', kind: 'rect', x: 76, y: 196, w: 22, h: 54, rx: 10 }),
  ...mirrored({ region: 'calves', kind: 'rect', x: 79, y: 254, w: 17, h: 56, rx: 8 }),
];

/** Tappable human figure. Regions light up in brand orange when selected. */
export function BodyMap({ side, onSideChange, selected, onSelect }: BodyMapProps) {
  const { t } = useTranslation();
  const shapes = side === 'front' ? FRONT_SHAPES : BACK_SHAPES;

  return (
    <View className="items-center">
      <View className="flex-row gap-2">
        <Chip
          label={t('exercises.front')}
          selected={side === 'front'}
          onPress={() => onSideChange('front')}
        />
        <Chip
          label={t('exercises.back')}
          selected={side === 'back'}
          onPress={() => onSideChange('back')}
        />
      </View>
      <Svg width={230} height={330} viewBox="0 0 200 320" style={{ marginTop: 12 }}>
        {/* Decorative anatomy: head, hands, feet. */}
        <Circle cx={100} cy={28} r={19} fill={DECOR} stroke={IDLE_STROKE} strokeWidth={1} />
        <Circle cx={44} cy={190} r={7} fill={DECOR} />
        <Circle cx={156} cy={190} r={7} fill={DECOR} />
        <Ellipse cx={87} cy={312} rx={10} ry={6} fill={DECOR} />
        <Ellipse cx={113} cy={312} rx={10} ry={6} fill={DECOR} />

        {shapes.map((shape, index) => {
          const isSelected = selected === shape.region;
          const fill = isSelected ? theme.colors.brand.DEFAULT : IDLE;
          const stroke = isSelected ? theme.colors.brand.dark : IDLE_STROKE;
          const press = () => onSelect(shape.region);
          if (shape.kind === 'ellipse') {
            return (
              <Ellipse
                key={`${shape.region}-${index}`}
                cx={shape.x + shape.w / 2}
                cy={shape.y + shape.h / 2}
                rx={shape.w / 2}
                ry={shape.h / 2}
                fill={fill}
                stroke={stroke}
                strokeWidth={1}
                onPress={press}
              />
            );
          }
          return (
            <Rect
              key={`${shape.region}-${index}`}
              x={shape.x}
              y={shape.y}
              width={shape.w}
              height={shape.h}
              rx={shape.rx}
              fill={fill}
              stroke={stroke}
              strokeWidth={1}
              onPress={press}
            />
          );
        })}
      </Svg>
    </View>
  );
}
