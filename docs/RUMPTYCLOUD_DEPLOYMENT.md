# RumptyCloud Deployment

1. Build backend image: `docker build -f apps/backend/Dockerfile -t pesa-backend .`
2. Push to RumptyCloud registry or use Git deployment.
3. Set env vars (see PRODUCTION_ENVIRONMENT.md).
4. Run migrations: `npx prisma migrate deploy` (not `migrate dev`).
5. Start container with restart policy.
6. Verify `GET /api/v1/health`.

No database ports should be exposed publicly.
