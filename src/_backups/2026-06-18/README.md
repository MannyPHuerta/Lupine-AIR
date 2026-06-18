# Backup — 2026-06-18

Taken before modifying vercel.json to fix the 405 Method Not Allowed error on /api/provisionTenant.

## Files backed up
- `vercel.json` — original with `cp -r api dist/api` build command and explicit `/api/(.*)` rewrite
- `api--provisionTenant.js` — the Vercel serverless handler (restore to `api/provisionTenant.js`)
- `pages--Onboarding.jsx` — the onboarding page using `fetch('/api/provisionTenant', ...)`

## What changed in vercel.json
- Removed `&& cp -r api dist/api` from buildCommand (was causing functions to be treated as static assets)
- Removed the `/api/(.*)` rewrite rule (Vercel handles api/ routing natively)