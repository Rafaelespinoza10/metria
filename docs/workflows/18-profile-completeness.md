# Workflow 18 — Profile Completeness (Body Data, Journey Stats, Export/Import)

## Objective

The profile stops being "name + language": it holds the user's body data (birth date,
height → live BMI), tells the story of their journey (member since, days tracked,
lifetime totals), and gives them ownership of their data with full JSON export and
import.

## User value

The profile becomes the identity + data-ownership center a serious health app has.

## Scope

- **Body data (backend + frontend)** — `users` gains nullable `birth_date` and
  `height_cm` (migration). `PATCH /api/users/me` accepts them; they surface in the
  profile card. The app derives **age** and **BMI** (latest weight ÷ height²) client-side
  — displayed as data, never as medical judgment.
- **Journey stats (backend + frontend)** — `GET /api/users/me/stats`: member-since date,
  distinct days tracked (any log), lifetime counts (meals, workouts, sleep nights,
  measurements, progress photos) and total steps. Rendered as a stats grid on Settings.
- **Export (backend + frontend)** — `GET /api/users/me/export`: one JSON document with
  profile, goals, daily targets, measurements (with type keys), meals + items, activity,
  sleep, and workouts + exercises/sets. Frontend saves it via expo-file-system and hands
  it to the share sheet (expo-sharing).
- **Import (backend + frontend)** — `POST /api/users/me/import` accepts that same JSON
  (Zod-validated, 10 MB route-specific body limit): day-unique data (activity, sleep)
  upserts/skips existing days; list data (meals, workouts, measurements, goals) appends.
  Returns per-collection imported counts. Frontend picks the file with
  expo-document-picker and shows the result summary.

### Decisions

- **Import appends** (except day-unique tables, which skip existing days) — merging
  heuristics for meals/workouts are not worth the complexity; the export→import loop is
  for device migration and backup restore onto a fresh account.
- Exported `localDate`s are recomputed from timestamps + the user's timezone on import
  (same rule as live writes), so imports stay consistent with bucketing.
- No avatar upload yet (storage port is ready; deferred).
- Coordination: session 55754 owns measurements/* + navigation/types.ts right now — this
  workflow adds **no routes** (everything lives in Settings) and only additive
  `settings.*` locale keys.

## Non-goals

- No third-party importers (Apple Health, Google Fit, CSV) — only Metria's own format.
- No scheduled/automatic backups.

## Data model involved

`users` (+2 nullable columns, migration 0003); read-only over everything else.

## Backend tasks

- [x] Migration: `birth_date date`, `height_cm numeric(5,2)`; PublicUser + profile
      schema updates (birthDate past ISO date ≥1900; heightCm 50–250).
- [x] `GET /api/users/me/stats` (SQL counts, distinct tracked days, total steps).
- [x] `GET /api/users/me/export` (full document) and `POST /api/users/me/import`
      (Zod-validated, day-unique dedupe, per-collection counts, 10 MB limit).
- [x] Integration tests (see Tests).

## Frontend tasks

- [x] Settings v2: journey stats grid, body-data editor (birth date, height) with live
      age + BMI chips, export button (file → share sheet), import button (document
      picker → result summary), app-version row.
- [x] en/es strings; Jest test for the BMI/age helpers.

## API contracts

All `(auth)`, standard envelope.

```text
PATCH /api/users/me              body += { birthDate?, heightCm? }
GET   /api/users/me/stats        200 → { memberSince, daysTracked, totals: { meals,
                                   workouts, sleepNights, measurements, photos, steps } }
GET   /api/users/me/export       200 → { version: 1, exportedAt, profile, goals,
                                   dailyTargets, measurementTypes, measurements, meals,
                                   activity, sleep, workouts }
POST  /api/users/me/import       200 → { imported: { goals, measurements, meals,
                                   activity, sleep, workouts } }   400 invalid document
```

## Validation rules

- birthDate: ISO date, between 1900-01-01 and today; heightCm 50–250.
- Import document: `version: 1`; every collection optional; entries validated with the
  same bounds as live writes; unknown fields ignored.

## Security considerations

- Export/import scoped to the authenticated user only; import never touches other users'
  data and never imports emails/roles.
- Import is size-capped (10 MB) and fully validated before any write.

## Acceptance criteria

- Editing height/birth date persists and BMI/age render from real data.
- Stats match seeded counts; export → import on a fresh account restores meals,
  workouts, sleep, activity, measurements, and goals with correct counts.
- All CI checks green in both apps.

## Tests

Backend: profile fields round-trip + validation; stats counts vs seeded data; export
shape; export→import round-trip counts and visibility; sleep/activity day dedupe on
re-import; invalid document 400. Frontend: BMI + age helper units.

## Definition of done

- [x] Acceptance criteria pass locally and in CI; checklists updated; summary reported.
