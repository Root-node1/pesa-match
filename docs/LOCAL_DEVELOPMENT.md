# Local Development

## Prerequisites

- Node.js 18+ (tested on 22.23.4)
- npm 10+
- Docker + Docker Compose (for PostgreSQL) — `docker-compose` v5.5.1 tested

## Setup

```bash
./run.sh setup
./run.sh db-up
# wait for healthy
./run.sh migrate
```

## Run

```bash
./run.sh dev          # backend + frontend
```

Backend: http://localhost:3001, API prefix `/api/v1`, Swagger at `/api/docs`.
Frontend: http://localhost:3000.

## Environment

Copy `apps/backend/.env.example` to `apps/backend/.env` (done by setup). Adjust secrets. Never commit `.env`.

## Database

- Host port: 5434 (avoids conflict with system Postgres on 5432 and paysplit on 5433).
- Credentials: pesa / pesa, database `pesa_match`.
- Test database: `pesa_match_test`.

## Tests

```bash
./run.sh test        # unit + e2e
./run.sh lint
./run.sh build
```

## Notes

- If Docker Compose is unavailable, `db-up`/`db-down` print a clear error and do not claim success.

## CI build sequence

1. `npm ci --legacy-peer-deps`
2. `cd apps/backend && npx prisma generate`
3. `cd apps/backend && npx prisma migrate deploy`
4. `npm run lint -w apps/backend`
5. `npm run build -w apps/backend`
6. `npm run test -w apps/backend`
7. `DATABASE_URL=... npm run test:e2e -w apps/backend`
