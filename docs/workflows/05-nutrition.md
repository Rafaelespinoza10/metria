# Workflow 05 — Nutrition

## Objective

Users can record meals manually (with per-item macros and optional micronutrients), set
daily nutritional targets, and see a per-day summary of intake vs targets.

## User value

The nutrition half of a complete tracked day; the summary feeds the Today panel and
Progress Score later.

## Scope

- **Meals (backend + frontend)** — categories breakfast/lunch/dinner/snack; a meal has a
  name, eaten-at timestamp, notes, and 1+ items. Each item: name, optional grams,
  calories, protein, carbohydrates, fat, optional micronutrients (jsonb). Meal totals are
  computed from items at read time — never stored.
- **Daily targets (backend + frontend)** — calories, protein, carbohydrates, fats via
  `daily_targets` (date-effective history: PUT upserts today's row per metric; the target
  in effect for a day is the latest `effective_from <= day`).
- **Day summary (backend + frontend)** — totals per macro for a local date + the targets
  in effect that day.
- `local_date` computed server-side from the user's IANA timezone at write time
  (`shared/utils/local-date.ts`).
- Frontend: day view (calories hero with target bar, macro bars, meals grouped by
  category, day navigation), add-meal flow with an items editor, targets editor; Home
  quick action.

### Decisions

- **`DailyTargetsRepository` lives in `modules/nutrition/` but is metric-generic** —
  activity (steps/active minutes) and sleep targets reuse it in Workflows 07/08 instead
  of inventing parallel tables.
- Updating a meal **replaces its items** (simplest correct semantics for an editor form).
- No food database/search — items are free-form (AI analysis arrives in Workflow 06).

## Non-goals

- No AI meal analysis (Workflow 06). No photo attached to meals.
- No micronutrient UI yet (API accepts them; UI shows macros only).
- No weekly nutrition analytics (Workflow 09/10).

## Data model involved

`meals`, `meal_items`, `daily_targets` (migrated in 02).

## Backend tasks

- [x] `shared/utils/local-date.ts` — `localDateFor(instant, timeZone)`.
- [x] `modules/nutrition/`: meals repository (transactional create/update with items),
      daily-targets repository (generic upsert + effective lookup), service (local_date,
      totals, summary), controller, routes, Zod schemas.
- [x] Integration tests (see Tests).

## Frontend tasks

- [x] `features/nutrition`: day screen (hero + macro bars + grouped meals + day nav),
      add-meal screen (category, name, items editor), targets screen.
- [x] Home quick-action row for Nutrition.
- [x] en/es strings; Jest tests for totals/date helpers + a component.

## API contracts

All `(auth)`, standard envelope.

```text
GET    /api/nutrition/meals?date=YYYY-MM-DD   200 → { meals: [{ ...meal, items, totals }] }
POST   /api/nutrition/meals                   201 → { meal }
GET    /api/nutrition/meals/:id               200 → { meal }      404 if not owner
PATCH  /api/nutrition/meals/:id               200 → { meal }      (items replace)
DELETE /api/nutrition/meals/:id               200 → { deleted: true }   (soft)
GET    /api/nutrition/targets                 200 → { targets: { calories?, protein?,
                                                     carbohydrates?, fats? } }
PUT    /api/nutrition/targets                 200 → { targets }   (upserts today)
GET    /api/nutrition/summary?date=YYYY-MM-DD 200 → { date, totals, targets }
```

## Validation rules

- category from enum; name 1–120 chars; eatenAt ISO datetime (≤ now + 5 min); notes ≤ 500.
- items: 1–30 per meal; item name 1–120; grams optional 0–5000; calories 0–5000;
  protein/carbohydrates/fat 0–1000; micronutrients: record of finite numbers (≤ 30 keys).
- targets: calories 0–10000; macros 0–1000; at least one field on PUT.
- date query params: ISO date; default = today in the user's timezone.

## Security considerations

- All queries scoped by `userId`; foreign meals answer 404.
- Meal + items created/updated in one transaction — no orphan items.
- jsonb micronutrients validated by Zod (finite numbers only) before persisting.

## Acceptance criteria

- A user can record a multi-item meal, see it in the right local day (timezone-aware),
  edit its items, and soft-delete it.
- A user can set daily targets and see intake vs targets for any day.
- All CI checks green in both apps.

## Tests

Backend integration: meal create with items → computed totals; timezone bucketing (meal
eaten 02:00 UTC lands on the previous local day for UTC-6); list by date; update replaces
items; soft delete; validation failures (no items, negative macros, bad micronutrients);
targets upsert + effective lookup + summary math; cross-user 404.
Frontend Jest: meal totals + day-navigation date helpers; macro progress component.

## Definition of done

- [x] Acceptance criteria pass locally and in CI; checklists updated; summary reported.
