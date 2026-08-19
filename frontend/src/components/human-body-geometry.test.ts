import {
  BACK_PARTS,
  BODY_VIEW_HEIGHT,
  BODY_VIEW_WIDTH,
  FRONT_PARTS,
  mirrorPath,
  mirrorX,
  partsForSide,
  type BodyPartShape,
} from './human-body-geometry';

function coordinates(d: string): number[] {
  return (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

describe('mirrorPath', () => {
  it('mirrors x coordinates and leaves y untouched', () => {
    expect(mirrorPath('M 150 20 L 160 40 Z')).toBe('M 50 20 L 40 40 Z');
  });

  it('mirrors every coordinate pair of a cubic curve', () => {
    expect(mirrorPath('C 120 10 130 20 140 30')).toBe('C 80 10 70 20 60 30');
  });

  it('is its own inverse', () => {
    const d = FRONT_PARTS[1]?.d ?? '';
    expect(mirrorPath(mirrorPath(d))).toBe(d.replace(/\s+/g, ' ').trim());
  });

  it('rejects relative commands rather than mirroring them wrong', () => {
    expect(() => mirrorPath('m 10 10 l 5 5')).toThrow(/absolute/);
  });
});

describe('body parts', () => {
  const allParts = [...FRONT_PARTS, ...BACK_PARTS];

  it('exposes both views through partsForSide', () => {
    expect(partsForSide('front')).toBe(FRONT_PARTS);
    expect(partsForSide('back')).toBe(BACK_PARTS);
  });

  it('pairs every limb as one left and one right', () => {
    for (const parts of [FRONT_PARTS, BACK_PARTS]) {
      const paired = parts.filter((part) => part.laterality !== 'center');
      const lefts = paired.filter((part) => part.laterality === 'left').map((part) => part.part);
      const rights = paired.filter((part) => part.laterality === 'right').map((part) => part.part);
      expect(lefts.sort()).toEqual(rights.sort());
    }
  });

  it('mirrors paired limbs across the figure axis', () => {
    for (const parts of [FRONT_PARTS, BACK_PARTS]) {
      const rights = parts.filter((part) => part.laterality === 'right');
      for (const right of rights) {
        const left = parts.find(
          (part) => part.part === right.part && part.laterality === 'left',
        ) as BodyPartShape;
        expect(left.anchor.x).toBe(mirrorX(right.anchor.x));
        expect(left.anchor.y).toBe(right.anchor.y);
        expect(left.box.w).toBe(right.box.w);
        // The mirrored box starts where the original one ended, measured from the edge.
        expect(left.box.x + left.box.w).toBe(mirrorX(right.box.x));
      }
    }
  });

  it('keeps centered parts on the axis', () => {
    for (const part of allParts.filter((candidate) => candidate.laterality === 'center')) {
      expect(part.anchor.x).toBe(BODY_VIEW_WIDTH / 2);
    }
  });

  it('anchors every badge inside its own part box', () => {
    for (const part of allParts) {
      expect(part.anchor.x).toBeGreaterThanOrEqual(part.box.x);
      expect(part.anchor.x).toBeLessThanOrEqual(part.box.x + part.box.w);
      expect(part.anchor.y).toBeGreaterThanOrEqual(part.box.y);
      expect(part.anchor.y).toBeLessThanOrEqual(part.box.y + part.box.h);
    }
  });

  it('keeps every outline inside the viewBox', () => {
    for (const part of allParts) {
      const values = coordinates(part.d);
      const xs = values.filter((_, index) => index % 2 === 0);
      const ys = values.filter((_, index) => index % 2 === 1);
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...xs)).toBeLessThanOrEqual(BODY_VIEW_WIDTH);
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...ys)).toBeLessThanOrEqual(BODY_VIEW_HEIGHT);
    }
  });

  it('paints the torso before the limbs that overlap it, each group head to toe', () => {
    for (const parts of [FRONT_PARTS, BACK_PARTS]) {
      const lastTorsoIndex = parts.reduce(
        (last, part, index) => (part.laterality === 'center' ? index : last),
        -1,
      );
      const firstLimbIndex = parts.findIndex((part) => part.laterality !== 'center');
      expect(lastTorsoIndex).toBeLessThan(firstLimbIndex);

      const torsoTops = parts.slice(0, firstLimbIndex).map((part) => part.box.y);
      const limbTops = parts.slice(firstLimbIndex).map((part) => part.box.y);
      expect(torsoTops).toEqual([...torsoTops].sort((a, b) => a - b));
      expect(limbTops).toEqual([...limbTops].sort((a, b) => a - b));
    }
  });
});
