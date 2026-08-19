/**
 * Anatomy of the shared body figure on a 200 × 430 viewBox, built on the 8-head canon:
 * the head is ~1/8 of the height, the crotch sits at half the height so the legs read as
 * legs, the shoulder span is about two head widths, and the waist is narrower than both
 * the shoulders and the hips.
 *
 * Paired limbs are authored once on the figure's right side (x > 100, the viewer's left)
 * and mirrored, so the two sides can never drift apart.
 *
 * Under the muscle groups sits a flat "filler" layer (`FILLER_CAPSULES`): the groups are
 * separate shapes, and without it the seams between them would show the page background
 * through the body. The capsules are inset so they only ever fill seams.
 */

export const BODY_VIEW_WIDTH = 200;
export const BODY_VIEW_HEIGHT = 430;
const CENTER_X = BODY_VIEW_WIDTH / 2;
/** The 8-head canon's hip line: legs get the bottom half of the figure. */
export const CROTCH_Y = BODY_VIEW_HEIGHT / 2;

export const BODY_PART_IDS = [
  'neck',
  'deltoid',
  'pectoral',
  'abdomen',
  'hip',
  'biceps',
  'forearm',
  'quadriceps',
  'calf',
  'upper_back',
  'triceps',
  'glutes',
  'hamstring',
] as const;

export type BodyPartId = (typeof BODY_PART_IDS)[number];

export type Laterality = 'left' | 'right' | 'center';

export type BodySide = 'front' | 'back';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BodyPartShape {
  part: BodyPartId;
  laterality: Laterality;
  /** SVG path in view coordinates (already mirrored when `laterality` is 'left'). */
  d: string;
  box: Box;
  /** Where a value badge for this part is pinned. */
  anchor: { x: number; y: number };
}

interface PartSource {
  part: BodyPartId;
  d: string;
  box: Box;
  anchor: { x: number; y: number };
}

/** Mirrors an x coordinate across the figure's vertical axis. */
export function mirrorX(x: number): number {
  return BODY_VIEW_WIDTH - x;
}

/**
 * Mirrors a path's absolute coordinates. Only the commands used by this file's
 * anatomy (M, L, C, Z) appear, and every pair is absolute — a relative command
 * would silently mirror wrong, so it throws instead.
 */
export function mirrorPath(d: string): string {
  const tokens = d.match(/[A-Za-z]|-?\d+(?:\.\d+)?/g) ?? [];
  const out: string[] = [];
  let command = '';
  let coordinateIndex = 0;

  for (const token of tokens) {
    if (/[A-Za-z]/.test(token)) {
      command = token;
      coordinateIndex = 0;
      if (!'MLCZ'.includes(command)) {
        throw new Error(`mirrorPath supports absolute M/L/C/Z only, got "${command}"`);
      }
      out.push(command);
      continue;
    }
    // Even indices are x, odd are y — true for M, L, and C alike.
    const value = Number(token);
    out.push(`${coordinateIndex % 2 === 0 ? mirrorX(value) : value}`);
    coordinateIndex += 1;
  }

  return out.join(' ');
}

function center(source: PartSource): BodyPartShape {
  return { ...source, laterality: 'center' };
}

/** The authored (figure's right) shape plus its mirrored twin. */
function paired(source: PartSource): BodyPartShape[] {
  return [
    { ...source, laterality: 'right' },
    {
      part: source.part,
      laterality: 'left',
      d: mirrorPath(source.d),
      box: { ...source.box, x: mirrorX(source.box.x + source.box.w) },
      anchor: { x: mirrorX(source.anchor.x), y: source.anchor.y },
    },
  ];
}

// --- Shared anatomy (both views) ---------------------------------------------

const NECK: PartSource = {
  part: 'neck',
  d: 'M 88 50 L 112 50 C 113 62 117 71 127 78 L 73 78 C 83 71 87 62 88 50 Z',
  box: { x: 84, y: 50, w: 32, h: 28 },
  anchor: { x: 100, y: 64 },
};

const DELTOID: PartSource = {
  part: 'deltoid',
  d: 'M 113 77 C 129 77 145 84 153 97 C 158 106 158 116 156 122 C 149 111 137 103 124 99 C 118 92 115 84 113 77 Z',
  box: { x: 112, y: 76, w: 46, h: 48 },
  anchor: { x: 134, y: 98 },
};

const FOREARM: PartSource = {
  part: 'forearm',
  d: 'M 152 174 C 157 183 161 196 161 210 C 161 222 158 232 154 237 C 149 234 146 228 145 218 C 144 204 146 189 148 177 Z',
  box: { x: 144, y: 174, w: 18, h: 64 },
  anchor: { x: 153, y: 206 },
};

const CALF: PartSource = {
  part: 'calf',
  d: 'M 110 330 C 118 327 126 331 129 341 C 132 353 131 369 127 383 C 125 393 122 401 118 403 C 114 401 112 393 111 383 C 109 367 107 344 110 330 Z',
  box: { x: 107, y: 327, w: 23, h: 76 },
  anchor: { x: 119, y: 360 },
};

// --- Front view --------------------------------------------------------------

const PECTORAL: PartSource = {
  part: 'pectoral',
  d: 'M 100 77 C 113 77 124 84 131 92 C 135 100 135 116 130 128 C 121 137 111 140 100 140 C 89 140 79 137 70 128 C 65 116 65 100 69 92 C 76 84 87 80 100 82 Z',
  box: { x: 64, y: 77, w: 72, h: 63 },
  anchor: { x: 100, y: 110 },
};

const ABDOMEN: PartSource = {
  part: 'abdomen',
  d: 'M 70 128 C 79 137 89 140 100 140 C 111 140 121 137 130 128 C 131 146 128 166 126 176 C 125 182 124 186 124 190 L 76 190 C 76 186 75 182 74 176 C 72 166 69 146 70 128 Z',
  box: { x: 69, y: 128, w: 62, h: 62 },
  anchor: { x: 100, y: 160 },
};

const HIP: PartSource = {
  part: 'hip',
  d: 'M 76 190 L 124 190 C 130 197 134 208 134 217 C 132 227 124 233 114 233 C 108 227 92 227 86 233 C 76 233 68 227 66 217 C 66 208 70 197 76 190 Z',
  box: { x: 66, y: 190, w: 68, h: 44 },
  anchor: { x: 100, y: 210 },
};

const BICEPS: PartSource = {
  part: 'biceps',
  d: 'M 156 120 C 161 130 162 144 160 158 C 159 168 156 174 152 176 C 147 173 143 165 142 154 C 141 140 144 128 149 118 Z',
  box: { x: 140, y: 118, w: 22, h: 58 },
  anchor: { x: 151, y: 146 },
};

const QUADRICEPS: PartSource = {
  part: 'quadriceps',
  d: 'M 106 212 C 118 208 130 212 135 222 C 137 240 134 266 130 292 C 127 308 124 317 123 326 C 121 332 116 334 112 332 C 108 326 106 312 105 296 C 103 272 102 238 106 212 Z',
  box: { x: 102, y: 208, w: 34, h: 126 },
  anchor: { x: 119, y: 266 },
};

// --- Back view ---------------------------------------------------------------

const UPPER_BACK: PartSource = {
  part: 'upper_back',
  d: 'M 100 78 C 115 78 129 84 137 96 C 141 108 138 128 133 146 C 129 162 127 176 126 190 L 74 190 C 73 176 71 162 67 146 C 62 128 59 108 63 96 C 71 84 85 78 100 78 Z',
  box: { x: 59, y: 78, w: 82, h: 112 },
  anchor: { x: 100, y: 130 },
};

const GLUTES: PartSource = {
  part: 'glutes',
  d: 'M 76 190 L 124 190 C 131 197 135 208 135 218 C 133 228 124 235 113 233 C 108 228 92 228 87 233 C 76 235 67 228 65 218 C 65 208 69 197 76 190 Z',
  box: { x: 65, y: 190, w: 70, h: 45 },
  anchor: { x: 100, y: 210 },
};

const TRICEPS: PartSource = {
  part: 'triceps',
  d: 'M 156 120 C 161 130 163 144 161 158 C 160 168 156 174 152 176 C 147 173 143 165 142 154 C 141 140 144 128 149 118 Z',
  box: { x: 140, y: 118, w: 23, h: 58 },
  anchor: { x: 151, y: 146 },
};

const HAMSTRING: PartSource = {
  part: 'hamstring',
  d: 'M 107 214 C 119 210 131 214 136 224 C 138 242 135 268 131 294 C 128 310 125 319 124 328 C 122 334 117 336 113 334 C 109 328 107 314 106 298 C 104 274 103 240 107 214 Z',
  box: { x: 103, y: 210, w: 34, h: 126 },
  anchor: { x: 120, y: 268 },
};

// Paint order: the torso stack first, then the limbs that overlap it (arms sit over the
// deltoid–chest seam), each group running head to toe.
export const FRONT_PARTS: BodyPartShape[] = [
  center(NECK),
  center(PECTORAL),
  center(ABDOMEN),
  center(HIP),
  ...paired(DELTOID),
  ...paired(BICEPS),
  ...paired(FOREARM),
  ...paired(QUADRICEPS),
  ...paired(CALF),
];

export const BACK_PARTS: BodyPartShape[] = [
  center(NECK),
  center(UPPER_BACK),
  center(GLUTES),
  ...paired(DELTOID),
  ...paired(TRICEPS),
  ...paired(FOREARM),
  ...paired(HAMSTRING),
  ...paired(CALF),
];

export function partsForSide(side: BodySide): BodyPartShape[] {
  return side === 'front' ? FRONT_PARTS : BACK_PARTS;
}

/** Head, hands, and feet: they complete the silhouette but are never tappable. */
export interface DecorShape {
  d: string;
  /** Softer fill for shapes that are not muscle groups. */
  tone: 'skin' | 'joint';
}

const HEAD: DecorShape = {
  tone: 'skin',
  d: 'M 100 8 C 112 8 120 18 120 31 C 120 44 112 58 100 62 C 88 58 80 44 80 31 C 80 18 88 8 100 8 Z',
};

const HAND: DecorShape = {
  tone: 'skin',
  d: 'M 154 234 C 160 234 164 241 164 250 C 164 259 160 265 154 265 C 148 265 145 259 145 250 C 145 241 148 234 154 234 Z',
};

const FOOT: DecorShape = {
  tone: 'skin',
  d: 'M 111 398 L 127 398 C 131 405 136 414 136 419 C 136 423 132 424 126 424 L 112 424 C 108 424 106 419 107 411 Z',
};

function mirrorDecor(shape: DecorShape): DecorShape {
  return { ...shape, d: mirrorPath(shape.d) };
}

export const DECOR_SHAPES: DecorShape[] = [HEAD, HAND, mirrorDecor(HAND), FOOT, mirrorDecor(FOOT)];

/**
 * Flat shapes painted under everything so the seams between muscle groups read as
 * creases in one body instead of gaps. Inset from the outlines above, never outside them.
 */
export const FILLER_CAPSULES: { x: number; y: number; w: number; h: number; rx: number }[] = [
  { x: 78, y: 56, w: 44, h: 160, rx: 18 }, // trunk, neck to hips
  { x: 88, y: 196, w: 24, h: 46, rx: 10 }, // pelvis, down to the inner thighs
  { x: 147, y: 100, w: 10, h: 152, rx: 5 }, // arm, deltoid to wrist
  { x: mirrorX(157), y: 100, w: 10, h: 152, rx: 5 },
  { x: 112, y: 212, w: 14, h: 192, rx: 7 }, // leg, hip to ankle
  { x: mirrorX(126), y: 212, w: 14, h: 192, rx: 7 },
];

/** Soft occlusion blobs painted over the joints so limbs read as attached, not stacked. */
export const JOINT_SHADES: { cx: number; cy: number; r: number }[] = [
  { cx: 136, cy: 102, r: 19 },
  { cx: mirrorX(136), cy: 102, r: 19 },
  { cx: 152, cy: 176, r: 12 },
  { cx: mirrorX(152), cy: 176, r: 12 },
  { cx: 118, cy: 330, r: 15 },
  { cx: mirrorX(118), cy: 330, r: 15 },
  { cx: CENTER_X, cy: CROTCH_Y, r: 24 },
];
