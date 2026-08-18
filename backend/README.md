# Metria Backend

Node.js + TypeScript (strict) + Express 5 + PostgreSQL (Drizzle ORM).

## Local database setup

```bash
docker compose up -d        # PostgreSQL 16 on localhost:5433 (db: metria)
cp .env.example .env        # DATABASE_URL already points at the compose DB
pnpm run db:migrate          # apply migrations in ./drizzle
pnpm run db:seed             # idempotent: system measurement types + badge keys
```

## Scripts

| Script                                                 | Purpose                                             |
| ------------------------------------------------------ | --------------------------------------------------- |
| `pnpm run dev`                                          | Dev server with reload (`tsx watch`)                |
| `pnpm run build` / `start`                              | Compile to `dist/` and run                          |
| `pnpm run typecheck` / `lint` / `format:check` / `test` | The CI gate                                         |
| `pnpm run db:generate`                                  | Generate SQL migrations from `src/database/schema/` |
| `pnpm run db:migrate`                                   | Apply migrations to `DATABASE_URL`                  |
| `pnpm run db:seed`                                      | Seed reference data (idempotent)                    |

Schema changes reach the database **only through migrations**: edit
`src/database/schema/*`, run `db:generate`, review the SQL in `drizzle/`, then
`db:migrate`.

The schema integration test (`src/database/schema.test.ts`) runs only when
`DATABASE_URL` is set; it is skipped automatically in CI.

## Architecture

Layered, class-based modules (NestJS style without NestJS): routes factory →
controller (thin) → service (business logic) → repository (DB). See
`docs/workflows/01-project-foundation.md` and `.claude/skills/pr-flow/SKILL.md`
for conventions and the PR process.
