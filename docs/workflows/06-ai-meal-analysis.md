# Workflow 06 — AI Meal Analysis

## Objective

The user photographs a meal; the backend gets a structured, Zod-validated estimation from
OpenAI (foods, portions, macros, confidence); the user reviews and edits the draft and
only their explicit confirmation persists a nutrition record. Users can also request
healthier / goal-aligned alternatives for an existing meal.

## User value

Logging a meal becomes one photo plus a quick review, instead of manual macro entry.

## Scope

- **AI ports (`backend/src/ai/`)** — `MealVisionPort` (image → raw JSON) and
  `MealAlternativesPort` (meal + goals → raw JSON) with OpenAI implementations. Ports
  return `unknown`; the nutrition service validates everything with Zod before use
  (Rule 9). When `OPENAI_API_KEY` is absent the ports throw `AI_UNAVAILABLE` and the
  draft is stored as `failed` — the rest of the app is unaffected (AI is additive).
- **Analysis flow (backend)** — `POST /api/nutrition/analyses` (multipart photo):
  stores the image behind the storage abstraction, creates a `meal_analyses` row
  (`pending`), calls the vision port synchronously, validates/normalizes the result, and
  saves `completed` (or `failed` + `error_code`). `GET /:id` reads the draft;
  `POST /:id/confirm` takes the **user-reviewed** meal payload (same schema as manual
  meals), persists it with `source = ai_confirmed` + `analysis_id`, and marks the
  analysis `confirmed`; `POST /:id/discard` marks it `discarded`.
- **Alternatives (backend)** — `POST /api/nutrition/meals/:id/alternatives` sends the
  meal's items plus the user's active goal categories to the port and returns validated
  suggestions. Nothing is persisted.
- **Frontend** — "Scan a photo" flow on the Nutrition screen: pick/upload → analyzing
  state → review screen seeded with the AI items (clearly labeled as estimates, per-item
  confidence, fully editable via the shared items editor) → confirm creates the meal.
  Alternatives sheet on meals. Estimation disclaimer copy in en/es.

### Decisions

- **Synchronous analysis** for MVP (one round-trip, seconds); the `status` column already
  supports moving to async later without schema changes.
- **Confirmation payload is the user's edited values**, never the raw AI result — the
  server does not copy from `result` at confirm time, so what the user saw and approved
  is exactly what is stored (Rule 10).
- Model configurable via `OPENAI_MODEL` (default `gpt-4o-mini`); prompts forbid medical
  claims and require per-food confidence.

## Non-goals

- No chatbot (Rule 11). No medical/diagnostic output (Rule 12).
- No barcode/food-database lookup. No async job queue yet.

## Data model involved

`meal_analyses`, `meals`, `meal_items` (migrated in 02). New error code `AI_UNAVAILABLE`.

## Backend tasks

- [x] `ai/ports.ts` + `ai/openai.ts` (vision + alternatives, data-URL image input,
      JSON response format) + prompts.
- [x] Env: optional `OPENAI_API_KEY`, `OPENAI_MODEL`.
- [x] `modules/nutrition/`: analysis repository/service/controller, AI result Zod
      schemas, routes (multipart), meal `source`/`analysisId` on create; alternatives
      endpoint.
- [x] Integration tests with **fake ports injected through `createApp` deps — the test
      suite never calls OpenAI** (Rule from §20).

## Frontend tasks

- [x] Extract a reusable meal items editor from AddMeal; reuse it in the review screen.
- [x] `features/nutrition` AI screens: scan/upload (analyzing state), review/edit with
      estimate disclaimer + per-item confidence, confirm → meal.
- [x] Alternatives request from the day view (bottom card list).
- [x] en/es strings; Jest tests for the AI→items mapping helper.

## API contracts

All `(auth)`, standard envelope.

```text
POST /api/nutrition/analyses               multipart: photo
                                           201 → { analysis }   (status completed|failed)
GET  /api/nutrition/analyses/:id           200 → { analysis }   404 if not owner
POST /api/nutrition/analyses/:id/confirm   body = manual-meal schema
                                           201 → { meal }       409 if already confirmed/discarded
POST /api/nutrition/analyses/:id/discard   200 → { analysis }
POST /api/nutrition/meals/:id/alternatives 200 → { suggestions: [{ title, description }] }
```

`analysis.result` (when completed): `{ foods: [{ name, estimatedGrams?, calories,
protein, carbohydrates, fat, micronutrients?, confidence }], overallConfidence?, notes? }`.

## Validation rules

- Photo upload: same constraints as progress photos (jpeg/png/webp, ≤ 10 MB).
- AI result: foods 1–30; name ≤ 120; grams ≤ 5000; calories ≤ 5000; macros ≤ 1000;
  confidence 0–1. Anything invalid ⇒ analysis `failed` with `error_code =
  ai_invalid_response` — never partially trusted.
- Confirm body: exactly `createMealSchema` (user-reviewed values).

## Security considerations

- Images stored under the user's key prefix; analyses scoped by `userId` (foreign → 404).
- The image (not user PII) is sent to OpenAI; prompts contain no identifying data.
- AI output is data, never executed or trusted: Zod-validated, bounded, and stored as the
  draft only.

## Acceptance criteria

- Photo → draft with validated foods; user edits and confirms → meal appears in the day
  with `ai_confirmed` source; the analysis can't be confirmed twice.
- With no API key configured, analysis fails gracefully and manual logging still works.
- Alternatives return validated suggestions for an owned meal.
- All CI checks green (OpenAI fully mocked).

## Tests

Backend integration (fake ports): analyze → completed draft with normalized foods;
vision throwing → failed + error code; invalid AI payload → failed (`ai_invalid_response`);
confirm persists exactly the edited payload (`ai_confirmed`, linked, analysis confirmed);
double-confirm → 409; discard; foreign analysis → 404; alternatives happy path + foreign
meal 404. Frontend Jest: AI foods → editor items mapping.

## Definition of done

- [x] Acceptance criteria pass locally and in CI; checklists updated; summary reported.
