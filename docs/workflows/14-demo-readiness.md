# Workflow 14 — Demo Readiness

## Objective

The §21 demo flow runs reliably end to end: a one-command demo seed produces a realistic
account (two weeks of meals, activity, sleep, workouts, and body measurements) so the
dashboard, insights, and achievements light up immediately, and the demo path is
documented step by step.

## User value

Anyone can see the finished product in two minutes.

## Scope

- **Demo seed (`npm run db:demo`)** — recreates `demo@metria.app` (password
  `metria-demo-123`) with: goals (lose fat + steps habit), daily targets (2200 kcal /
  170 g protein / 10k steps / 8 h sleep), 14 days of meals with realistic macros,
  activity and sleep entries (target met most days), 6 workouts with exercises/sets, and
  a weight trend 83.0 → 81.6 kg plus waist 90 → 88.4 cm. Idempotent: deletes and
  recreates the demo user (hard delete cascades).
- **Demo guide (`docs/DEMO.md`)** — the §21 flow mapped to concrete app steps, including
  what requires `OPENAI_API_KEY` (meal photo analysis, insights) and what works without.
- README updated with the demo quickstart.

### Decisions

- Progress photos and the meal-photo analysis are exercised live during the demo (they
  need a device camera roll and the API key) — the seed does not fabricate images.
- The seed writes through repositories/services where validation matters and directly
  where backdating is required (targets, timestamps), mirroring the integration tests.

## Non-goals

- No staging environment, no app-store builds, no load testing.

## Data model involved

All user-owned tables (write-through).

## Backend tasks

- [x] `src/database/demo-seed.ts` + `db:demo` script; idempotent recreate.
- [x] Verify: demo login → dashboard score/today/body populated; weekly insight
      aggregates non-null; ≥ 2 badges earned.

## Frontend tasks

- [x] None (docs only): `docs/DEMO.md` + README quickstart.

## API contracts

Unchanged.

## Validation rules

Seed data passes the same Zod bounds as real input.

## Security considerations

- Demo credentials are for local demo databases only; documented as such.

## Acceptance criteria

- Fresh DB → migrate → seed → `db:demo` → login in the app shows a populated dashboard,
  achievements with earned badges, and (with an API key) daily/weekly insights.
- All CI checks green.

## Tests

The demo seed itself is exercised manually (documented in DEMO.md); every flow it touches
is already covered by the 71-test suite.

## Definition of done

- [x] Acceptance criteria pass locally; checklists updated; summary reported.
