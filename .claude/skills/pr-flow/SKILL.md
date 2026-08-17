---
name: pr-flow
description: Mandatory git/PR/release flow for Metria — atomic commits, one PR per area (backend/frontend/docs), CI (Prettier + lint + typecheck + tests) must pass before merging to develop, periodic release PRs to main with per-app GitHub releases. Use for ANY commit, merge, or release in this repository.
---

# Metria PR Flow

Every change in this repository reaches `develop` and `main` **only through pull
requests**. Never commit directly to `main` or `develop`.

## Branches

- `main` — production/release history. Only receives merges from `develop` via release PRs.
- `develop` — integration branch. Base for all feature PRs.
- Working branches from `develop`, named by area and intent:
  - `feat/backend-<topic>`, `fix/backend-<topic>`
  - `feat/frontend-<topic>`, `fix/frontend-<topic>`
  - `docs/<topic>`, `ci/<topic>`, `chore/<topic>`

## Commits

- **Atomic**: one logical change per commit; the repo must build at every commit.
- Conventional style with area scope: `feat(backend): …`, `fix(frontend): …`,
  `docs: …`, `ci: …`, `chore: …`, `test(backend): …`.
- Backend and frontend changes are **never mixed** in the same PR. If a feature spans
  both, open two PRs (backend first, then frontend consuming it).

## Pull requests

1. Branch from up-to-date `develop`; commit atomically; push with `-u origin <branch>`.
2. Open the PR against `develop` with `gh pr create --base develop`, including a summary
   and test plan.
3. **Wait for CI**: `gh pr checks <number> --watch`. CI runs Prettier (`format:check`),
   lint, typecheck, and tests in BOTH apps (backend: Vitest against a PostgreSQL service;
   frontend: Jest with jest-expo).
4. **If any check fails: do NOT merge.** Fix on the branch, push, and watch checks again.
5. Only when everything is green: `gh pr merge <number> --merge --delete-branch`.
6. Feature/fix PRs that add or change behavior must include or update tests — backend
   (services/endpoints) and frontend (stores, utilities, components) alike. A PR without
   tests for new behavior is incomplete.

## Releases

After a coherent batch of PRs lands on `develop` (typically a completed workflow or
phase) and CI on `develop` is green:

1. Bump `version` in `backend/package.json` and/or `frontend/package.json` (semver) in a
   final PR to `develop` if not already bumped.
2. Open a release PR: `gh pr create --base main --head develop --title "release: vX.Y.Z"`.
3. Wait for CI; merge only if green (`--merge`, do not delete `develop`).
4. Create one GitHub release per app that changed, tagging `main`:
   - `gh release create backend-vX.Y.Z --target main --title "Backend vX.Y.Z" --notes "…"`
   - `gh release create frontend-vX.Y.Z --target main --title "Frontend vX.Y.Z" --notes "…"`
   - Notes summarize the merged PRs (`gh pr list --state merged --base develop`).

## Golden rules

- No PR merges with failing or pending checks. No exceptions.
- Tests run always; a red test suite blocks the merge until fixed.
- `main` is always releasable.
