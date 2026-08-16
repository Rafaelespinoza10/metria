# Metria — Product Definition

> **Your habits. Your body. Your progress.**

Metria is a mobile-first personal wellness tracker that connects nutrition, body
measurements, physical activity, gym workouts, sleep, and goals — and uses AI to help the
user understand how daily habits correlate with physical progress.

Built initially for a single user; the architecture supports multiple users without a
rewrite (all resources are scoped by authenticated `userId` from day one).

## What Metria is

- A daily tracking tool: meals, steps/active minutes, workouts, sleep, body measurements,
  progress photos.
- A goal system: multiple simultaneous goals across weight, body composition, nutrition,
  activity, sleep, and workout frequency.
- A progress dashboard: a deterministic Progress Score, today-at-a-glance vs targets, and
  body trends over 7/30/90 days and week-vs-week.
- An AI interpreter: photo-based meal estimation (always user-confirmed before persisting)
  and daily/weekly insights generated from deterministic backend aggregates.

## What Metria is NOT

- Not a medical product. It never diagnoses, prescribes, treats, or claims certainty about
  nutrition from photographs. AI output is always framed as an estimate or interpretation.
- Not a chatbot (excluded from MVP).
- Not a social product (no leaderboards, sharing, or multi-user visibility).
- Not an integration hub yet (no Apple Health / Google Health Connect in MVP; the activity
  module is designed so integrations can be added later).

## Golden rules

1. **Code calculates. AI interprets.** All arithmetic (scores, aggregates, comparisons) is
   deterministic backend code. AI receives pre-computed summaries and produces
   explanations.
2. **AI never writes records on its own.** AI meal estimation produces a draft; only
   explicit user confirmation persists a nutrition record.
3. **All AI outputs used programmatically are validated against a Zod schema.**
4. **Every user resource is scoped through the authenticated `userId`.**

## MVP scope (summary)

| Area | MVP capability |
|---|---|
| Auth | Register, login, JWT, logout, profile, password-recovery architecture, soft delete, permanent deletion |
| Goals | Multiple concurrent goals; categories: lose fat, gain muscle, maintain, improve habits; targets across weight, body fat, macros, steps, sleep, workout frequency, individual measurements |
| Measurements | Weight (kg) + 16 body sites (cm), notes, timestamps, progress photos (local storage behind an abstraction) |
| Nutrition | Manual meals (breakfast/lunch/dinner/snack), calories + macros, micronutrients when available, daily targets |
| AI meal analysis | Photo → OpenAI → structured estimate → user review/edit → confirm → persist. Alternatives suggestions on request |
| Activity | Manual daily steps + active minutes + notes; goals like 10,000 steps/day |
| Workouts | Workout → exercises (name, muscle group) → sets (reps, weight, optional RPE, notes) |
| Sleep | Bedtime, wake-up, calculated duration, quality 1–5, notes; targets like 8 h/day |
| Dashboard | Greeting, deterministic Progress Score (25% nutrition / 25% activity / 25% sleep / 25% goal consistency), Today panel, Body Progress comparisons |
| AI insights | Daily + weekly, generated from deterministic aggregates only |
| Gamification | Streaks, milestones, badges — nothing more |
| Localization | English (default) + Spanish from the beginning |
| Privacy | Soft deletes, `createdAt`/`updatedAt`/`deletedAt`, permanent full-data deletion path |

## Technology

- **Backend:** Node.js, TypeScript (strict), Express, PostgreSQL, Drizzle ORM, JWT, Zod,
  OpenAI API, REST with a consistent `{ ok, data | error }` envelope.
- **Mobile:** React Native (Expo), TypeScript, NativeWind, React Navigation, TanStack
  Query for server state, Zustand only for real client-side global state, i18n (en/es).
- **Layering:** routes → controller (thin) → service (business logic) → repository (DB).
  Controllers, services, and repositories are classes with constructor injection (NestJS
  style, without NestJS — no DI container, no decorators).

## Success criteria

The MVP is successful when the full demo flow in `docs/workflows/00-product-scope.md`
(register → set goal → configure targets → record measurements/photo → AI meal analysis →
confirm meal → record steps/workout/sleep → dashboard with Progress Score, daily progress,
body trends, and an AI insight) works reliably end to end.

## Where the details live

- `docs/workflows/00-product-scope.md` — scope, non-goals, risks, demo acceptance flow.
- `docs/workflows/01-project-foundation.md` — repo layout, tooling, app skeletons.
- `docs/workflows/02-database-design.md` — full PostgreSQL schema and API surface.
- `docs/workflows/03…14` — feature workflows, executed strictly in order.
