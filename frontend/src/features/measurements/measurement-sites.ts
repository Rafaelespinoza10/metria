import type { BodyPartId, Laterality } from '../../components/human-body-geometry';

/**
 * Anatomical part → seeded measurement type key. Circumferences taken once (neck,
 * shoulders, chest, waist, hips) ignore laterality; limb girths resolve to the
 * `left_`/`right_` type so the two arms and legs are tracked separately.
 *
 * `weight` and `body_fat` are not sites on the body and are chosen from chips instead.
 */
const CENTER_SITES: Partial<Record<BodyPartId, string>> = {
  neck: 'neck',
  deltoid: 'shoulders',
  pectoral: 'chest',
  abdomen: 'waist',
  hip: 'hips',
  glutes: 'hips',
};

const PAIRED_SITES: Partial<Record<BodyPartId, string>> = {
  biceps: 'biceps',
  triceps: 'triceps',
  forearm: 'forearm',
  quadriceps: 'thigh',
  hamstring: 'thigh',
  calf: 'calf',
};

/** Measurement types that exist but are not anatomical sites. */
export const NON_SITE_TYPE_KEYS = ['weight', 'body_fat'] as const;

export function measurementKeyForPart(part: BodyPartId, laterality: Laterality): string | null {
  const paired = PAIRED_SITES[part];
  if (paired) {
    // A paired girth needs a side; a center tap on a limb would be ambiguous.
    return laterality === 'center' ? null : `${laterality}_${paired}`;
  }
  return CENTER_SITES[part] ?? null;
}
