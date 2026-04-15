# Contributing to Kagoj

Thanks for your interest! This is a small project and PRs are welcome.

## Dev setup

Prereqs: Node 22+, pnpm 9+, a running PostgreSQL 16 instance.

```bash
git clone https://github.com/Adib23704/kagoj.git
cd kagoj
cp .env.example .env     # set DATABASE_URL to your Postgres + set NEXTAUTH_SECRET
pnpm install
pnpm db:push
pnpm dev
```

## Commit style

Conventional Commits (e.g., `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`).

## Before opening a PR

- `pnpm lint` passes
- `pnpm typecheck` passes
- `pnpm test` passes
- New code has tests when applicable
