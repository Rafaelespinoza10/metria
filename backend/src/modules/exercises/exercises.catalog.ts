import { readFileSync } from 'node:fs';
import { z } from 'zod';

/** Dataset: free-exercise-db (github.com/yuhonas/free-exercise-db), released under
 *  the Unlicense (public domain). Vendored because the originally requested
 *  ExerciseDB API became paywalled; exercise catalogs change rarely, so static
 *  data keeps this deterministic and offline-safe. Images stay remote. */
const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

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

/** Primary-muscle names in the dataset → tappable body-map region. */
const REGION_MUSCLES: Record<BodyRegion, string[]> = {
  chest: ['chest'],
  back: ['lats', 'middle back', 'lower back', 'traps'],
  shoulders: ['shoulders'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearms: ['forearms'],
  abs: ['abdominals'],
  quads: ['quadriceps', 'adductors', 'abductors'],
  hamstrings: ['hamstrings'],
  glutes: ['glutes'],
  calves: ['calves'],
  neck: ['neck'],
};

const rawExerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  level: z.enum(['beginner', 'intermediate', 'expert']),
  equipment: z.string().nullable(),
  primaryMuscles: z.array(z.string()),
  secondaryMuscles: z.array(z.string()),
  instructions: z.array(z.string()),
  images: z.array(z.string()),
});

export interface CatalogExercise {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'expert';
  equipment: string | null;
  region: BodyRegion;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  imageUrls: string[];
}

function muscleRegion(muscles: string[]): BodyRegion | null {
  for (const [region, regionMuscles] of Object.entries(REGION_MUSCLES)) {
    if (muscles.some((muscle) => regionMuscles.includes(muscle))) {
      return region as BodyRegion;
    }
  }
  return null;
}

/** Loads and indexes the vendored dataset once per process. */
export class ExerciseCatalog {
  private readonly byRegion = new Map<BodyRegion, CatalogExercise[]>();
  private readonly byId = new Map<string, CatalogExercise>();

  constructor() {
    const raw = JSON.parse(
      readFileSync(new URL('./data/exercises.json', import.meta.url), 'utf8'),
    ) as unknown;
    const parsed = z.array(rawExerciseSchema).parse(raw);

    for (const region of BODY_REGIONS) this.byRegion.set(region, []);
    for (const entry of parsed) {
      const region = muscleRegion(entry.primaryMuscles);
      if (!region) continue; // cardio/stretch entries without a mapped muscle
      const exercise: CatalogExercise = {
        id: entry.id,
        name: entry.name,
        level: entry.level,
        equipment: entry.equipment,
        region,
        primaryMuscles: entry.primaryMuscles,
        secondaryMuscles: entry.secondaryMuscles,
        instructions: entry.instructions,
        imageUrls: entry.images.map((path) => `${IMAGE_BASE}${path}`),
      };
      this.byRegion.get(region)?.push(exercise);
      this.byId.set(exercise.id, exercise);
    }
    // Beginner-friendly first within each region, then alphabetical.
    const levelOrder = { beginner: 0, intermediate: 1, expert: 2 };
    for (const list of this.byRegion.values()) {
      list.sort(
        (a, b) => levelOrder[a.level] - levelOrder[b.level] || a.name.localeCompare(b.name),
      );
    }
  }

  regions(): { key: BodyRegion; count: number }[] {
    return BODY_REGIONS.map((key) => ({ key, count: this.byRegion.get(key)?.length ?? 0 }));
  }

  list(
    region: BodyRegion,
    filter: { search?: string | undefined; level?: CatalogExercise['level'] | undefined },
    limit: number,
  ): CatalogExercise[] {
    let results = this.byRegion.get(region) ?? [];
    if (filter.level) results = results.filter((exercise) => exercise.level === filter.level);
    if (filter.search) {
      const needle = filter.search.toLowerCase();
      results = results.filter((exercise) => exercise.name.toLowerCase().includes(needle));
    }
    return results.slice(0, limit);
  }

  findById(id: string): CatalogExercise | undefined {
    return this.byId.get(id);
  }
}
