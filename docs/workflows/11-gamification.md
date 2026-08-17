# Workflow 11 — Gamification

## Objective

Simple, honest gamification: tracking and sleep streaks, and six milestone badges —
computed deterministically from existing data, awarded idempotently. No levels,
currencies, or leaderboards.

## User value

Visible momentum: streaks reward showing up daily; badges mark real milestones.

## Scope

- **Streaks (backend)** — `tracking` (consecutive days with ≥ 1 log of any kind) and
  `sleep_goal` (consecutive nights meeting the sleep target). Current streak computed
  from data on read (90-day lookback, today counts if logged, otherwise from yesterday);
  `user_streaks` persists the longest ever.
- **Badges (backend)** — awarded on read when their condition holds (idempotent via the
  unique user/badge constraint), permanent once earned:
  `tracking_7_days`, `tracking_30_days` (tracking streak ≥ 7/30),
  `sleep_goal_7_consecutive` (sleep streak ≥ 7), `workouts_10` (≥ 10 workouts),
  `steps_100k_total` (≥ 100,000 lifetime steps), `first_measurement_improvement`
  (weight, waist, or body fat lower than its first recorded value).
- **Endpoint** — `GET /api/gamification`: streaks + all badge definitions with
  `awardedAt` or null.
- **Frontend** — Achievements screen: streak hero (current + longest), badge grid
  (earned in brand color, locked dimmed), Home quick action, en/es.

### Decisions

- **Evaluate-on-read** (no cron/event system): every fetch recomputes streaks and awards
  any newly earned badges — simple, idempotent, and always consistent with the data.
- Badges are never revoked (deleting data does not un-earn a milestone).

## Non-goals

- No levels, points, currencies, social features, or notifications (spec §13).

## Data model involved

`badges` (seeded), `user_badges`, `user_streaks` (migrated in 02); read-only over logs.

## Backend tasks

- [x] `modules/gamification/`: streaks calculator (pure), repository, service (award +
      persist longest), controller, routes.
- [x] Integration tests (see Tests).

## Frontend tasks

- [ ] `features/gamification`: achievements screen (streak hero, badge grid with locked
      states); Home quick action; en/es strings; Jest test for the consecutive-days
      helper if extracted client-side (otherwise API-driven only).

## API contracts

```text
GET /api/gamification   (auth)
200 → { streaks: { tracking: { current, longest }, sleepGoal: { current, longest } },
        badges: [{ key, awardedAt: string | null }] }
```

## Validation rules

None beyond auth (read-only endpoint).

## Security considerations

- Scoped by `userId`; badge awarding uses `ON CONFLICT DO NOTHING` semantics.

## Acceptance criteria

- Seeded consecutive days produce the exact streak counts; gaps reset the current streak
  but never the stored longest.
- Badge conditions award exactly once; repeat fetches change nothing.
- All CI checks green in both apps.

## Tests

Backend: 3 consecutive tracked days ⇒ tracking streak 3; gap resets current but longest
persists; sleep streak honors the target; workouts_10 and steps_100k awards; measurement
improvement badge; idempotent double-fetch; cross-user isolation.

## Definition of done

- [ ] Acceptance criteria pass locally and in CI; checklists updated; summary reported.
