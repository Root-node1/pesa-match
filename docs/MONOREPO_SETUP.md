# Monorepo Setup

## Structure

```
pesa-match/
├── apps/
│   ├── backend/        # NestJS API (port 3001)
│   └── frontend/       # Nuxt 4 UI (port 3000)
├── packages/
│   └── shared/         # Shared TS package (minimal)
├── docs/
├── scripts/
├── docker-compose.yml
├── .env.example
├── package.json        # npm workspaces
├── run.sh
└── README.md
```

## Package manager

npm workspaces. No pnpm/yarn/bun required.

## Entry point

`./run.sh` is the documented entry point. See `./run.sh help`.

## Prisma location

Prisma schema lives at `apps/backend/prisma/schema.prisma` because the ORM is owned by the backend. Migrations are stored under `apps/backend/prisma/migrations`. This differs from a root-level `prisma/` directory; the decision is documented here.

## Scaffold commands (idempotent)

`./run.sh setup` creates missing scaffolds using:
- `npx @nestjs/cli new backend --directory apps/backend --skip-git --skip-install --package-manager npm`
- `npx nuxi init apps/frontend --template ui --packageManager npm --no-install --no-gitInit`

Existing directories are never overwritten.
