# Authentication

## Strategy

- Email + password.
- Passwords hashed with Argon2id.
- Short-lived JWT access tokens (default 15m) returned in response body.
- Rotating refresh tokens stored only as SHA-256 hashes in `RefreshSession`.
- Refresh token delivered via HTTP-only, Secure (configurable), SameSite cookie scoped to `/api/v1/auth`.
- Access tokens are not stored in local storage.

## Endpoints

- `POST /api/v1/auth/register` — creates user + organization + OWNER membership; issues tokens.
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh` — rotates refresh token, returns new access token.
- `POST /api/v1/auth/logout` — revokes session, clears cookie.
- `GET /api/v1/auth/me` — returns user + memberships (requires Bearer access token).

## Cookie / CORS

- CORS origins from `CORS_ORIGINS` (comma-separated), `credentials: true`.
- Cookie attributes from `REFRESH_COOKIE_SECURE`, `REFRESH_COOKIE_SAMESITE`, `REFRESH_COOKIE_NAME`.
- Refresh/logout validate the `Origin` header against allowed origins.

## CSRF

Origin validation on cookie-bearing endpoints plus SameSite cookie attribute. No double-submit token in this milestone.

## Rotation & revocation

- Each refresh creates a new `RefreshSession` and revokes the previous one.
- Reuse of a revoked token returns 401.
- Logout revokes the session; subsequent refresh with that token returns 401.
