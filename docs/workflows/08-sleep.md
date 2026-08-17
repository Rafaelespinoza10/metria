# Workflow 08 — Sleep

## Objective

Users can record sleep manually (bedtime, wake-up, computed duration, subjective quality
1–5, notes) and define a nightly duration target (e.g. 8 h/day).

## User value

Completes the tracked day (nutrition + movement + sleep); duration and quality feed the
Progress Score and insights.

## Scope

- **Sleep entries (backend + frontend)** — bedtime + wake-up timestamps; the server
  computes `duration_minutes` and buckets the entry on the **wake-up day** in the user's
  timezone (`local_date`, unique per user/day). Quality 1–5 optional; notes. Create,
  ranged list, update (recomputes duration), soft delete.
- **Sleep target (backend + frontend)** — `sleep_minutes` through the existing
  `DailyTargetsRepository` (stored in minutes; UI enters hours).
- Frontend: sleep screen (last-night hero "7h 34m" vs target, quality, recent nights
  list), log-sleep flow (bedtime/wake time as HH:MM with the previous-day rule, quality
  chips), target editor; Home quick action.

### Decisions

- **One entry per wake-up day** — a second entry for the same day answers 409 CONFLICT
  (the client edits instead). Matches the schema's partial unique index.
- **HH:MM entry on mobile**: wake time is today; bedtime falls on yesterday when its
  time-of-day is later than the wake time (helper covered by tests). No date-picker
  dependency for MVP.

## Non-goals

- No sleep-stage/HR data, no wearable integrations.
- No weekly sleep analytics (Workflows 09/10).

## Data model involved

`sleep_entries`, `daily_targets` (migrated in 02).

## Backend tasks

- [x] `modules/sleep/`: repository, service (duration + wake-day bucketing), controller,
      routes, Zod schemas; target via `DailyTargetsRepository`.
- [x] Integration tests (see Tests).

## Frontend tasks

- [ ] `features/sleep`: sleep screen (hero + recent nights), log flow (HH:MM + quality
      chips), target editor; duration/instant helpers with tests.
- [ ] Home quick action; en/es strings.

## API contracts

All `(auth)`, standard envelope.

```text
GET    /api/sleep?from&to        200 → { entries: [...] }
POST   /api/sleep                201 → { entry }     409 CONFLICT if the day exists
PATCH  /api/sleep/:id            200 → { entry }     (duration recomputed)
DELETE /api/sleep/:id            200 → { deleted: true }   (soft)
GET    /api/sleep/targets        200 → { targets: { sleep_minutes? } }
PUT    /api/sleep/targets        200 → { targets }   (upserts today)
```

## Validation rules

- bedtime/wakeTime ISO datetimes; wakeTime > bedtime; duration ≤ 24 h; wakeTime ≤ now
  + 5 min; quality integer 1–5 optional; notes ≤ 500.
- Target: sleepMinutes integer 60–960.

## Security considerations

- All queries scoped by `userId`; foreign entries answer 404.

## Acceptance criteria

- A user can log last night's sleep, see the computed duration on the right local day,
  edit it, and set an 8 h target.
- Logging the same night twice answers 409; all CI checks green in both apps.

## Tests

Backend integration: create computes duration and wake-day local_date; duplicate day →
409; update recomputes duration; ranged list; soft delete; validation (wake before bed,
> 24 h, quality 6); target round-trip; cross-user 404.
Frontend Jest: HH:MM → instants helper (previous-day rule), minutes → "7h 34m" formatter.

## Definition of done

- [ ] Acceptance criteria pass locally and in CI; checklists updated; summary reported.
