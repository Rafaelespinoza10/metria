# Workflow 03 — Authentication

## Objective

Users can register, log in with JWT, manage their profile, recover their password
(architecture in place, console mailer for now), log out server-side, soft-delete their
account, and permanently delete all their data.

## User value

Secure, private access to personal wellness data; full control over account deletion.

## Scope

- **Register** — email + password + name (+ optional locale, timezone). Returns user + JWT.
- **Login** — email + password. Returns user + JWT.
- **JWT auth** — stateless Bearer tokens signed with `JWT_SECRET`; payload `{ sub, tv }`
  where `tv` is the user's `token_version`.
- **Logout** — increments `token_version`, invalidating every issued token (no blacklist
  table needed).
- **Profile** — get and update name/locale/timezone.
- **Password recovery architecture** — `forgot-password` issues a hashed, expiring
  (30 min), single-use token delivered through a `PasswordResetMailer` port (console
  implementation for now; a real provider plugs in later). `reset-password` consumes it
  and bumps `token_version`.
- **Soft delete** — sets `deleted_at`, bumps `token_version`; login and token auth reject
  soft-deleted users.
- **Permanent deletion** — requires current password; hard-deletes the user row (FK
  cascades remove all owned data — validated in the schema test).
- Auth middleware (`createAuthMiddleware`) attaching the authenticated user to `req.user`.
- CI gains a PostgreSQL service so the auth/user integration tests run on every PR.

### Decisions

- **Password hashing:** bcryptjs (cost 12) — pure JS, no native build friction in CI.
- **Single access token** (default 7 days) for the MVP; no refresh tokens until a real
  need appears. `token_version` already gives server-side revocation.
- **No user enumeration:** `forgot-password` always returns ok; login failures return a
  generic message.

## Non-goals

- No roles or permissions.
- No email provider integration (the mailer port isolates it).
- No refresh tokens, sessions table, or OAuth.
- No rate limiting yet (tracked for `13-testing-and-hardening.md`).

## Data model involved

`users` (adds `token_version integer NOT NULL DEFAULT 0` — migration 0001),
`password_reset_tokens` (already migrated).

## Backend tasks

- [x] Add `token_version` to `users`; generate + apply migration.
- [x] Env: `JWT_SECRET` (must be overridden in production), `JWT_EXPIRES_IN_SECONDS`.
- [x] `modules/auth/`: token service, mailer port + console mailer, password-reset
      repository, service, controller, routes, Zod schemas.
- [x] `modules/users/`: repository, service, controller, routes, Zod schemas, types.
- [x] `shared/middlewares/auth.ts` (`createAuthMiddleware`) + `req.user` typing.
- [x] Wire modules in `app.ts` composition root.
- [x] CI: PostgreSQL service + migrate/seed before tests.

## Frontend tasks

(Second PR of this workflow.)

- [x] Secure token storage (expo-secure-store) + Zustand auth store (real client state).
- [x] `features/auth`: Login and Register screens, TanStack Query mutations, profile query.
- [x] Navigation split: auth stack (Login/Register) vs app stack (Home) by auth state.
- [x] Logout from Home; en/es strings for all auth UI.

## API contracts

All responses use the standard envelope. `(auth)` = requires `Authorization: Bearer`.

```text
POST /api/auth/register        { email, password, name, locale?, timezone? }
                               201 → { user, token }        409 CONFLICT if email taken
POST /api/auth/login           { email, password }
                               200 → { user, token }        401 UNAUTHORIZED (generic)
POST /api/auth/logout          (auth) 200 → { loggedOut: true }   — revokes all tokens
POST /api/auth/forgot-password { email }        200 → { requested: true }  (always)
POST /api/auth/reset-password  { token, newPassword }
                               200 → { reset: true }        401 on invalid/expired/used
GET    /api/users/me           (auth) 200 → { user }
PATCH  /api/users/me           (auth) { name?, locale?, timezone? } 200 → { user }
DELETE /api/users/me           (auth) 200 → { deleted: true }          — soft delete
DELETE /api/users/me/permanent (auth) { password } 200 → { deleted: true } — hard delete
```

`user` shape: `{ id, email, name, locale, timezone, createdAt }` — never the hash.

## Validation rules

- Email: valid format, lowercased before storage/lookup.
- Password: min 8, max 72 (bcrypt limit) characters.
- Name: 1–100 chars. Locale: `en | es`. Timezone: valid IANA name (checked via `Intl`).
- Reset token: 64-char hex; new password same rules as registration.

## Security considerations

- Passwords hashed with bcrypt cost 12; hashes never leave the service layer.
- Reset tokens stored only as SHA-256 hashes; 30-minute expiry; single-use; generic
  responses prevent user enumeration.
- Soft-deleted users cannot log in and their tokens stop validating immediately.
- `JWT_SECRET` has a dev default but the app refuses to boot in production with it.
- Every subsequent resource route must use `createAuthMiddleware` and scope by
  `req.user.id`.

## Acceptance criteria

- Full register → login → me → update → logout → login flow works over HTTP.
- Password recovery cycle works end to end (token via mailer port).
- Soft delete blocks login/tokens; permanent delete removes every owned row.
- All CI checks green, including integration tests against the CI PostgreSQL service.

## Tests

Integration (HTTP-level, real DB; skipped only when `DATABASE_URL` is absent):

- register: success, duplicate email → 409, invalid body → 400.
- login: success, wrong password → 401, unknown email → 401 (same message).
- me: with token → profile; without/invalid token → 401.
- logout: token stops working afterwards.
- forgot/reset: full cycle; old password rejected; token single-use.
- soft delete: subsequent auth and login rejected.
- permanent delete: wrong password → 401; success removes user data.

## Definition of done

- [x] All acceptance criteria pass locally and in CI.
- [x] Checklists updated; summary reported; next workflow stated.
