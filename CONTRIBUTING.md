# Contributing to Kagoj

Thanks for your interest! This is a small project and PRs are welcome.

## Dev setup

Prereqs: Node 22+, pnpm 9+, Docker (for Postgres).

```bash
git clone https://github.com/Adib23704/kagoj.git
cd kagoj
cp .env.example .env     # edit secrets
docker compose -f compose.dev.yml up -d postgres
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
