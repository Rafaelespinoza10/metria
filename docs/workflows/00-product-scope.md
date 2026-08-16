# Workflow 00 — Product Scope

## Objective

Freeze the MVP scope, boundaries, risks, and acceptance flow so every later workflow can
be executed without re-litigating product decisions.

## User value

The user gets a coherent product that tracks habits and body progress end to end, instead
of a pile of disconnected features.

## Scope

The MVP consists of exactly these capabilities (details in `docs/PRODUCT.md`):

1. **Authentication** — register, login, JWT, logout, profile, password-recovery
   architecture, soft delete, permanent account/data deletion. No roles.
2. **Goals** — multiple simultaneous goals. Categories: lose fat, gain muscle, maintain
   body composition, improve habits. Targetable metrics: weight, body fat %, calories,
   protein, carbohydrates, fats, steps, sleep, workout frequency, individual body
   measurements. Each goal: starting value, target value, optional target date, current
   progress, status.
3. **Body measurements** — weight (kg) plus 16 body sites (cm): neck, shoulders, chest,
   waist, hips, left/right biceps, left/right triceps, left/right forearm, left/right
   thigh, left/right calf. Entries carry value, timestamp, notes. Progress photos stored
   locally on the server behind a storage abstraction that can later move to S3/R2.
   Custom measurement types must be possible later without schema rewrite.
4. **Nutrition** — manual meals in four categories (breakfast, lunch, dinner, snack);
   calories, protein, carbohydrates, fats; micronutrients when available; daily
   nutritional targets.
5. **AI meal analysis** — photo upload → OpenAI structured estimation (foods, portions,
   calories, macros, inferable micronutrients, confidence) → stored as a *draft
   estimation* → user reviews/edits → user confirms → nutrition record persisted. The AI
   estimate is never persisted as a meal automatically. Users can request healthier or
   goal-aligned alternatives to a meal.
6. **Activity** — manual daily steps, active minutes, notes. Goals such as 10,000
   steps/day, 45 active minutes/day.
7. **Workouts** — workout (name, date, duration, notes) → exercises (name, muscle group)
   → sets (reps, weight, optional RPE, notes). History preserved for future progression
   views.
8. **Sleep** — manual bedtime, wake-up, calculated duration, quality 1–5, notes. Targets
   such as 8 hours/day.
9. **Dashboard** — greeting; deterministic Progress Score (nutrition 25%, activity 25%,
   sleep 25%, goal consistency 25%, formula isolated in a service); Today panel (calories,
   protein, steps, sleep vs targets); Body Progress comparisons (week vs previous week,
   7/30/90 days).
10. **AI insights** — daily and weekly. Backend computes deterministic aggregates first;
    OpenAI only interprets the structured summary.
11. **Gamification** — streaks, milestones, badges. Examples: 7 days tracking, 30 days
    tracking, 7 consecutive sleep goals, 10 workouts, 100,000 total steps, first body
    measurement improvement.
12. **Localization** — English (default) and Spanish, wired from the beginning; no
    hardcoded UI strings.

## Non-goals

- No medical behavior: no diagnosis, prescriptions, treatment, or certainty claims about
  nutrition from photos.
- No chatbot.
- No Apple Health / Google Health Connect (architecture must allow it later).
- No advanced strength analytics.
- No levels, currencies, leaderboards, or social features.
- No roles/permissions beyond a single authenticated user model.
- No speculative abstractions for requirements that do not exist.

## Data model involved

The entire schema (see `02-database-design.md`). This workflow only defines it
conceptually: users, goals, measurement types/entries, progress photos, daily targets,
meals/meal items, meal analyses (AI drafts), activity entries, workouts/exercises/sets,
sleep entries, insights, badges/streaks.

## Backend tasks

None (documentation-only workflow).

## Frontend tasks

None (documentation-only workflow).

## API contracts

Top-level surface (full contracts in `02-database-design.md`):

```text
/api/auth  /api/users  /api/goals  /api/measurements  /api/nutrition
/api/activity  /api/workouts  /api/sleep  /api/progress  /api/insights  /api/uploads
```

Envelope: `{ "ok": true, "data": … }` / `{ "ok": false, "error": { "code", "message" } }`.

## Validation rules

- All API input validated with Zod.
- All AI output used programmatically validated with Zod before use.

## Security considerations

- Every resource scoped by authenticated `userId`; cross-user access is impossible by
  construction (repositories always filter by `userId`).
- Soft deletes (`deletedAt`) where appropriate; a permanent-deletion path removes all
  personal data including files.
- Uploaded images validated (type, size) and never publicly listable.

## Risks

### Technical risks

| Risk | Mitigation |
|---|---|
| OpenAI meal estimates are inaccurate or malformed | Zod-validated structured output; confidence surfaced in UI; user always reviews/edits before persisting; estimates labeled as estimates |
| OpenAI latency/outages block core flows | AI is additive: manual meal entry and all tracking work without AI; analysis is async-friendly (draft with status) |
| Local file storage doesn't survive a move to cloud hosting | Storage abstraction (interface + local driver) from day one; only the driver changes for S3/R2 |
| Progress Score formula churn | Formula isolated in one service with unit tests; weights are constants |
| React Native environment friction (builds, native deps) | Expo managed workflow; minimal native dependencies |
| Timezone bugs in "daily" aggregation (meals, steps, sleep cross midnight) | Store timestamps as UTC `timestamptz`; entries also carry a user-local calendar date computed at write time; aggregation keys on that date |

### Scope risks

| Risk | Mitigation |
|---|---|
| Dashboard/insights ballooning into analytics platform | Fixed MVP dashboard sections; comparisons limited to the four defined windows |
| Gamification creep | Streaks + fixed milestone badges only |
| AI creep (chatbot, coaching, medical territory) | Rules 11–13; AI limited to meal estimation, alternatives, and insight interpretation |
| Building for hypothetical multi-tenant features | Multi-user readiness = `userId` scoping only; no orgs, roles, sharing |

## Acceptance criteria

The demo acceptance flow below is the product-level acceptance test:

```text
1. Register/login
2. Set goal: Lose fat
3. Configure targets: Calories 2200, Protein 170 g, Steps 10000, Sleep 8 h
4. Record weight and body measurements
5. Upload progress photo
6. Upload meal photograph
7. AI analyzes food
8. User corrects/accepts estimation
9. Meal is stored
10. Record daily steps
11. Record gym workout
12. Record sleep
13. Open dashboard
14. See Progress Score
15. See daily progress
16. See body trends
17. See AI-generated insight
```

## Tests

None (documentation-only). Testing requirements for the product are defined in
`13-testing-and-hardening.md`; each feature workflow carries its own tests.

## Definition of done

- [x] MVP scope, non-goals, risks, and acceptance flow documented and consistent with
      `docs/PRODUCT.md`, `01-project-foundation.md`, and `02-database-design.md`.
