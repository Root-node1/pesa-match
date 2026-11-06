# pesa-match

PesaMatch — payment reconciliation and exception management for small Kenyan businesses.

## Status

Milestone 0 complete: repository audit and implementation plan. No product features implemented yet.

## Stack

- Frontend: Nuxt 4, Vue, TypeScript, Nuxt UI (Cloudflare Workers).
- Backend: NestJS, Node.js, TypeScript (RumptyCloud, Docker).
- Database: PostgreSQL.
- Local dev: Docker Compose.
- SMS: ThriveWave SMS API (planned, Milestone 4).

## Repository

- Remote: `git@github.com:Root-node1/pesa-match.git`
- Branch: `main`

## Documentation

See `docs/`:

- `PROJECT_OVERVIEW.md`
- `ARCHITECTURE.md`
- `IMPLEMENTATION_ROADMAP.md`

Further documents are added per milestone.

## Setup

No application code exists yet. Setup instructions will be added in Milestone 1.

## Notes

- Monetary values are stored as integer minor units (KES). No floating point for money.
- Multi-tenant by organization; organization-level data isolation enforced on every backend operation.
- Secrets are never committed; use `.env.example` (added in later milestones).
