# Database Operations

- Dev migrations: `./run.sh migrate` (prisma migrate dev).
- Prod migrations: `npx prisma migrate deploy`.
- Never use `migrate reset` in production.
- Backups: use managed Postgres backups or pg_dump.
- Demo seed: `npm run demo:seed` (idempotent, safe).
