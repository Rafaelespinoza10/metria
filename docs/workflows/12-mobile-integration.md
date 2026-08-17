# Workflow 12 — Mobile Integration

## Objective

Close the loops that make Metria feel like one product instead of independent forms: a
profile/settings area (edit name, switch language, manage the account), account deletion
flows wired to the existing backend, and the Home header leading into it.

## User value

The user controls their identity, language, and data lifecycle from inside the app.

## Scope

- **Settings screen (frontend)** — profile card (name, email), edit name, language
  switch (en/es — persists `locale` via `PATCH /api/users/me`, applies to i18n and the
  session store immediately), log out, and an account section: soft delete
  (deactivate) and permanent deletion.
- **Delete account screen (frontend)** — explains both options; permanent deletion
  requires the current password (`DELETE /api/users/me/permanent`) and signs out on
  success; soft delete (`DELETE /api/users/me`) signs out on success.
- **Home header** — the top-right button becomes the profile entry (settings); logout
  moves into Settings.
- No backend changes — every endpoint shipped in Workflow 03.

### Decisions

- Language preference lives on the server (`users.locale`) so it follows the account
  across devices; the store applies it locally on change and at sign-in (already built).
- Destructive actions live on their own screen with explicit copy — no buried buttons.

## Non-goals

- No Apple Health / Google Health Connect (still out of MVP scope).
- No avatar upload, no notification settings.

## Data model involved

None (uses existing `/api/users/me` endpoints).

## Backend tasks

None.

## Frontend tasks

- [x] `features/settings`: settings screen (profile, name editor, language chips,
      logout, danger zone) + delete-account screen (soft + password-confirmed permanent).
- [x] Home header → Settings; hooks for `PATCH /users/me` and both deletes.
- [x] en/es strings; Jest test for the profile-update hook helper logic.

## API contracts

Existing: `GET/PATCH /api/users/me`, `DELETE /api/users/me`,
`DELETE /api/users/me/permanent`, `POST /api/auth/logout`.

## Validation rules

- Name 1–100 chars client-side (server re-validates); permanent delete requires a
  non-empty password.

## Security considerations

- Permanent deletion demands the current password (server-enforced); both deletions
  clear the local session and secure storage.

## Acceptance criteria

- Changing the language updates the UI instantly and survives sign-out/sign-in.
- Renaming updates the greeting; both deletion paths sign the user out.
- All CI checks green.

## Tests

Frontend Jest: locale option mapping + store user update on profile save. Backend flows
already covered in Workflow 03's suite.

## Definition of done

- [x] Acceptance criteria pass locally and in CI; checklists updated; summary reported.
