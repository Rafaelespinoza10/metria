# Workflow 07 — Activity and Workouts

## Objective

Users can record daily activity (steps, active minutes, notes) with per-day targets, and
register complete gym workouts (exercises → sets with reps/weight/RPE) preserving history
for future progression views.

## User value

Completes the movement half of a tracked day; workout history becomes the base for
progression analytics later.

## Scope

- **Activity (backend + frontend)** — one entry per user per local day (steps, active
  minutes, notes), written via idempotent PUT on the date; ranged listing for future
  aggregation. Targets for steps / active minutes through the existing
  `DailyTargetsRepository` (e.g. 10,000 steps/day, 45 active minutes/day).
- **Workouts (backend + frontend)** — workout (name, performedAt, duration, notes) with
  ordered exercises (name, muscle group) and ordered sets (repetitions, weight kg,
  optional RPE 1–10, notes). Transactional create/update (update replaces the exercise
  tree); soft delete; list by date range.
- Frontend: Activity day screen (steps hero vs target, active minutes, inline edit),
  activity targets screen; Workouts list + add-workout screen with a nested
  exercise/set editor; Home quick actions.

### Decisions

- **Activity is date-keyed by the client's local day** (the mobile app sends its own
  `YYYY-MM-DD`); the server never re-derives it — matches the manual-entry model and the
  `UNIQUE (user_id, local_date)` constraint.
- **Workout updates replace the whole exercise tree** — same editor semantics as meals.
- No exercise catalog — names are free-form for MVP.

## Non-goals

- No Apple Health / Google Health Connect (the `source` column keeps room).
- No strength analytics or progression charts (Workflow 09+).
- No workout templates or exercise library.

## Data model involved

`activity_entries`, `workouts`, `workout_exercises`, `workout_sets`, `daily_targets`
(all migrated in 02).

## Backend tasks

- [x] `modules/activity/`: repository (upsert per day, ranged list), service, controller,
      routes, schemas; targets via `DailyTargetsRepository`.
- [x] `modules/workouts/`: repository (transactional nested create/update, ranged list),
      service, controller, routes, schemas.
- [x] Integration tests (see Tests).

## Frontend tasks

- [x] `features/activity`: day screen (steps hero + minutes, inline editing, day nav) and
      targets screen.
- [x] `features/workouts`: list screen + add-workout screen with nested exercise/set
      editor.
- [x] Home quick-action rows; en/es strings; Jest tests for helpers + a component.

## API contracts

All `(auth)`, standard envelope.

```text
Activity
GET /api/activity/entries?from&to          200 → { entries: [...] }
GET /api/activity/entries/:date            200 → { entry }        (zeros if none)
PUT /api/activity/entries/:date            200 → { entry }        (upsert)
GET /api/activity/targets                  200 → { targets: { steps?, active_minutes? } }
PUT /api/activity/targets                  200 → { targets }      (upserts today)

Workouts
GET    /api/workouts?from&to               200 → { workouts: [...] }  (with exercises/sets)
POST   /api/workouts                       201 → { workout }
GET    /api/workouts/:id                   200 → { workout }      404 if not owner
PATCH  /api/workouts/:id                   200 → { workout }      (exercise tree replaces)
DELETE /api/workouts/:id                   200 → { deleted: true }    (soft)
```

## Validation rules

- Activity: date param ISO date (not future); steps 0–200000 int; activeMinutes 0–1440
  int; notes ≤ 500. Targets: steps 1–200000, active_minutes 1–1440.
- Workout: name 1–120; performedAt ISO datetime ≤ now + 5 min; duration 1–1440 optional;
  exercises 1–30, each name 1–120, muscleGroup ≤ 60 optional, sets 1–30; set: repetitions
  1–500 int, weightKg 0–1000 optional, rpe 1–10 optional, notes ≤ 200.

## Security considerations

- All queries scoped by `userId`; foreign workouts answer 404.
- Nested writes are transactional — no orphan exercises/sets.

## Acceptance criteria

- A user can set today's steps/minutes, correct them (idempotent PUT), and define
  activity targets.
- A user can register a workout with several exercises and sets, edit it, and delete it.
- All CI checks green in both apps.

## Tests

Backend integration: activity upsert + same-day overwrite + unique-day guarantee + ranged
list + targets; workout nested create (order preserved), list range, update replaces
tree, soft delete, cross-user 404, validation failures (rpe > 10, zero reps, no
exercises). Frontend Jest: workout draft helpers; activity/steps formatting component.

## Definition of done

- [x] Acceptance criteria pass locally and in CI; checklists updated; summary reported.
