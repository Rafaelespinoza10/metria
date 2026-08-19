# Workflow 20 — Onboarding and Goal Progress

## Objective

A new user stops landing on an empty Home with no guidance, and goals stop being
write-only: registration flows into a short setup (daily targets + an optional first
weight goal), and every measurement-backed goal shows how far along it actually is.

## User value

The first five minutes produce a configured app (targets set, a goal to chase), and the
goals screen finally answers the only question that matters: "how close am I?".

## Scope

- **Goal progress (backend)** — goal responses gain a computed `progress` object:
  `{ current, percent }`. Deterministic, code-calculated (Golden Rule 1): `current` is
  the latest measurement of the goal's metric; `percent` is
  `(start − current) / (start − target)` clamped to 0–100, direction-agnostic (works
  for both losing and gaining). Computed for measurement-backed metrics only —
  `weight`, `body_fat`, and `measurement` (via `measurement_type_id`); habit metrics
  (calories, steps, sleep, workout frequency) return `progress: null` for now. One
  `latestByType` query enriches the whole list.
- **Onboarding (frontend)** — after **registration** (not sign-in), the app shows a
  three-step setup instead of the tabs: a welcome step, a targets step (calories,
  protein, daily steps, sleep hours — each optional, saved only when filled via the
  existing targets endpoints), and an optional first weight goal (current + target kg →
  `POST /api/goals`). Both later steps are skippable; finishing or skipping lands on
  the tabs. Driven by an in-memory `justRegistered` flag in the auth store, so existing
  sign-ins never see it and there is no persistence to migrate.
- **Goal progress (frontend)** — `GoalCard` and `GoalDetail` render the progress bar
  (brand fill on the `bg-black/10` track) with the current value when
  `progress.percent` is available.

### Decisions

- No auto-transition to `achieved` at 100% — body metrics fluctuate; the user confirms
  achievement explicitly (workflow 19 shipped that control). The bar can sit at 100%.
- `justRegistered` is deliberately not persisted: onboarding is a registration
  continuation, not a feature flag. Killing the app mid-onboarding lands on the normal
  tabs, where every target screen remains reachable.
- Habit-metric progress needs adherence windows (7-day averages) — deferred until the
  aggregates surface is worth reusing there.

## Non-goals

- No habit-metric progress (calories/steps/sleep/workout frequency) yet.
- No goal editing of start/target values (status transitions shipped in workflow 19).
- No server-side onboarding state.

## Data model involved

None — `progress` is computed on read.

## Backend tasks

- [x] `GoalsService` computes `progress` for measurement-backed goals via one
      `latestByType` pass; list and getById responses carry it — with tests
      (direction-agnostic percent, clamping, null for habit metrics and missing data).

## Frontend tasks

- [x] `justRegistered` flag in the auth store (set by useRegister, cleared on
      completion/sign-out) routing to the onboarding stack — with store tests.
- [x] Onboarding screen: welcome → targets → optional first weight goal, all
      skippable; saves through existing target/goal hooks — with a pure submit-plan
      helper and tests.
- [x] Goal progress bar + current value on `GoalCard` and `GoalDetail`; en/es locales
      (`onboarding.*` namespace, additive `goals.*` keys).

## API contracts

`GET /api/goals` / `GET /api/goals/:id` items gain:

```json
"progress": { "current": 84.6, "percent": 54 } | null
```

All other contracts unchanged.

## Validation rules

Unchanged — onboarding reuses the existing targets/goals schemas.

## Security considerations

None new; all reads stay scoped by the authenticated userId.
