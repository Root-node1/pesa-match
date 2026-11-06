# Deployment

Architecture: Cloudflare Workers (Nuxt frontend) -> RumptyCloud (NestJS + PostgreSQL).

## Status
- Backend Dockerfile: created.
- Frontend build: verified.
- Cloudflare/RumptyCloud deployment: not performed (no credentials in this environment).
- CI: GitHub Actions added.

## Commands
- Backend build: `npm run build -w apps/backend`
- Frontend build: `npm run build -w apps/frontend`
- Container: `docker build -f apps/backend/Dockerfile -t pesa-backend .`
