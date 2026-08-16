# Workflow 02 — Database Design

## Objective

Define and implement the complete PostgreSQL schema with Drizzle ORM, plus the database
connection module and migration workflow, so feature workflows only add queries — not
tables.

## User value

None directly visible; guarantees data integrity, user scoping, and privacy mechanics
(soft delete, permanent deletion) for everything that follows.

## Scope

- Drizzle ORM + drizzle-kit setup in `backend/src/database/`.
- All MVP tables, enums, indexes, and foreign keys defined below.
- Seed for system measurement types and badge definitions.
- Migration scripts (`db:generate`, `db:migrate`) and a local dev database convention.

## Non-goals

- No feature queries or repositories (those belong to each feature workflow).
- No multi-tenant constructs beyond `userId` scoping.
- No custom measurement type UI (schema supports it; feature comes later).

## Data model involved

### Conventions

- Primary keys: `uuid` (`gen_random_uuid()`).
- All timestamps: `timestamptz` (UTC). Daily-keyed tables also store `local_date date`
  computed from the user's timezone at write time — all "per day" aggregation keys on it.
- Soft-deletable tables carry `created_at`, `updated_at`, `deleted_at`.
- Numeric measures use `numeric(6,2)` unless noted.
- Every user-owned table has `user_id uuid NOT NULL REFERENCES users(id)` and an index
  starting with `user_id`.

### Enums

```text
goal_category      lose_fat | gain_muscle | maintain | improve_habits
goal_status        active | achieved | abandoned
metric             weight | body_fat | calories | protein | carbohydrates | fats
                   | steps | active_minutes | sleep_minutes | workout_frequency | measurement
meal_category      breakfast | lunch | dinner | snack
meal_source        manual | ai_confirmed
analysis_status    pending | completed | failed | confirmed | discarded
insight_period     daily | weekly
```

### Tables

```text
users
  id uuid PK
  email text UNIQUE NOT NULL            -- unique among non-deleted (partial index)
  password_hash text NOT NULL
  name text NOT NULL
  locale text NOT NULL DEFAULT 'en'     -- 'en' | 'es'
  timezone text NOT NULL DEFAULT 'UTC'  -- IANA name; used to compute local_date
  created_at / updated_at / deleted_at

password_reset_tokens
  id uuid PK, user_id FK
  token_hash text NOT NULL
  expires_at timestamptz NOT NULL
  used_at timestamptz NULL
  created_at

goals
  id uuid PK, user_id FK
  category goal_category NOT NULL
  metric metric NOT NULL
  measurement_type_id uuid NULL FK -> measurement_types  -- when metric = 'measurement'
  start_value numeric NULL
  target_value numeric NULL         -- NULL allowed for habit-style goals
  target_date date NULL
  status goal_status NOT NULL DEFAULT 'active'
  created_at / updated_at / deleted_at
  -- current progress is computed in the progress service, never stored

measurement_types
  id uuid PK
  key text NOT NULL                 -- 'weight', 'waist', 'left_biceps', …
  unit text NOT NULL                -- 'kg' | 'cm'
  user_id uuid NULL FK              -- NULL = system type; set = future custom type
  created_at
  UNIQUE (key) WHERE user_id IS NULL; UNIQUE (user_id, key)

measurements
  id uuid PK, user_id FK
  type_id uuid FK -> measurement_types
  value numeric(6,2) NOT NULL
  measured_at timestamptz NOT NULL
  notes text NULL
  created_at / updated_at / deleted_at
  INDEX (user_id, type_id, measured_at)

progress_photos
  id uuid PK, user_id FK
  file_key text NOT NULL            -- storage-abstraction key, not a filesystem path
  taken_at timestamptz NOT NULL
  notes text NULL
  created_at / deleted_at

daily_targets                       -- single source for daily adherence math
  id uuid PK, user_id FK
  metric metric NOT NULL            -- calories | protein | carbohydrates | fats
                                    -- | steps | active_minutes | sleep_minutes
  value numeric NOT NULL
  effective_from date NOT NULL
  created_at / updated_at / deleted_at
  UNIQUE (user_id, metric, effective_from)
  -- history preserved: the target for a day is the latest effective_from <= that day

meals
  id uuid PK, user_id FK
  category meal_category NOT NULL
  name text NOT NULL
  eaten_at timestamptz NOT NULL
  local_date date NOT NULL
  source meal_source NOT NULL DEFAULT 'manual'
  analysis_id uuid NULL FK -> meal_analyses
  notes text NULL
  created_at / updated_at / deleted_at
  INDEX (user_id, local_date)

meal_items
  id uuid PK, meal_id FK (CASCADE)
  name text NOT NULL
  grams numeric NULL
  calories numeric NOT NULL
  protein numeric NOT NULL
  carbohydrates numeric NOT NULL
  fat numeric NOT NULL
  micronutrients jsonb NULL         -- { "fiber_g": 4.2, "sodium_mg": 300, … }
  position int NOT NULL

meal_analyses                       -- AI drafts; NEVER a nutrition record by themselves
  id uuid PK, user_id FK
  image_key text NOT NULL
  status analysis_status NOT NULL DEFAULT 'pending'
  model text NULL
  result jsonb NULL                 -- Zod-validated structured estimation
  error_code text NULL
  created_at / updated_at

activity_entries
  id uuid PK, user_id FK
  local_date date NOT NULL
  steps int NOT NULL DEFAULT 0
  active_minutes int NOT NULL DEFAULT 0
  notes text NULL
  source text NOT NULL DEFAULT 'manual'   -- future: 'apple_health', …
  created_at / updated_at / deleted_at
  UNIQUE (user_id, local_date) WHERE deleted_at IS NULL

workouts
  id uuid PK, user_id FK
  name text NOT NULL
  performed_at timestamptz NOT NULL
  local_date date NOT NULL
  duration_minutes int NULL
  notes text NULL
  created_at / updated_at / deleted_at

workout_exercises
  id uuid PK, workout_id FK (CASCADE)
  name text NOT NULL
  muscle_group text NULL
  position int NOT NULL

workout_sets
  id uuid PK, exercise_id FK (CASCADE)
  position int NOT NULL
  repetitions int NOT NULL
  weight_kg numeric(6,2) NULL
  rpe numeric(3,1) NULL             -- 1.0–10.0
  notes text NULL

sleep_entries
  id uuid PK, user_id FK
  bedtime timestamptz NOT NULL
  wake_time timestamptz NOT NULL
  duration_minutes int NOT NULL     -- computed at write time in the service
  local_date date NOT NULL          -- the wake-up day
  quality smallint NULL             -- 1–5
  notes text NULL
  created_at / updated_at / deleted_at
  UNIQUE (user_id, local_date) WHERE deleted_at IS NULL

insights
  id uuid PK, user_id FK
  period insight_period NOT NULL
  period_start date NOT NULL
  aggregates jsonb NOT NULL         -- the deterministic summary sent to the model
  content text NOT NULL             -- the interpretation
  model text NOT NULL
  created_at
  UNIQUE (user_id, period, period_start)

badges                              -- seeded definitions
  key text PK                       -- 'streak_7', 'streak_30', 'sleep_goal_7', …
  created_at

user_badges
  id uuid PK, user_id FK
  badge_key text FK -> badges
  awarded_at timestamptz NOT NULL
  UNIQUE (user_id, badge_key)

user_streaks
  id uuid PK, user_id FK
  kind text NOT NULL                -- 'tracking', 'sleep_goal', …
  current_count int NOT NULL DEFAULT 0
  longest_count int NOT NULL DEFAULT 0
  last_date date NULL
  updated_at
  UNIQUE (user_id, kind)
```

Badge names/descriptions are not stored — they are i18n keys in the clients, keyed by
`badge_key`.

### Design notes / tradeoffs

- **`daily_targets` vs goals:** daily adherence targets (calories, protein, steps, sleep…)
  live in `daily_targets` so the Progress Score reads one table with date-effective
  history. `goals` model outcomes (lose fat targeting weight/body fat, workout frequency,
  habit goals). This avoids overloading `goals` with two different lifecycles.
- **Goal progress is computed, not stored** — derived from measurements/aggregates at read
  time by the progress service. No sync bugs.
- **`file_key` everywhere instead of paths** — the storage abstraction maps keys to local
  disk now, S3/R2 later.
- **`meal_analyses.result` is jsonb** validated by Zod at the boundary; confirming an
  analysis copies user-approved values into `meals`/`meal_items` and marks the analysis
  `confirmed`.
- **Permanent deletion**: hard-delete all rows by `user_id` (FKs make child rows
  reachable) plus stored files by key prefix `users/<id>/`.

## Backend tasks

- [ ] Add `drizzle-orm`, `pg` driver, `drizzle-kit`; `database/client.ts` and
      `database/schema/` (one file per domain, barrel export).
- [ ] Implement every table/enum/index above.
- [ ] `drizzle.config.ts`; scripts `db:generate`, `db:migrate`.
- [ ] Seed script: system measurement types (weight + 16 sites), badge keys.
- [ ] Document local dev DB setup in `backend/README.md`.

## Frontend tasks

None.

## API contracts

Full initial API surface (implemented across workflows 03–11; all under `/api`, all
responses in the standard envelope; every route except auth requires JWT):

```text
Auth        POST /auth/register · POST /auth/login · POST /auth/logout
            POST /auth/forgot-password · POST /auth/reset-password
Users       GET /users/me · PATCH /users/me · DELETE /users/me (soft)
            DELETE /users/me/permanent
Goals       GET/POST /goals · GET/PATCH/DELETE /goals/:id
Measurements GET /measurements/types · GET/POST /measurements
            PATCH/DELETE /measurements/:id
            GET/POST /measurements/photos · DELETE /measurements/photos/:id
Targets     GET /nutrition/targets · PUT /nutrition/targets   (macros)
            GET /activity/targets · PUT /activity/targets ... (via daily_targets)
Nutrition   GET/POST /nutrition/meals · GET/PATCH/DELETE /nutrition/meals/:id
            POST /nutrition/analyses            (photo → AI draft)
            GET /nutrition/analyses/:id
            POST /nutrition/analyses/:id/confirm  (edited values → meal)
            POST /nutrition/meals/:id/alternatives (AI suggestions, not persisted)
Activity    GET/PUT /activity/entries/:date · GET /activity/entries?from&to
Workouts    GET/POST /workouts · GET/PATCH/DELETE /workouts/:id
Sleep       GET/POST /sleep · PATCH/DELETE /sleep/:id
Progress    GET /progress/score?date · GET /progress/today
            GET /progress/body?window=week|7d|30d|90d
Insights    GET /insights/daily?date · GET /insights/weekly?week
Uploads     static serving of stored files (auth-gated)
```

## Validation rules

- Migrations are the only way schema changes reach the database.
- Checks: `quality BETWEEN 1 AND 5`, `rpe BETWEEN 1 AND 10`, non-negative macros/steps.

## Security considerations

- No table readable without a `user_id` predicate except seeded reference tables
  (`badges`, system `measurement_types`).
- Password reset stores only token hashes.
- `pg_crypto`/`gen_random_uuid()` via `pgcrypto` extension or PG ≥ 13 built-in.

## Acceptance criteria

- `npm run db:generate && npm run db:migrate` creates the full schema on a fresh local
  PostgreSQL database.
- Seed script is idempotent.
- `typecheck`, `lint`, `test` still pass.

## Tests

- Schema smoke test (integration, skipped when no `DATABASE_URL`): migrate fresh DB,
  insert a user + one row per owned table, verify FKs and unique constraints.

## Definition of done

- [ ] All tables, enums, indexes implemented and migrated locally.
- [ ] Seeds in place; README documents DB setup.
- [ ] Checklist updated; summary reported.
