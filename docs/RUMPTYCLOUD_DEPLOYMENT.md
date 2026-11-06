# RumptyCloud Deployment

1. `cd apps/backend`
2. Build backend image: `docker build -t pesa-backend .`
2. Push to RumptyCloud registry or use Git deployment.
3. Set env vars (see PRODUCTION_ENVIRONMENT.md).
4. Run migrations: `npx prisma migrate deploy` (not `migrate dev`).
5. Start container with restart policy.
6. Verify `GET /api/v1/health`.

No database ports should be exposed publicly.

## Local verification performed
- Docker image built successfully.
- Container started and `/api/v1/health` returned `{"status":"ok","database":"up"}`.
- Prisma migrations applied to PostgreSQL.
- No secrets baked into image.
