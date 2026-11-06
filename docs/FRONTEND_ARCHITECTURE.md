# Frontend Architecture

Nuxt 4 app in `apps/frontend`. Structure:

- `app/pages` — screens (auth, orders, payments, imports, reconciliation, settings, dashboard)
- `app/layouts/default.vue` — app shell/navigation
- `app/middleware/auth.ts` — protected route guard
- `app/composables/useAuth.ts` — session state
- `app/composables/api.ts` — centralized API client
- `app/types/api.ts` — API contract types

API base URL from `runtimeConfig.public.apiBase`. Access token stored in `pesa_access` cookie; refresh token is HTTP-only backend cookie. All requests use `credentials: 'include'`.

No business logic duplicated; backend authoritative.
