# Reconciliation API Contracts

Base: `/api/v1`

## Runs
- `POST /reconciliation/run` body `{ periodStart?, periodEnd? }` -> `{ runId, autoMatches, suggestions, duplicates }` (FINANCE+)
- `POST /reconciliation/runs` body `{ periodStart, periodEnd }` (FINANCE+)
- `GET /reconciliation/runs` (auth)
- `GET /reconciliation/runs/:id` (auth)
- `POST /reconciliation/runs/:id/complete` (FINANCE+)
- `POST /reconciliation/runs/:id/reopen` (ADMIN/OWNER)

## Exceptions
- `GET /reconciliation/exceptions` -> derived exceptions (auth)
- `GET /reconciliation/exception-records?status=&type=&runId=` (auth)
- `POST /reconciliation/exceptions/:id/resolve` body `{ resolution, reason }` (FINANCE+)

## Other
- `GET /reconciliation/summary`
- `GET /reconciliation/matches?status=`
- `POST /matches/:id/approve|reject`, `POST /matches/manual`, `POST /matches/:id/reverse`, `GET /matches/:id/history`

Permissions: STAFF read; FINANCE+ run/resolve/manual; ADMIN/OWNER reverse/reopen.
