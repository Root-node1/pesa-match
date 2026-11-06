# Cloudflare Deployment

Frontend deploys to Cloudflare Workers/Pages. Do not deploy without approval.

## Build
`npm run build -w apps/frontend` (Nitro node-server preset by default).

For Cloudflare, set Nitro preset via env or nuxt config:
`NITRO_PRESET=cloudflare-pages` (or cloudflare) and rebuild.

## Wrangler
Create `wrangler.toml` with:
```
name = "pesa-match-frontend"
compatibility_date = "2026-06-30"
pages_build_output_dir = ".output/public"
```
(or worker entry `.output/server/index.mjs` depending on preset).

## Environment
Set `NUXT_PUBLIC_API_BASE` to production API URL (e.g. https://api.example.com/api/v1). Never include secrets.

## Preview
`npx wrangler pages dev .output/public` (Pages) or `npx wrangler dev` (Workers).

## Notes
Keep access tokens in cookies; ensure API CORS allows the deployed origin.
