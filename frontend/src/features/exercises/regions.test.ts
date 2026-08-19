import { BACK_REGIONS, BODY_REGIONS, FRONT_REGIONS } from './regions';

describe('body regions', () => {
  it('front and back views together cover every catalog region', () => {
    const covered = new Set([...FRONT_REGIONS, ...BACK_REGIONS]);
    expect([...covered].sort()).toEqual([...BODY_REGIONS].sort());
  });

  it('views only contain known regions', () => {
    const known = new Set<string>(BODY_REGIONS);
    for (const region of [...FRONT_REGIONS, ...BACK_REGIONS]) {
      expect(known.has(region)).toBe(true);
    }
  });
});
