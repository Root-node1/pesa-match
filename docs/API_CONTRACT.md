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
