# PesaMatch — Architecture

## Deployment model

```
┌────────────────────────────┐         ┌──────────────────────────────┐
│  Cloudflare Workers         │  HTTPS  │  RumptyCloud (Docker)        │
│  Nuxt 4 frontend (SSR/edge)│ ──────► │  NestJS REST API (/api/v1)   │
│  Runtime config: API URL   │         │  PostgreSQL                  │
└────────────────────────────┘         └──────────────────────────────┘
                                                  │
                                                  ▼
                                          ThriveWave SMS API
                                          (backend only, M4)
```

- Frontend and backend are **independently deployable**.
- The frontend never holds backend secrets; it receives only a public API base URL via runtime config.
- The backend is the only component that talks to PostgreSQL and to ThriveWave.

## Repository layout (intended, established in later milestones)

```
pesa-match/
├── apps/
│   ├── api/                 # NestJS backend
│   └── web/                 # Nuxt 4 frontend
├── packages/                # Shared types/contracts (only if justified)
├── docs/
├── docker-compose.yml       # Local dev: Postgres (+ api, web optional)
├── .env.example
└── README.md
```

Package manager: npm workspaces (npm is the available tooling; pnpm/yarn/bun are not installed in the current environment). This choice is revisitable only if a later milestone requires it and the user approves.

## Backend architecture (NestJS)

Modular, organized by responsibility:

- `AuthModule` — registration, login, refresh, logout, current user.
- `UsersModule` — user profile/management.
- `OrganizationsModule` — organization lifecycle.
- `MembershipsModule` — membership + role management.
- `HealthModule` — liveness/readiness (`GET /api/v1/health`).
- `DatabaseModule` — Prisma/ORM client + migrations.
- `ConfigModule` — validated environment configuration.

Cross-cutting:

- Global validation pipe (class-validator DTOs).
- Global exception filter with consistent error envelope.
- Auth + role guards and decorators (`@Roles(...)`).
- Organization scoping interceptor/filter on business queries.
- Swagger/OpenAPI at `/api/docs` (or configured path).

API versioning: all routes under `/api/v1`.

## Authentication flow

1. `POST /api/v1/auth/register` creates a user + organization + OWNER membership; returns short-lived access token (in response body) and sets an HTTP-only, Secure, SameSite cookie containing the rotating refresh token.
2. `POST /api/v1/auth/login` same token issuance.
3. `POST /api/v1/auth/refresh` rotates the refresh token: validates cookie, checks hashed token in DB, issues new access token + new refresh token, revokes old session.
4. `POST /api/v1/auth/logout` revokes the refresh session and clears the cookie.
5. `GET /api/v1/auth/me` returns the authenticated user + memberships.

CORS: explicit allow-list of frontend origins (local dev origin and production Cloudflare origin) with `credentials: true`. Refresh/logout are additionally protected against CSRF via origin validation and SameSite cookie attributes.

Refresh tokens are stored **only as hashes** in `RefreshSession`. Access tokens are short-lived JWTs.

## Data model (planned, Milestone 1)

Entities: `User`, `Organization`, `Membership`, `RefreshSession`, `ImportBatch`, `Order`, `Payment`, `PaymentMatch`, `AuditEvent`, `SmsMessage`/`NotificationOutbox`.

Every business entity carries `organizationId`. Unique constraints and indexes support idempotent imports and concurrency-safe allocation. Monetary fields are integer minor units. Timestamps (`createdAt`, `updatedAt`) on all tables.

## Reconciliation domain (Milestone 2)

- CSV import of orders and payments with row-level validation and `ImportBatch` traceability.
- Idempotent imports via stable source identifiers / deterministic fingerprints scoped to an organization.
- Deterministic matching: exact reference / exact amount / compatible identifiers only. Uncertain matches become `REVIEW_REQUIRED` suggestions.
- Payment allocation supports partial payments and split allocation across orders, with DB transactions + locking to prevent double allocation.
- Match states: `MATCHED`, `PARTIALLY_PAID`, `UNMATCHED`, `REVIEW_REQUIRED`, `DUPLICATE_SUSPECTED`.
- Human review: approve/reject suggestion, manual associate, reverse match (with mandatory reason), full history.
- Reports computed from authoritative DB records; CSV export for results and exceptions.
- Audit events record actor, organization, action, affected record, timestamp, before/after where appropriate.

## Frontend architecture (Nuxt 4) — Milestone 3

- API access centralized in a service layer (no fetch in page components).
- Runtime config for API base URL.
- Auth state composable + protected route middleware.
- Reusable components: navigation, metric cards, data tables, status badges, filters, empty/loading/error states, confirmation dialogs, form validation.
- Cloudflare Workers deployment via supported Nuxt/Nitro Cloudflare preset + Wrangler.

## SMS (Milestone 4)

Provider-independent SMS service with a ThriveWave adapter built only from verified documentation. Outbox model (`SmsMessage`/`NotificationOutbox`) with idempotency, retry, and status tracking. Initial use case: optional owner notification on reconciliation completion (counts only, no sensitive transaction data). Fake provider for tests only.

## Security & tenancy enforcement

- All business queries filtered by the authenticated user's organization memberships.
- ID manipulation cannot cross organization boundaries (tested explicitly).
- Role guards for endpoint-level restrictions.
- No secrets in frontend or repository; `.env.example` documents all variables.

## Observability (Milestone 5)

Structured logging, health checks, production-safe DB (no exposed ports), CI via GitHub Actions.
