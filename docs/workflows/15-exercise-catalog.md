# Workflow 15 — Exercise Catalog and Body Map

## Objective

Registering a gym session becomes guided: the user taps a muscle region on a human body
figure and browses real exercises (name, level, equipment, photos, instructions) for
that region, powered by a vendored open-source catalog.

## User value

"What should I train / which exercises hit this muscle?" answered inside the app.

## Scope

- **Catalog (backend)** — the free-exercise-db dataset (873 exercises, Unlicense/public
  domain) vendored into `modules/exercises/data/`; the originally requested
  ExerciseDB API is now paywalled and its repo emptied, so vendoring an equivalent
  open dataset keeps the feature deterministic and offline-safe. Exercises indexed by
  **body region** (chest, back, shoulders, biceps, triceps, forearms, abs, quads,
  hamstrings, glutes, calves, neck) via a primary-muscle → region map.
  Endpoints: regions with counts, region listing (search + level filter, capped,
  no instructions), and per-exercise detail (instructions + image URLs).
- **Body map (frontend)** — tappable SVG human figure (front/back toggle) built with
  react-native-svg; selected region fills brand orange. New `ExerciseBrowser` screen:
  body map → exercise list (photo thumbnail, level, equipment) → expandable detail with
  instructions. Entry point: Home quick action.
- **Phase 2 (after the parallel Workouts redesign merges)** — wire the browser into
  AddWorkoutScreen so picking an exercise prefills name + muscle group.

### Decisions

- **Vendored data over live API**: the upstream API turned paywalled/dead mid-build;
  the dataset itself is public domain, ~1 MB server-side, and exercise catalogs change
  rarely. Exercise images stay remote (raw.githubusercontent.com) so the app bundle
  doesn't grow.
- Coordination: WorkoutsScreen/AddWorkoutScreen belong to the parallel session until its
  redesign merges — this workflow only adds new files plus Home/navigation/locales.

## Non-goals

- No custom exercise creation, no favorites, no workout templates (yet).

## Data model involved

None (static vendored dataset; no new tables).

## Backend tasks

- [x] Vendor dataset + license note; region map; `modules/exercises/` service,
      controller, routes (list capped at 50, detail with instructions + image URLs).
- [x] Integration tests: regions/counts, region filter + search + level, detail, invalid
      region 400, auth required.

## Frontend tasks

- [x] `BodyMap` SVG component (front/back, tappable regions, brand fill) + helpers.
- [x] `ExerciseBrowser` screen (map → list → expandable detail); Workouts entry points;
      en/es strings; Jest tests for the region map helper.
- [x] Phase 2: AddWorkout integration (picker mode prefills name + muscle group).

## API contracts

All `(auth)`, standard envelope.

```text
GET /api/exercises/regions            200 → { regions: [{ key, count }] }
GET /api/exercises?region=chest&search=&level=&limit=
                                      200 → { exercises: [{ id, name, level, equipment,
                                        primaryMuscles, imageUrls }] }   400 bad region
GET /api/exercises/:id                200 → { exercise: { ...list fields, instructions,
                                        secondaryMuscles } }             404 unknown
```

## Validation rules

- `region` from the region enum; `level` in beginner|intermediate|expert; `search` ≤ 60
  chars; `limit` 1–50 (default 30).

## Security considerations

- Read-only static data behind auth; no user input reaches the dataset beyond filters.

## Acceptance criteria

- Tapping every region returns exercises; search and level filters work; detail shows
  instructions and images. All CI checks green.

## Tests

Backend integration listed above. Frontend: region-map helper units.

## Definition of done

- [x] Phase 1 (catalog + browser) merged green; Phase 2 integration merged after the
      parallel Workouts redesign landed; checklists updated. (Home quick action ceded
      to the parallel Home-redesign session; entry points live in Workouts.)
