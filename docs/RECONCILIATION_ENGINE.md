# Reconciliation Engine

## Status model

- `MATCHED` — fully allocated.
- `PARTIALLY_PAID` — partially allocated.
- `UNMATCHED` — no allocation and no suggestion.
- `REVIEW_REQUIRED` — suggested match awaiting human review.
- `DUPLICATE_SUSPECTED` — likely duplicate payment.

Order statuses: OPEN / PARTIALLY_PAID / PAID / CANCELLED.
Payment statuses: UNALLOCATED / PARTIALLY_ALLOCATED / FULLY_ALLOCATED / DUPLICATE_SUSPECTED.

## Allocations

`PaymentMatch` represents an allocation of a payment amount to an order. `status`:
- `APPROVED` — applied to balances.
- `SUGGESTED` — pending review.
- `REJECTED` — declined.
- `REVERSED` — undone.

Multiple payments can allocate to one order; one payment can allocate across orders (manual). Over-allocation is rejected.

## Run

`POST /api/v1/reconciliation/run` evaluates all eligible records in a serializable transaction, applies rules, updates statuses, records an audit event, returns `{ autoMatches, suggestions, duplicates }`. Safe to repeat.

## Reporting

`GET /reconciliation/summary`, `/exceptions`, `/matches`. `GET /exports/reconciliation`, `/exports/exceptions` (CSV).

## Concurrency

Serializable transaction + DB constraints prevent double allocation.
