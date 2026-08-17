# Workflow 09 — Dashboard and Progress

## Objective

The Home screen becomes the real dashboard: a deterministic Progress Score with its
week-over-week delta, the Today panel (calories, protein, steps, sleep vs targets), and
Body Progress comparisons — never a collection of raw numbers, never an LLM-invented
score.

## User value

One glance answers "how am I doing?" — today, this week, and in the body trend.

## Scope

- **Progress Score service (backend, isolated & deterministic)** — score 0–100 for the
  7-day window ending at a date, plus the previous window's score and the delta.
  Weights: nutrition 25 %, activity 25 %, sleep 25 %, tracking consistency 25 %.
  - *Nutrition day adherence*: mean of calories closeness (`1 − min(|value−target|/target, 1)`)
    and protein ratio (capped at 1), over metrics with targets on tracked days.
  - *Activity day adherence*: mean of steps and active-minutes ratios (capped at 1).
  - *Sleep day adherence*: duration/target capped at 1.
  - *Tracking consistency*: days with ≥ 1 log (meal, activity, sleep, or workout) / 7.
  - Components without any applicable data are excluded and the remaining weights
    renormalize; no data at all ⇒ score 0. All math lives in one service (formula can
    evolve without touching callers).
- **Today panel (backend)** — reuses `AggregatesService.daily` (already deterministic).
- **Body progress (backend)** — for `window = week | 7d | 30d | 90d`: weight, waist, and
  body-fat deltas (earliest → latest in the window; for `week`: latest of previous week →
  latest of current week) plus workout counts current vs previous equal-length window.
- **Frontend** — Home redesign: Progress Score hero (big score + delta chip), Today
  section with metric bars, Body Progress card with window chips, keeping quick actions.

### Decisions

- **Score window is 7 days ending "today"** — makes "+6 vs last week" natural and keeps
  the score stable through the day.
- **"Goal consistency" is implemented as tracking consistency** (days with at least one
  log): objective, deterministic, and honest for the MVP; refinement can live entirely
  inside the service.
- Adherence caps at 1 — overshooting a target never inflates the score.

## Non-goals

- No charts/graphs yet (list-style deltas only). No LLM involvement anywhere (Rule 13).
- No gamification (Workflow 11).

## Data model involved

Read-only over meals, activity, sleep, workouts, measurements, daily_targets.

## Backend tasks

- [x] `modules/progress/`: `ProgressScoreService` (pure formula), service/controller/
      routes for score, today, and body endpoints.
- [x] Integration tests with hand-computed expectations (see Tests).

## Frontend tasks

- [ ] Home dashboard: score hero with delta, Today bars, Body Progress card with window
      chips; loading skeletons shaped like the layout; en/es strings.
- [ ] Jest tests for delta formatting helpers.

## API contracts

All `(auth)`, standard envelope.

```text
GET /api/progress/score?date=YYYY-MM-DD  200 → { score, previousScore, delta,
                                           components: { nutrition, activity, sleep,
                                           consistency } }   (components 0–100 | null)
GET /api/progress/today?date=YYYY-MM-DD  200 → daily aggregates (metrics vs targets)
GET /api/progress/body?window=week|7d|30d|90d
                                         200 → { window, metrics: [{ key, unit, start,
                                           end, delta }], workouts: { current, previous } }
```

## Validation rules

- `date` ISO, not future, default today (user timezone); `window` from the enum,
  default `week`.

## Security considerations

- Read-only, all scoped by `userId`; no new attack surface.

## Acceptance criteria

- Seeded data produces the exact hand-computed score, components, and delta.
- Today panel matches the nutrition/activity/sleep entries for the day.
- Body deltas match seeded measurements per window; empty windows return null deltas.
- All CI checks green in both apps.

## Tests

Backend: full-adherence day ⇒ component 100; half-adherence math; weight/waist deltas per
window including the week-vs-week rule; renormalization when a component has no data;
score 0 with no data; future date → 400. Frontend Jest: delta/sign formatting helper.

## Definition of done

- [ ] Acceptance criteria pass locally and in CI; checklists updated; summary reported.
