# Workflow 15 — Home Trends and Professional Profile

## Objective

The Home screen graduates from "today's numbers" to a modern metrics dashboard — a
7/14/30-day trend chart, a streak/workouts/active-minutes stat row — and the user area
becomes a serious profile: account stats at a glance and a shareable PDF progress
report generated from deterministic backend data.

## User value

Home answers "how am I trending?" without leaving the screen, and the profile turns the
app's data into a professional artifact (a PDF report) the user can share with a coach,
nutritionist, or doctor.

## Scope

- **Trends endpoint (backend)** — per-day series of calories, steps, and sleep minutes
  for the last 7 / 14 / 30 days ending "today" (user timezone), with the effective
  targets and a `tracked` flag per day (any meal, activity, sleep, or workout log). The
  series math lives in `AggregatesService.dailySeries` — deterministic, no LLM
  (Rule 13), reusing the same repositories as the daily/weekly aggregates.
- **Report endpoint (backend)** — one call returns everything the PDF needs for the
  last 30 days: user identity (name, email, member-since), period, Progress Score with
  delta, tracked-day averages vs targets (calories, protein, steps, sleep), body deltas
  and workout counts (reusing `ProgressService.body('30d')`), tracking consistency
  (tracked days + streaks from the gamification tables), and badge counts. The client
  renders the document; the backend only aggregates.
- **Home redesign (frontend)** — keeps the Progress Score hero, Today panel, Body
  Progress, and quick actions, and adds:
  - *Stat row*: three cards — tracking streak (gamification state), workouts this week
    (body progress), active minutes today (today panel) — varied emphasis, not a
    uniform grid.
  - *Trends section*: window chips (7/14/30 days) + metric chips (calories / steps /
    sleep) over an SVG bar chart with a dashed target line and period average, built
    with `react-native-svg` (already a dependency), bars animating on mount.
- **Profile upgrade (frontend)** — Settings becomes a profile screen: identity card
  with initials avatar and member-since, account stat tiles (streak, longest streak,
  badges earned), and a **"Progress report (PDF)"** action that fetches the report
  endpoint, renders a print-styled HTML document, and hands it to the OS share sheet
  via `expo-print` + `expo-sharing`. Existing name/language editing, logout, and
  delete-account flows stay.

### Decisions

- **The PDF is generated on-device** (`expo-print` HTML → file → share sheet). The
  backend stays a JSON API — no server-side PDF library, no file storage, nothing new
  to secure or clean up. The report HTML builder is a pure function so it unit-tests
  without native modules.
- **Trend windows reuse the "N days ending today" convention** from the body windows —
  no calendar-week alignment, so the chart always ends on today's bar.
- **Averages count tracked days only** (days with a log for that metric), matching how
  `previous7Days` averages already work; zero-filling untracked days would fake
  adherence downward.
- **Streaks come from the existing gamification tables** — the report reads them, it
  does not recompute them, so there is exactly one streak definition in the codebase.

## Non-goals

- No new gamification rules, no charts on other screens, no CSV/email export, no
  server-side rendering. Insights (LLM) remain untouched — this workflow is 100 %
  deterministic data.

## Data model involved

Read-only over meals, activity, sleep, workouts, measurements, daily_targets, users,
user_streaks, badges, user_badges. No migrations.

## Backend tasks

- [ ] `AggregatesService.dailySeries(userId, from, to)` — per-day calories/steps/sleep
      + `tracked` flag (includes workout days).
- [ ] `ProgressService.trends(userId, days)` and `ProgressService.report(userId)`
      (gains the `GamificationRepository` dependency for streaks/badges).
- [ ] Routes/controller: `GET /api/progress/trends`, `GET /api/progress/report`.
- [ ] Integration tests with hand-computed expectations (see Tests).

## Frontend tasks

- [ ] `progress` feature: trends + report types, API functions, hooks.
- [ ] `TrendChart` SVG component (bars + dashed target line), pure scaling helpers.
- [ ] Home: stat row + trends section, skeletons shaped like the layout, en/es strings.
- [ ] Settings/profile: identity card, stat tiles, PDF export action (`expo-print`,
      `expo-sharing`), pure `buildReportHtml` helper.
- [ ] Jest tests for chart scaling helpers and the report HTML builder.

## API contracts

All `(auth)`, standard envelope.

```text
GET /api/progress/trends?days=7|14|30   200 → { days, from, to,
                                          targets: { calories, steps, sleepMinutes },
                                          series: [{ date, calories, steps,
                                                     sleepMinutes, tracked }] }
                                          (targets numbers | null; series has one entry
                                           per day, zeros when nothing logged)
GET /api/progress/report                200 → { generatedAt, period: { from, to },
                                          user: { name, email, memberSince },
                                          score: { score, previousScore, delta },
                                          averages: { calories, protein, steps,
                                                      sleepMinutes },   (null w/o data)
                                          targets: { calories, protein, steps,
                                                     sleepMinutes },
                                          body: { metrics, workouts },  (30d window)
                                          tracking: { trackedDays, totalDays,
                                                      streak: { current, longest } },
                                          badges: { earned, total } }
```

## Validation rules

- `days` ∈ {7, 14, 30}, default 7 (Zod coerced number enum). Report takes no input —
  always the 30-day window ending today in the user's timezone.

## Security considerations

- Read-only, all scoped by `userId`; no new attack surface. The PDF never leaves the
  device unless the user shares it from the OS sheet.

## Acceptance criteria

- Seeded data produces hand-computed series values, tracked flags, averages, and
  report numbers; untracked days appear as zero-value entries, not gaps.
- Home shows streak/workouts/active-minutes and a working 7/14/30-day chart with
  metric switching; profile exports a PDF whose numbers match the report endpoint.
- All CI checks green in both apps.

## Tests

Backend: series over a seeded week (values per day, zeros on empty days, tracked flag
from a workout-only day); trends targets resolve to the effective daily targets;
`days` outside the enum → 400; report averages/tracking/badges match seeds; report on
an empty account returns zeros/nulls without crashing. Frontend Jest: chart scaling
helpers (max/target normalization, nice upper bound) and `buildReportHtml` (renders
values, omits target rows when null, escapes user-provided names).

## Definition of done

- [ ] Acceptance criteria pass locally and in CI; checklists updated; summary reported.
