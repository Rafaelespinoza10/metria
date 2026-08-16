# Workflow 01 — Project Foundation

## Objective

Scaffold the backend and mobile applications with production-oriented tooling (TypeScript
strict, lint, tests), the layered backend architecture, the response envelope, centralized
error handling, and the mobile app shell (navigation, server-state, i18n, theme) — so every
feature workflow starts from a working, verifiable base.

## User value

None directly visible; everything after this depends on it being solid.

## Scope

- Monorepo layout: `backend/`, `frontend/`, `docs/`, root `.gitignore`, git initialized.
- **Backend skeleton**
  - Node.js + TypeScript strict, Express.
  - `src/` structure: `modules/`, `ai/`, `config/`, `database/`, `shared/{errors,middlewares,types,utils}`, `app.ts`, `server.ts`.
  - Zod-validated environment config (`config/env.ts`) + `.env.example`.
  - Response envelope helpers (`ok` / error shape).
  - Centralized error handling: `AppError`, not-found handler, error middleware mapping
    Zod errors to `VALIDATION_ERROR` and unknown errors to `INTERNAL_ERROR`.
  - `GET /api/health` endpoint.
  - Tooling: `tsx` dev server, `tsc` typecheck, ESLint (typescript-eslint), Vitest +
    Supertest.
- **Frontend skeleton**
  - Expo (React Native) + TypeScript strict.
  - Feature-oriented `src/` structure: `features/{auth,dashboard,goals,measurements,nutrition,activity,workouts,sleep,insights}`, `components/`, `navigation/`, `services/`, `hooks/`, `store/`, `theme/`, `i18n/`.
  - NativeWind configured.
  - React Navigation with a root navigator and a placeholder Home screen.
  - TanStack Query provider.
  - i18n (i18next + react-i18next + expo-localization) with `en` (default) and `es`
    resource files; the placeholder screen uses translated strings only.
  - API client in `services/api.ts` that understands the `{ ok, data | error }` envelope.
  - Tooling: `tsc` typecheck, ESLint (eslint-config-expo).

### Decisions made in this workflow

- **Class-based backend modules (NestJS style, without NestJS):** controllers, services,
  and repositories are classes with constructor injection, wired manually in each module's
  `create<Module>Routes()` factory (no DI container, no decorators). Controller handlers
  are arrow-function properties so `this` stays bound when passed to Express. Example:
  `HealthController` + `createHealthRoutes()`.
- **Prettier** is the single formatter in both repos (`format` / `format:check` scripts;
  the frontend adds `prettier-plugin-tailwindcss`), with a root `.editorconfig`.

- **Expo managed workflow** for React Native: lowest-friction, reversible (prebuild/eject
  exists), and consistent with "boring, understandable" tooling.
- **No database code yet** — Drizzle setup and schema land in Workflow 02 so the schema is
  implemented directly from the finalized design document.
- Git is initialized with a root `.gitignore`; commits are left to the repository owner.
- `babel-preset-expo` is declared explicitly in `frontend/package.json`: in Expo SDK 57 it
  is nested under `expo`'s own `node_modules` and Babel cannot resolve it from a custom
  `babel.config.js` (required by NativeWind) without the explicit dependency.

## Non-goals

- No auth, no database connection, no feature endpoints, no real screens.
- No CI pipeline yet (added in `13-testing-and-hardening.md` if desired).
- No Zustand store yet (added when real client-global state first appears).

## Data model involved

None.

## Backend tasks

- [x] `package.json` with scripts: `dev`, `build`, `start`, `typecheck`, `lint`, `test`.
- [x] `tsconfig.json` with `strict: true`.
- [x] `config/env.ts` — Zod-parsed env; `.env.example`.
- [x] `shared/errors/` — `AppError`, error codes.
- [x] `shared/middlewares/` — `notFound`, `errorHandler`.
- [x] `shared/utils/respond.ts` — envelope helpers.
- [x] `app.ts` (Express app assembly) and `server.ts` (listen).
- [x] Health module (`modules/health/`) exposing `GET /api/health`.
- [x] ESLint + Vitest + Supertest configured.

## Frontend tasks

- [x] Expo TypeScript app in `frontend/`.
- [x] Feature-oriented `src/` directory structure.
- [x] NativeWind + Tailwind config.
- [x] React Navigation root stack + placeholder Home screen.
- [x] TanStack Query `QueryClientProvider`.
- [x] i18n setup with `en`/`es`, device-locale detection, English fallback.
- [x] Envelope-aware API client (`services/api.ts`).
- [x] Theme tokens (`theme/`).

## API contracts

```text
GET /api/health
200 → { "ok": true, "data": { "status": "ok" } }

Any unknown route
404 → { "ok": false, "error": { "code": "NOT_FOUND", "message": "…" } }
```

## Validation rules

- Environment variables validated with Zod at startup; the process fails fast with a
  clear message on invalid config.

## Security considerations

- `.env` git-ignored; only `.env.example` committed.
- Error handler never leaks stack traces or internal messages in responses; unknown errors
  return a generic `INTERNAL_ERROR`.
- JSON body size limited.

## Acceptance criteria

- `npm run dev` in `backend/` starts the server; `GET /api/health` returns the envelope.
- Unknown routes return the 404 envelope.
- `npm run typecheck`, `npm run lint`, `npm test` all pass in `backend/`.
- `npm run typecheck` and `npm run lint` pass in `frontend/`.
- The mobile app renders the placeholder screen with translated strings (en/es).

## Tests

- `health.test.ts` — `GET /api/health` returns `{ ok: true, data: { status: "ok" } }`.
- `not-found.test.ts` — unknown route returns the 404 error envelope.
- (Frontend tests begin in feature workflows; the foundation is verified by typecheck +
  lint.)

## Definition of done

- [x] All acceptance criteria pass locally.
- [x] Directory structures match `docs/PRODUCT.md`.
- [x] No `any` in source code; TypeScript strict mode on in both apps.
- [x] Checklist above updated; summary reported.
