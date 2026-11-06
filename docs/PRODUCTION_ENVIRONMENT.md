# Production Environment

Backend env vars as in docs/ENVIRONMENT_VARIABLES.md. Use strong JWT secret, HTTPS cookie (REFRESH_COOKIE_SECURE=true, SameSite=none for cross-site), CORS_ORIGINS set to frontend origin. Database URL points to managed Postgres. SMS vars only when verified.
