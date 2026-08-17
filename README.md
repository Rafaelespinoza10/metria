# Metria

> **Your habits. Your body. Your progress.**

Mobile-first personal wellness tracker connecting nutrition, body measurements, activity,
workouts, sleep, goals, and AI-generated insights.

## Repository layout

```text
backend/    Node.js + TypeScript + Express + PostgreSQL (Drizzle) REST API
frontend/   React Native (Expo) + NativeWind + React Navigation + TanStack Query
docs/       Product definition and development workflows (executed in order)
```

## Getting started

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev        # API at http://localhost:3000/api/health
```

Checks: `npm run typecheck` · `npm run lint` · `npm test`

### Mobile app

```bash
cd frontend
npm install
npm start          # Expo dev server; set EXPO_PUBLIC_API_URL to reach the API
```

Checks: `npm run typecheck` · `npm run lint`

## Contributing flow

All changes reach `develop` and `main` **only through pull requests** with green CI
(Prettier, lint, typecheck, tests). Atomic commits; one PR per area (backend/frontend);
periodic release PRs from `develop` to `main` with per-app GitHub releases. The full
process lives in `.claude/skills/pr-flow/SKILL.md`.

## Demo

`npm run db:demo` (backend) creates `demo@metria.app` with two weeks of realistic data —
see `docs/DEMO.md` for the two-minute walkthrough of the full acceptance flow.

## Development process

Work proceeds strictly workflow by workflow — see `docs/workflows/`. Start with
`docs/PRODUCT.md` for the finalized product definition.
