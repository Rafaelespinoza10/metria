# Metria — Demo Guide

Two minutes from a fresh checkout to a living dashboard.

## Setup

```bash
# Backend (PostgreSQL 16 via Docker on port 5433)
cd backend
docker compose up -d
cp .env.example .env          # add OPENAI_API_KEY to enable AI features
npm install
npm run db:migrate && npm run db:seed
npm run db:demo               # demo@metria.app / metria-demo-123 (local demos only)
npm run dev                   # http://localhost:3000

# Mobile app
cd ../frontend
npm install
EXPO_PUBLIC_API_URL=http://<your-lan-ip>:3000 npm start
```

The demo account ships with 14 days of meals, activity, sleep, 7 workouts, goals,
targets, and a body trend (83.0 → 81.6 kg) — the dashboard, achievements, and insights
are populated from the first login.

## The §21 acceptance flow, step by step

| # | Step | Where | Notes |
|---|------|-------|-------|
| 1 | Register/login | Login screen | Use the demo account, or register fresh |
| 2 | Set goal: lose fat | Home → Goals → New goal | Demo account already has it |
| 3 | Configure targets (2200 kcal / 170 g / 10k steps / 8 h) | Nutrition ⚙ / Activity ⚙ / Sleep ⚙ | Pre-set for the demo user |
| 4 | Record weight and measurements | Home → Measurements → Log | |
| 5 | Upload progress photo | Measurements → Photos → + | Live from the camera roll |
| 6–9 | Meal photo → AI analysis → correct → confirm | Nutrition → camera button | Requires `OPENAI_API_KEY`; values are editable estimates, nothing saves without Confirm |
| 10 | Record daily steps | Home → Activity | Idempotent per-day save |
| 11 | Record gym workout | Home → Workouts → New | Exercises + sets with RPE |
| 12 | Record sleep | Home → Sleep → Log | HH:MM with live duration |
| 13–16 | Dashboard: score, today, body trends | Home | Score is deterministic (25/25/25/25) |
| 17 | AI insight | Home → Insights | Requires `OPENAI_API_KEY`; cached per day/week |

## Without an OpenAI key

Everything works except meal-photo analysis, meal alternatives, and insights — those
degrade gracefully (`AI_UNAVAILABLE`) while manual logging and the dashboard stay fully
functional.
