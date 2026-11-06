# PesaMatch — Project Overview

## Product

PesaMatch is a payment reconciliation and exception management application for small Kenyan businesses.

It helps a business compare its order records against payment records (typically imported from CSV exports), identify matched, partially paid, unmatched, review-required and suspected-duplicate payments, and resolve discrepancies through an auditable human review workflow. It is **not** a payment gateway, wallet, or live M-Pesa integration, and it is not a full accounting platform.

## Target user

Small Kenyan business owners and finance staff who receive payments (commonly via M-Pesa) against orders/invoices and need to reconcile them manually today.

## Confirmed technology stack

- Frontend: Nuxt 4, Vue, TypeScript, Nuxt UI (deployed to Cloudflare Workers).
- Backend: NestJS, Node.js, TypeScript (deployed to RumptyCloud via Docker).
- Database: PostgreSQL.
- ORM: to be selected during Milestone 1 from what is already configured; if none exists, Prisma.
- Local development: Docker Compose.
- SMS: ThriveWave SMS API (Milestone 4).

## Repository status (as audited)

The repository currently contains only `README.md`, `LICENSE`, and `.git`. There is **no** application scaffold, workspace configuration, package manager lockfile, database configuration, CI pipeline, or environment template yet. This is expected at Milestone 0; the foundations are established in later milestones.

## High-level data flow

```
Nuxt frontend (Cloudflare Workers)
        |
        | HTTPS / REST (JSON), cookie-based refresh sessions
        v
NestJS REST API (/api/v1)  (RumptyCloud, Docker)
        |
        | SQL via ORM
        v
PostgreSQL (RumptyCloud, Docker)
```

SMS notifications flow from the backend through a provider-independent SMS service to ThriveWave (Milestone 4).

## Multi-tenancy

PesaMatch is multi-tenant by organization. Every business record belongs to an organization. A user accesses records only through a membership in an organization with one of the roles: `OWNER`, `ADMIN`, `FINANCE`, `STAFF`. Organization-level data isolation is enforced on every backend operation.

## Monetary handling

All monetary values are stored and computed as integer minor units (or an equivalent exact decimal representation) in KES. Floating-point arithmetic is never used for money.

## Security posture

- Short-lived access tokens + rotating, hashed refresh tokens persisted server-side.
- Passwords hashed with Argon2id (or equivalent).
- Organization-scoped authorization guards.
- Explicit CORS origins with credentials for the separate Cloudflare frontend and API domains.
- Secrets only in environment variables; never in frontend source or repository.
- Audit trail for matching decisions and corrections (application-level, not tamper-proof against DBAs).

## Current milestone

Milestone 0 — Repository audit and implementation plan (this document set). No product features implemented.
