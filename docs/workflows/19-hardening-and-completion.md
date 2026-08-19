# Workflow 19 — Hardening and Completion

## Objective

Close every finding from the 2026-08-19 two-repo audit that blocks safe production
traffic or leaves a shipped backend capability without a UI: backend security and
query hardening, operational readiness, frontend auth correctness, edit/delete flows
for every record type, and app-store release configuration.

## User value

Records can be corrected instead of living with mistakes forever; sessions recover
instead of silently stranding the user; the API stays fast and cheap as history grows;
the app can actually be built and shipped.

## Scope

Six PRs, three backend then three frontend, each independently mergeable:

- **A — Backend security** — `trust proxy` (env-configurable), a global rate limiter
  plus a strict per-route limiter on AI endpoints (photo analyses, insights,
  alternatives), Multer errors mapped to envelope 413/400s, magic-byte sniffing on
  uploaded images (stop trusting the client MIME header), `Content-Disposition:
  attachment` on `/api/uploads`, production env guards (`CORS_ORIGIN` must not be `*`,
  `DATABASE_URL` required), JWT signing/verification pinned to HS256 + `iss`/`aud`,
  console mailer refuses to run in production.
- **B — Backend queries** — date-range predicates move into SQL (nutrition
  `listByLocalDateRange`, sleep, workouts, measurements) killing the silent
  120/200/500-row caps; migration adding the missing child-table indexes
  (`meal_items.meal_id`, `workout_exercises.workout_id`, `workout_sets.exercise_id`,
  `progress_photos(user_id, taken_at)`, `meal_analyses.user_id`,
  `password_reset_tokens.token_hash`, `measurements(user_id, deleted_at)`);
  timezone-consistent range boundaries in measurements/progress/aggregates (bucket by
  the user's IANA timezone like every other module); gamification badge awarding wrapped
  in a transaction; per-metric loops batched into single `IN (...)` queries; OpenAI
  adapter hardened (shared client, timeout, retries, `max_tokens`, parse failures →
  `AI_UNAVAILABLE`, never 500).
- **C — Backend ops** — graceful shutdown (SIGTERM/SIGINT → drain server, close pool),
  `GET /api/health/ready` that actually checks Postgres, `pino` structured request
  logging with request IDs, boot-time check that the seed ran (system measurement types
  present — warn loudly if not).
- **D — Frontend auth** — global 401 handling in `services/api.ts` → `signOut()` (auth
  routes exempt), boot-time revalidation of the cached session via `GET /api/users/me`,
  Forgot/Reset password screens wired to the existing backend flow, `QueryClient`
  defaults (staleTime, no retry on 4xx).
- **E — Frontend CRUD completion** — edit and delete for meals, goals (status
  transitions achieved/abandoned included), and sleep entries; discard AI analyses on
  cancel; date/time pickers so meals and workouts can be back-dated (today everything
  is hard-coded to "now"). Progress-photo delete and measurement back-dating were
  deferred with the rest of the measurement-screen work (workflow 17 owns those
  screens).
- **F — Frontend UX, performance, release** — pull-to-refresh and a shared error/retry
  state on every list screen; the paginated workouts list becomes a `FlatList` with
  `onEndReached`; authenticated images move to `expo-image` (header-aware disk cache);
  `app.json` gets a real name/slug/bundle identifiers and the splash plugin; `eas.json`
  build profiles scaffolded.

### Decisions

- Coordinated with workflows 17 and 18 (parallel sessions): this workflow does **not**
  touch measurement screens (17 owns them) nor users stats/export/import/Settings v2
  (18 owns them). Backend measurements changes are repository/service-level only.
- The gamification evaluation stays on `GET /api/gamification` for client compatibility;
  the fix is transactional awarding, not a route change.
- Date pickers use `@react-native-community/datetimepicker` (Expo Go-compatible).
- Locale keys added by this workflow live outside the `settings` namespace to avoid
  merge conflicts with workflow 18.

## Non-goals

Deferred to future workflows: progress-photo delete and measurement back-dating
(measurements screens), onboarding flow, push notifications, Apple Health /
Google Health Connect, goal progress computation endpoint, insight regeneration and
history, micronutrient UI, refresh tokens / per-device sessions, email verification,
S3/R2 storage driver, strength progression analytics.

## Data model involved

No new tables. One migration: the child-table indexes listed in B.

## Backend tasks

- [x] A: trust proxy, global + AI rate limiters, Multer error mapping, magic-byte
      sniffing, uploads `Content-Disposition`, prod env guards, JWT `alg`/`iss`/`aud`,
      mailer prod guard — with tests.
- [x] B: SQL range predicates replacing in-memory filters and silent caps; index
      migration; timezone-consistent boundaries; gamification award transaction;
      batched metric queries; OpenAI adapter hardening — with tests.
- [x] C: graceful shutdown, `/api/health/ready`, pino request logging with request IDs,
      seed presence boot check — with tests where feasible.

## Frontend tasks

- [x] D: 401 → signOut, boot revalidation, Forgot/Reset password screens, QueryClient
      defaults — with tests.
- [x] E: meals/goals/sleep edit + delete, analysis discard, meal/workout date-time
      pickers — with tests. (Photo delete + measurement back-dating deferred to the
      measurements screens' owner; see Scope.)
- [x] F: pull-to-refresh + error/retry states, workouts `FlatList`, `expo-image`,
      `app.json` identity + splash, `eas.json` — with tests.

## API contracts

- `GET /api/health/ready` → `200 { ok: true, data: { db: "ok" } }` or `503` envelope.
- Oversized uploads → `413 { ok: false, error: { code: "VALIDATION_ERROR", … } }`.
- AI routes may now answer `429 RATE_LIMITED`.
- All other contracts unchanged; list endpoints keep their shapes but honor `from`/`to`
  in SQL.

## Validation rules

- `TRUST_PROXY` env: unset (off), `1`..`n` hop count, or a comma-separated CIDR list.
- Uploaded images must sniff as JPEG/PNG/WebP regardless of the declared MIME type.

## Security considerations

Items A1–A9 of the audit are the core of this workflow; see PR descriptions for the
mapping. The console mailer printing reset tokens is treated as a production secret
leak and hard-fails outside development/test.
