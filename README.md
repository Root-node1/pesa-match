# pesa-match

PesaMatch — payment reconciliation and exception management for small Kenyan businesses.

## Status

Milestone 4 complete: ThriveWave SMS integration (provider abstraction + outbox; live unverified).

## Stack

- Frontend: Nuxt 4, Vue, TypeScript, Nuxt UI (Cloudflare Workers).
- Backend: NestJS, Node.js, TypeScript (RumptyCloud, Docker).
- Database: PostgreSQL + Prisma.
- Local dev: Docker Compose.
- SMS: ThriveWave (provider abstraction + outbox; live unverified).

## Structure

See `docs/MONOREPO_SETUP.md`.

## Requirements

- Node.js 18+ (tested 22.23.4)
- npm 10+
- Docker + Docker Compose

## Setup

```bash
./run.sh setup
./run.sh db-up
./run.sh migrate
```

## Frontend

Nuxt 4 app in `apps/frontend`. Screens: dashboard, orders, payments, imports, reconciliation, settings, auth.


```bash
./run.sh dev        # backend + frontend
./run.sh test       # unit + e2e
./run.sh lint
./run.sh build
./run.sh generate
./run.sh db-down
./run.sh help
```

## Environment

`apps/backend/.env.example`, `apps/frontend/.env.example`. Copy to `.env` (setup does). Never commit secrets.

## API

Base `/api/v1`. Swagger at http://localhost:3001/api/docs. See `docs/API_CONTRACT.md`.

## Database & migrations

Prisma schema: `apps/backend/prisma/schema.prisma`. Migrations: `apps/backend/prisma/migrations`.

```bash
./run.sh migrate
./run.sh generate
```

## Testing & linting

```bash
./run.sh test
./run.sh lint
```

## Deployment

- Frontend: Cloudflare Workers (Milestone 3).
- Backend + DB: RumptyCloud via Docker (Milestone 5).

## SMS

Provider abstraction and outbox implemented. Live ThriveWave submission unverified (missing API docs).

## Implementation status

- Backend foundation, auth, organizations, memberships, health, Prisma models implemented.
- Orders, payments, CSV imports, reconciliation engine, human review, reporting and exports implemented.
- Frontend integrated with real backend; screens implemented.
- Reconciliation engine is Milestone 2.

## Known limitations

- CSV import requires integer minor units.
- Live ThriveWave submission not verified.
- Frontend uses default Nuxt UI template styling; designer refinement pending.
- Audit trail is application-level, not tamper-proof.

## Documentation

`docs/` contains architecture, setup, auth, schema, API, security, env.

## Docker (backend)

```bash
cd apps/backend
docker build -t pesa-backend .
docker run -p 3001:3001 --env-file .env pesa-backend
```
