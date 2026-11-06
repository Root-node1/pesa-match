# Security

## Tenancy

- Every business record carries `organizationId`.
- Authenticated principal includes user id and memberships; business queries must filter by the user's organization.
- Cross-organization access is tested in `test/auth.e2e-spec.ts` (two users see only their own organization).

## Authorization

- Roles: OWNER, ADMIN, FINANCE, STAFF.
- `@Roles(...)` decorator + `RolesGuard`.
- Registering user becomes OWNER of a new organization.

## Passwords

- Argon2id via `argon2`.

## Tokens

- Access: short-lived JWT signed with `JWT_ACCESS_SECRET`.
- Refresh: high-entropy random token; only SHA-256 hash persisted; rotation on use; revocation on logout.
- Refresh cookie: HTTP-only, Secure (configurable), SameSite, scoped path.

## CORS / CSRF

- Explicit origin allow-list (`CORS_ORIGINS`), credentials enabled.
- Origin header validation on cookie-bearing endpoints.

## Secrets

- No secrets in frontend source or repository. `.env` files gitignored; `.env.example` provided.

## Audit

- Application-level audit events record actor, organization, action, record, timestamps, before/after. Not tamper-proof against DBAs.

## Headers

- Helmet enabled.

## Permissions matrix

- STAFF: create/view orders/payments, run reconciliation, approve/reject suggestions, manual match.
- FINANCE: same as STAFF.
- ADMIN/OWNER: all above + reverse approved matches.
