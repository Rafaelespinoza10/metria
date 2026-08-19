import { BACK_PARTS, FRONT_PARTS, type BodyPartShape } from '../../components/human-body-geometry';
import { measurementKeyForPart, NON_SITE_TYPE_KEYS } from './measurement-sites';

/** The system measurement types seeded by backend/src/database/seed.ts. */
const SEEDED_TYPE_KEYS = [
  'weight',
  'body_fat',
  'neck',
  'shoulders',
  'chest',
  'waist',
  'hips',
  'left_biceps',
  'right_biceps',
  'left_triceps',
  'right_triceps',
  'left_forearm',
  'right_forearm',
  'left_thigh',
  'right_thigh',
  'left_calf',
  'right_calf',
];

function keysFor(parts: BodyPartShape[]): string[] {
  return parts
    .map((part) => measurementKeyForPart(part.part, part.laterality))
    .filter((key): key is string => key !== null);
}

describe('measurementKeyForPart', () => {
  it('reaches every anatomical seeded type across the two views', () => {
    const reachable = new Set([...keysFor(FRONT_PARTS), ...keysFor(BACK_PARTS)]);
    const anatomical = SEEDED_TYPE_KEYS.filter(
      (key) => !NON_SITE_TYPE_KEYS.includes(key as (typeof NON_SITE_TYPE_KEYS)[number]),
    );
    expect([...reachable].sort()).toEqual([...anatomical].sort());
  });

  it('never invents a key outside the seeded types', () => {
    for (const key of [...keysFor(FRONT_PARTS), ...keysFor(BACK_PARTS)]) {
      expect(SEEDED_TYPE_KEYS).toContain(key);
    }
  });

  it('resolves left and right limbs to distinct types', () => {
    expect(measurementKeyForPart('biceps', 'left')).toBe('left_biceps');
    expect(measurementKeyForPart('biceps', 'right')).toBe('right_biceps');
    expect(measurementKeyForPart('calf', 'left')).not.toBe(measurementKeyForPart('calf', 'right'));
  });

  it('maps front thighs and back hamstrings to the same girth', () => {
    expect(measurementKeyForPart('quadriceps', 'left')).toBe('left_thigh');
    expect(measurementKeyForPart('hamstring', 'left')).toBe('left_thigh');
  });

  it('ignores laterality for single-circumference sites', () => {
    expect(measurementKeyForPart('abdomen', 'center')).toBe('waist');
    expect(measurementKeyForPart('deltoid', 'left')).toBe('shoulders');
    expect(measurementKeyForPart('deltoid', 'right')).toBe('shoulders');
    expect(measurementKeyForPart('glutes', 'center')).toBe('hips');
  });

  it('returns null for parts with no tape measurement and for ambiguous limbs', () => {
    expect(measurementKeyForPart('upper_back', 'center')).toBeNull();
    expect(measurementKeyForPart('biceps', 'center')).toBeNull();
  });
});
