# Frontend Handoff

## Run
`./run.sh dev` (frontend :3000, backend :3001). Or `npm run dev -w apps/frontend`.

## Add a page
Create `app/pages/<area>/index.vue`, use `definePageMeta({ middleware: 'auth' })` for protected pages.

## Add API integration
Add method to `app/composables/api.ts`, type in `app/types/api.ts`.

## Auth
`useAuth()` provides login/register/logout/fetchMe/tryRefresh and user state. Access token in `pesa_access` cookie; refresh via backend cookie.

## Current screens
Dashboard, orders list/detail/new, payments list/detail/new, imports, reconciliation, settings, auth login/register.

## Known limitations
- Tables use basic columns; advanced filtering UI minimal.
- No charts.
- Cloudflare config not yet applied (see CLOUDFLARE_DEPLOYMENT.md).
