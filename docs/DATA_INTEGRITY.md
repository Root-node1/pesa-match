# Data Integrity

- Imported source records are never overwritten; corrections create new match decisions and audit events.
- Idempotent imports via organization-scoped fingerprints.
- Monetary values are BigInt minor units; no floating point.
- Organization isolation enforced on every query.
- Audit events record actor, organization, action, entity, timestamp, metadata.
- Reversals mark `REVERSED` and record reason; original match retained.
- CSV exports sanitize formula injection.
