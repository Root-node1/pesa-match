# API Contract

Base URL: `{API}/api/v1`. All responses use `{ success, data, statusCode?, message?, errors?, timestamp? }`.

## Endpoints

### Health
- `GET /api/v1/health` → `{ status, database, timestamp }`

### Auth
- `POST /api/v1/auth/register` body: `{ email, password, organizationName, firstName, lastName }` → `{ accessToken, user, organizationId }` + refresh cookie.
- `POST /api/v1/auth/login` body: `{ email, password }` → same.
- `POST /api/v1/auth/refresh` (cookie) → `{ accessToken }` + new refresh cookie.
- `POST /api/v1/auth/logout` (cookie) → null + cleared cookie.
- `GET /api/v1/auth/me` (Bearer) → `{ user, memberships }`.

## Validation

DTOs validated with class-validator; unknown fields rejected. Errors return 400 with `errors`.

## Auth errors

401 for missing/invalid/expired tokens or credentials; 409 for duplicate email; 403 for invalid origin.

## OpenAPI

Swagger UI: `/api/docs`.

## Orders
- `POST /api/v1/orders` body `{ externalReference?, customerName?, description?, amountMinor, currency?, orderDate? }`
- `GET /api/v1/orders` filters: status, reconciliationStatus, reference, dateFrom, dateTo, page, limit
- `GET /api/v1/orders/:id`

## Payments
- `POST /api/v1/payments`
- `GET /api/v1/payments` filters: reconciliationStatus, reference, dateFrom, dateTo, page, limit
- `GET /api/v1/payments/:id`

## Imports
- `POST /api/v1/imports/orders` multipart `file`
- `POST /api/v1/imports/payments` multipart `file`
- `GET /api/v1/imports`
- `GET /api/v1/imports/:id`

## Reconciliation
- `POST /api/v1/reconciliation/run`
- `GET /api/v1/reconciliation/summary`
- `GET /api/v1/reconciliation/exceptions`
- `GET /api/v1/reconciliation/matches?status=`

## Review
- `POST /api/v1/matches/:id/approve` body `{ reason? }`
- `POST /api/v1/matches/:id/reject` body `{ reason }`
- `POST /api/v1/matches/manual` body `{ orderId, paymentId, amountMinor, reason }`
- `POST /api/v1/matches/:id/reverse` body `{ reason }` (OWNER/ADMIN)
- `GET /api/v1/matches/:id/history`

## Exports
- `GET /api/v1/exports/reconciliation`
- `GET /api/v1/exports/exceptions`
