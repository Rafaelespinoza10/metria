# Workflow 04 — Goals and Measurements

## Objective

Users can create and manage multiple simultaneous goals, record weight and the 16 body
measurements, and upload progress photos stored behind the storage abstraction.

## User value

The core "track my body" loop: set an objective, measure, and keep visual evidence.

## Scope

- **Goals (backend + frontend)** — CRUD scoped by user. Categories: lose_fat,
  gain_muscle, maintain, improve_habits. Metrics: weight, body_fat, calories, protein,
  carbohydrates, fats, steps, active_minutes, sleep_minutes, workout_frequency, or an
  individual measurement (requires `measurementTypeId`). Fields: startValue, targetValue,
  optional targetDate, status (active/achieved/abandoned).
- **Measurements (backend + frontend)** — list system types; create entries (value,
  timestamp, notes); history with type/date filters; latest value per type; edit;
  soft delete.
- **Progress photos (backend + frontend)** — multipart upload, list, soft delete.
  Files go through a `StoragePort` (local-disk driver now; S3/R2 later) under keys
  `users/<userId>/photos/<uuid>.<ext>`. Served only via an auth-gated route that
  enforces key-prefix ownership. Permanent account deletion also removes stored files.
- Frontend: Home gains a quick-actions section; Goals and Measurements features with
  designed screens per the fitness-ui-design skill; photo pick via expo-image-picker.

### Decisions

- **Goal progress is not computed here** — it arrives with the progress service
  (Workflow 09). This workflow returns raw goal fields only.
- **Target date has no mobile UI yet** (API supports it; a proper date picker lands with
  a later workflow) — avoids a low-quality free-text date field.
- **Soft-deleted photos keep their file** until permanent account deletion (cheap, and
  undelete stays possible); hard delete wipes the user's whole storage prefix.

## Non-goals

- No custom measurement types UI (schema supports them later).
- No body-trend charts or comparisons (Workflow 09).
- No S3/R2 driver — only the port + local driver.

## Data model involved

`goals`, `measurement_types`, `measurements`, `progress_photos` (all migrated in 02).

## Backend tasks

- [x] `shared/storage/`: `StoragePort` + `LocalStorageService` (save/stream/delete,
      `deleteUserFiles(userId)`), root `backend/storage/` (git-ignored).
- [x] `modules/goals/`: repository, service, controller, routes, Zod schemas.
- [x] `modules/measurements/`: types listing, entries CRUD, latest-per-type, photos
      (multer multipart, validation: jpeg/png/webp, ≤10 MB).
- [x] `modules/uploads/`: auth-gated `GET /api/uploads/*` streaming with ownership check.
- [x] Permanent user deletion also calls `deleteUserFiles`.
- [x] Integration tests (see Tests).

## Frontend tasks

- [x] `features/goals`: list screen (status chips, designed empty state) + create screen
      (category/metric selectors, values) with TanStack Query.
- [x] `features/measurements`: overview (latest per type), log entry screen, photos
      section (picker → upload → grid).
- [x] Home quick-actions rows navigating to Goals and Measurements.
- [x] `api()` support for FormData bodies (no manual Content-Type).
- [x] en/es strings for everything; Jest tests for new pure logic + a component.

## API contracts

All `(auth)`, standard envelope.

```text
Goals
GET    /api/goals?status=active            200 → { goals: [...] }
POST   /api/goals                          201 → { goal }
GET    /api/goals/:id                      200 → { goal }        404 if not owner
PATCH  /api/goals/:id                      200 → { goal }
DELETE /api/goals/:id                      200 → { deleted: true }   (soft)

Measurements
GET    /api/measurements/types             200 → { types: [...] }
GET    /api/measurements?typeId&from&to    200 → { measurements: [...] }
GET    /api/measurements/latest            200 → { latest: [{ type, measurement }] }
POST   /api/measurements                   201 → { measurement }
PATCH  /api/measurements/:id               200 → { measurement }
DELETE /api/measurements/:id               200 → { deleted: true }   (soft)

Progress photos
GET    /api/measurements/photos            200 → { photos: [...] }  (each with fileUrl)
POST   /api/measurements/photos            multipart: photo, takenAt?, notes?
                                           201 → { photo }
DELETE /api/measurements/photos/:id        200 → { deleted: true }   (soft)

Files
GET    /api/uploads/users/<uid>/...        200 stream | 401 | 404 (foreign/unknown key)
```

## Validation rules

- Goal: category/metric from enums; `measurementTypeId` required iff metric =
  `measurement` (and must exist); startValue/targetValue positive numbers ≤ 999999.99;
  targetDate ISO date; status transitions limited to the enum.
- Measurement: `typeId` must exist and be system or owned; value > 0 and < 1000 (kg/cm/%
  sanity bound); `measuredAt` ISO datetime not in the future (+5 min skew).
- Photo: mimetype jpeg/png/webp; ≤ 10 MB; `takenAt` ISO datetime.

## Security considerations

- Every query filters by `userId`; foreign resources answer 404 (not 403) to avoid
  existence leaks.
- Upload streaming validates the key prefix `users/<userId>/` against the JWT user.
- File paths never come from client input — keys are server-generated UUIDs.
- Multer memory storage with hard size limit before the storage driver runs.

## Acceptance criteria

- A user can create goals of every category, list/edit/soft-delete them, and never see
  another user's goals.
- A user can record weight + any body measurement, see history and latest values.
- A user can upload a progress photo, list it (with a working authenticated file URL),
  and soft-delete it.
- All CI checks green in both apps.

## Tests

Backend integration: goals CRUD + cross-user 404 + measurement-goal validation;
measurement create/list/latest/filters + type validation; photo upload/list/delete +
mimetype/size rejection; uploads route: owner 200, no token 401, foreign key 404.
Frontend Jest: FormData handling in `api()`, goal/measurement form helpers, one
component test.

## Definition of done

- [x] Acceptance criteria pass locally and in CI; checklists updated; summary reported.
