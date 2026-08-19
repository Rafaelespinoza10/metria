import type { BodyPartId } from '../../components/human-body-geometry';
import type { BodyRegion } from './regions';

/**
 * Anatomical part → exercise catalog region. Laterality is deliberately collapsed: a tap
 * on either arm filters the same `biceps` region. Parts with no catalog region (the hips)
 * map to null and render dimmed.
 */
const PART_TO_REGION: Record<BodyPartId, BodyRegion | null> = {
  neck: 'neck',
  deltoid: 'shoulders',
  pectoral: 'chest',
  abdomen: 'abs',
  hip: null,
  biceps: 'biceps',
  forearm: 'forearms',
  quadriceps: 'quads',
  calf: 'calves',
  upper_back: 'back',
  triceps: 'triceps',
  glutes: 'glutes',
  hamstring: 'hamstrings',
};

export function regionForPart(part: BodyPartId): BodyRegion | null {
  return PART_TO_REGION[part];
}
