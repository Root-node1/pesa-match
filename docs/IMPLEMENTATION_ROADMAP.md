# PesaMatch — Implementation Roadmap

Work is delivered one milestone at a time. Each milestone ends with tests, documentation, a conventional commit and a push to `origin/main`. Do not start the next milestone without approval.

## Milestone 0 — Repository audit and implementation plan (CURRENT)

- Audit repository, tooling, remote, branch safety.
- Produce `docs/PROJECT_OVERVIEW.md`, `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_ROADMAP.md`, update `README.md`.
- Add baseline `.gitignore`.
- **Status:** in progress.

## Milestone 1 — Backend foundation, authentication and database models

- NestJS modular backend, DTO validation, global error handling, env validation, Swagger.
- Email/password auth with Argon2id, JWT access tokens, rotating hashed refresh sessions, logout revocation, CORS/CSRF handling.
- Organization + membership + roles (OWNER/ADMIN/FINANCE/STAFF).
- Initial Prisma schema + migrations: User, Organization, Membership, RefreshSession, ImportBatch, Order, Payment, PaymentMatch, AuditEvent, SmsMessage/NotificationOutbox.
- Endpoints: health, register, login, refresh, logout, me.
- Tests for auth, hashing, refresh rotation, revocation, org isolation, roles, constraints.
- Docs: AUTHENTICATION, DATABASE_SCHEMA, API_CONTRACT, SECURITY, LOCAL_DEVELOPMENT.

## Milestone 2 — Orders, payments, CSV imports and reconciliation engine (COMPLETE)

- Order/payment CRUD + CSV import with templates and row-level errors.
- Idempotent imports via fingerprints.
- Deterministic matching engine with partial payments, locking, concurrency safety.
- Human review: approve/reject, manual associate, reverse with reason, history.
- Reconciliation reports + CSV export.
- Tests: matching, partials, duplicates, repeated imports, invalid rows, concurrency, manual decisions, audit, isolation.
- Docs: IMPORT_FORMATS, RECONCILIATION_ENGINE, MATCHING_RULES, API_CONTRACT, DATA_INTEGRITY.

## Milestone 3 — Frontend integration foundation and designer handoff

- Nuxt 4 + Nuxt UI foundation, service-layer API client, auth state, protected routes.
- Screens: login, register, dashboard, orders, payments, CSV import, exceptions, review detail, settings.
- Reusable components and design system.
- Cloudflare Workers readiness (Wrangler, runtime config).
- Docs: FRONTEND_ARCHITECTURE, DESIGN_SYSTEM, FRONTEND_HANDOFF.

## Milestone 4 — ThriveWave SMS integration

- Provider-independent SMS service + ThriveWave adapter from verified docs.
- Outbox model, idempotency, retry, status tracking, webhook signature verification.
- Optional owner notification on reconciliation completion.
- Fake provider for tests.
- Docs: SMS_INTEGRATION, NOTIFICATION_FLOW, ENVIRONMENT_VARIABLES.

## Milestone 5 — Deployment readiness and hackathon handoff (COMPLETE)

- Backend Dockerfile, production config, health checks, migration procedure, structured logging.
- Frontend Cloudflare build/Wrangler config.
- GitHub Actions CI for lint/typecheck/test/build (api + web).
- Final documentation set + README.
- Docs: DEPLOYMENT, HACKATHON_DEMO.

## Out of scope (explicitly)

- Full accounting platform, payment gateway, wallet, live M-Pesa integration.
- Tamper-proof audit trail claims.
- Automated deployment to user accounts without explicit approval.
