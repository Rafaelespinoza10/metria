# Workflow 10 — AI Insights

## Objective

Metria generates a daily and a weekly insight: the backend computes deterministic
aggregates first (code calculates), then OpenAI turns that structured summary into a
short, calm interpretation (AI interprets). Never the raw history, never LLM arithmetic.

## User value

The numbers the user already tracks become an understandable story about their habits.

## Scope

- **Aggregates service (backend, deterministic)** —
  - *Daily (date D)*: calories/protein/steps/active-minutes/sleep vs the targets in
    effect, workout count, plus the previous-7-days averages for context.
  - *Weekly (Monday-start week W)*: current vs previous week — average sleep minutes,
    average steps, average calories, protein-goal completion rate (% of tracked days
    meeting the target), workout count, and first→last weight of the week.
  - Pure functions over repository range queries; fully unit-testable; all rounding done
    here.
- **Insights flow (backend)** — `GET /api/insights/daily?date` and
  `GET /api/insights/weekly?week`: return the cached row from `insights`
  (unique per user/period/period_start) or compute aggregates → call `InsightsPort` →
  validate `{ content }` with Zod → persist (aggregates + content + model) → return.
  `AI_UNAVAILABLE` (503) when the port fails — nothing is persisted.
- **Frontend** — Insights screen with the daily and weekly cards (content + the key
  aggregate numbers, skeleton/empty/unavailable states), Home quick action, en/es.

### Decisions

- **Targets for a period use the value in effect on the period's last day** — good
  enough for MVP adherence math and keeps aggregate queries simple (documented tradeoff).
- **Insights are cached per period**: one generation per user/day and user/week; the
  cache is the `insights` table itself.
- Weeks start on Monday; `week` param must be a Monday (else 400).

## Non-goals

- No chatbot, no free-form Q&A (Rule 11). No medical statements (Rule 12).
- No push notifications or scheduled generation (on-demand only for MVP).

## Data model involved

`insights` (migrated in 02); reads meals/activity/sleep/workouts/measurements/targets.

## Backend tasks

- [x] `ai/ports.ts` + `ai/openai.ts`: `InsightsPort` + OpenAI implementation (interpretive
      prompt, no arithmetic requested, locale-aware, no medical claims).
- [x] `modules/insights/`: aggregates service (pure), repository, service (cache +
      validation), controller, routes.
- [x] Integration tests with a fake port (see Tests).

## Frontend tasks

- [ ] `features/insights`: screen with daily + weekly cards (content, key numbers,
      designed loading/unavailable states); Home quick action; en/es strings; Jest test
      for the week-start helper.

## API contracts

All `(auth)`, standard envelope.

```text
GET /api/insights/daily?date=YYYY-MM-DD    200 → { insight: { period: 'daily',
                                             periodStart, content, aggregates, model } }
GET /api/insights/weekly?week=YYYY-MM-DD   200 → { insight: { period: 'weekly', ... } }
                                           503 AI_UNAVAILABLE when generation fails
```

## Validation rules

- `date` ISO date, not in the future; default today (user timezone).
- `week` ISO date and a Monday; default the current week's Monday.
- AI response: `{ content: string 1–1200 chars }` — anything else ⇒ 503, nothing stored.

## Security considerations

- Aggregates only (numbers + metric names) go to OpenAI — no raw entries, notes, or PII.
- Insights scoped by `userId`; cache rows unique per user/period.

## Acceptance criteria

- Daily and weekly insights return interpretive text grounded in stored deterministic
  aggregates; repeated calls hit the cache (no second AI call).
- Weekly aggregates match hand-computed values from seeded data.
- All CI checks green (OpenAI fully mocked).

## Tests

Backend: weekly aggregates math against seeded meals/activity/sleep/workouts/
measurements; daily aggregates vs targets; caching (fake port called exactly once);
invalid AI payload → 503 and nothing persisted; non-Monday week → 400; cross-user
isolation. Frontend Jest: Monday-of-week helper.

## Definition of done

- [ ] Acceptance criteria pass locally and in CI; checklists updated; summary reported.
