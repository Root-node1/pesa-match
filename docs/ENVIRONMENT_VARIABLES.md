# Environment Variables

## Backend (`apps/backend/.env`)

| Variable | Required | Description |
|---|---|---|
| DATABASE_URL | yes | PostgreSQL connection string |
| NODE_ENV | no | development/production/test |
| PORT | no | API port (default 3001) |
| API_PREFIX | no | (default api/v1) |
| JWT_ACCESS_SECRET | yes | >=32 chars |
| JWT_ACCESS_EXPIRES_IN | no | default 15m |
| JWT_REFRESH_EXPIRES_IN_DAYS | no | default 30 |
| REFRESH_COOKIE_NAME | no | default pesa_refresh |
| REFRESH_COOKIE_SECURE | no | true/false |
| REFRESH_COOKIE_SAMESITE | no | lax/strict/none |
| CORS_ORIGINS | no | comma-separated (default http://localhost:3000) |

## Frontend (`apps/frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| NUXT_PUBLIC_API_BASE | no | default http://localhost:3001/api/v1 |

## Root

`.env.example` mirrors backend essentials for reference.
