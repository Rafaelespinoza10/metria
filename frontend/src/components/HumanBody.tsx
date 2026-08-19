import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { Chip } from './Chip';
import {
  BODY_VIEW_HEIGHT,
  BODY_VIEW_WIDTH,
  DECOR_SHAPES,
  JOINT_SHADES,
  partsForSide,
  type BodyPartId,
  type BodySide,
  type Laterality,
} from './human-body-geometry';

export type { BodySide } from './human-body-geometry';

export interface HumanBodyProps {
  side: BodySide;
  onSideChange: (side: BodySide) => void;
  /**
   * Maps an anatomical part to the caller's own key (an exercise region, a measurement
   * type). Returning null makes the part decorative: shown, dimmed, not tappable.
   */
  keyFor: (part: BodyPartId, laterality: Laterality) => string | null;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  /** Optional short value pinned to a part, e.g. a latest measurement. */
  badgeFor?: (key: string) => string | null;
  /** Reads the part name for screen readers. */
  labelFor?: (key: string) => string;
  width?: number;
}

// Volume comes from gradients in objectBoundingBox units, so one definition shades every
// part relative to its own outline — light on the inner-upper edge, dark at the contour.
const SKIN_LIGHT = '#F6F0E6';
const SKIN_MID = '#E8DFD1';
const SKIN_DARK = '#D2C6B2';
const CONTOUR = '#C7BAA5';
const DIM = '#EDE6DC';
const BADGE_TRACK = 56;
const BADGE_HEIGHT = 20;

/**
 * Shaded anatomical figure shared by the exercise browser and the measurement log.
 * Tapping a muscle group selects it; the caller decides what the group means.
 */
export function HumanBody({
  side,
  onSideChange,
  keyFor,
  selectedKey,
  onSelect,
  badgeFor,
  labelFor,
  width = 250,
}: HumanBodyProps) {
  const { t } = useTranslation();
  const parts = partsForSide(side);
  const height = (width * BODY_VIEW_HEIGHT) / BODY_VIEW_WIDTH;
  const scale = width / BODY_VIEW_WIDTH;

  const badges = badgeFor
    ? parts.flatMap((part) => {
        const key = keyFor(part.part, part.laterality);
        const value = key ? badgeFor(key) : null;
        return value ? [{ id: `${part.part}-${part.laterality}`, anchor: part.anchor, value }] : [];
      })
    : [];

  return (
    <View className="items-center">
      <View className="flex-row gap-2">
        <Chip
          label={t('body.front')}
          selected={side === 'front'}
          onPress={() => onSideChange('front')}
        />
        <Chip
          label={t('body.back')}
          selected={side === 'back'}
          onPress={() => onSideChange('back')}
        />
      </View>

      <View style={{ width, height, marginTop: 12 }}>
        <Svg width={width} height={height} viewBox={`0 0 ${BODY_VIEW_WIDTH} ${BODY_VIEW_HEIGHT}`}>
          <Defs>
            <LinearGradient id="skin" x1="0.2" y1="0" x2="0.9" y2="1">
              <Stop offset="0" stopColor={SKIN_LIGHT} />
              <Stop offset="0.55" stopColor={SKIN_MID} />
              <Stop offset="1" stopColor={SKIN_DARK} />
            </LinearGradient>
            <LinearGradient id="skinFlat" x1="0.2" y1="0" x2="0.9" y2="1">
              <Stop offset="0" stopColor={SKIN_MID} />
              <Stop offset="1" stopColor={SKIN_DARK} />
            </LinearGradient>
            <LinearGradient id="selected" x1="0.2" y1="0" x2="0.9" y2="1">
              <Stop offset="0" stopColor="#F7A873" />
              <Stop offset="0.5" stopColor="#F08343" />
              <Stop offset="1" stopColor="#D96A2B" />
            </LinearGradient>
            <RadialGradient id="joint" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor="#A2937C" stopOpacity="0.32" />
              <Stop offset="1" stopColor="#A2937C" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="ground" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor="#8C8070" stopOpacity="0.22" />
              <Stop offset="1" stopColor="#8C8070" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Contact shadow: the figure stands on something. */}
          <Ellipse cx={BODY_VIEW_WIDTH / 2} cy={425} rx={62} ry={9} fill="url(#ground)" />

          {DECOR_SHAPES.map((shape, index) => (
            <Path
              key={`decor-${index}`}
              d={shape.d}
              fill={shape.tone === 'skin' ? 'url(#skin)' : 'url(#skinFlat)'}
              stroke={CONTOUR}
              strokeWidth={0.8}
            />
          ))}

          {parts.map((part) => {
            const key = keyFor(part.part, part.laterality);
            const isSelected = key !== null && key === selectedKey;
            // SVG shapes take a label but no role/state, so selection is spoken in the label.
            const label =
              key && labelFor
                ? isSelected
                  ? `${labelFor(key)}, ${t('body.selected')}`
                  : labelFor(key)
                : undefined;
            return (
              <Path
                key={`${part.part}-${part.laterality}`}
                d={part.d}
                fill={isSelected ? 'url(#selected)' : key ? 'url(#skin)' : DIM}
                stroke={isSelected ? '#C15E24' : CONTOUR}
                strokeWidth={isSelected ? 1.4 : 0.8}
                opacity={key ? 1 : 0.55}
                onPress={key ? () => onSelect(key) : undefined}
                accessibilityLabel={label}
              />
            );
          })}

          {/* Occlusion over the seams, painted last so limbs read as attached. */}
          {JOINT_SHADES.map((shade, index) => (
            <Circle
              key={`joint-${index}`}
              cx={shade.cx}
              cy={shade.cy}
              r={shade.r}
              fill="url(#joint)"
            />
          ))}
        </Svg>

        {badges.map((badge) => (
          <View
            key={badge.id}
            pointerEvents="none"
            // Centered on the part's anchor: a fixed-width track, pill auto-sized inside.
            style={{
              position: 'absolute',
              left: badge.anchor.x * scale - BADGE_TRACK / 2,
              top: badge.anchor.y * scale - BADGE_HEIGHT / 2,
              width: BADGE_TRACK,
            }}
            className="items-center"
          >
            <View className="rounded-full bg-charcoal px-2 py-0.5">
              <Text className="text-[11px] font-semibold text-white">{badge.value}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
