/** Body regions — must stay in sync with the backend catalog's BODY_REGIONS. */
export const BODY_REGIONS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'neck',
] as const;

export type BodyRegion = (typeof BODY_REGIONS)[number];

/** Regions reachable from each side of the body map. */
export const FRONT_REGIONS: BodyRegion[] = [
  'neck',
  'shoulders',
  'chest',
  'biceps',
  'forearms',
  'abs',
  'quads',
  'calves',
];

export const BACK_REGIONS: BodyRegion[] = [
  'neck',
  'shoulders',
  'back',
  'triceps',
  'forearms',
  'glutes',
  'hamstrings',
  'calves',
];
