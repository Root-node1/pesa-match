# Database Schema

PostgreSQL via Prisma. Schema: `apps/backend/prisma/schema.prisma`. Migration: `20261106161800_init`.

## Models

- `User` — id, email (unique), passwordHash, names, timestamps.
- `Organization` — id, name, currency (default KES), timestamps.
- `Membership` — user↔organization with `Role` (OWNER/ADMIN/FINANCE/STAFF); unique per (user, organization).
- `RefreshSession` — hashed refresh token, expiry, revocation, user agent, IP.
- `ImportBatch` — traceability for CSV imports (type, counts, errors).
- `Order` — organization-owned, amountMinor (BigInt, minor units), fingerprint (unique per org), status, reconciliationStatus.
- `Payment` — organization-owned, amountMinor (BigInt), transactionReference, fingerprint (unique per org), status, reconciliationStatus.
- `PaymentMatch` — allocation of payment to order (amountMinor, status, manual flag, reason, reversal fields).
- `AuditEvent` — actor, organization, action, entityType, entityId, before/after JSON, metadata, timestamp.
- `NotificationOutbox` — SMS/notification queue with idempotency key (unique per org), status, attempts, provider id.

## Money

All monetary values are `BigInt` minor units (KES). No floating point.

## Constraints

- Unique: User.email, Membership (userId, organizationId), RefreshSession.tokenHash, Order/Payment (organizationId, fingerprint), NotificationOutbox (organizationId, idempotencyKey).
- Indexes on organizationId and relevant lookups.
- Cascading deletes from Organization/User where appropriate.

## Enums

Role, ReconciliationStatus, OrderStatus, PaymentStatus, MatchDecisionStatus, NotificationStatus.

## Notes

Audit trail is application-level and not tamper-proof against database administrators.
