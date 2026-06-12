# CRITICAL ARCHITECTURE NOTE — READ THIS FIRST

## ⚠️ STOP DEVELOPING FOR BASE44 ⚠️

**THIS APP IS MIGRATING TO VERCEL + SUPABASE.**

Every time code is written using Base44 SDK, Base44 entities, or Base44 backend functions for production features — it fails and has to be redone. DO NOT DO THIS.

---

## The Stack

- **Frontend**: React (Vite), deployed on Vercel
- **Backend**: Vercel Serverless Functions (`/api/*.js`)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Email**: Resend API
- **Payments**: Stripe

---

## Rules

1. **ALL new backend logic goes in `/api/*.js`** — Vercel serverless functions.
2. **ALL data persistence goes to Supabase** — use `@supabase/supabase-js` with `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
3. **DO NOT use `base44.entities.*`** for any production data.
4. **DO NOT use `base44.functions.invoke()`** for any production features.
5. **DO NOT create new Base44 backend functions** for production features.
6. **Frontend API calls use `fetch('/api/...')`** — not the Base44 SDK.
7. **Supabase URL env var is `VITE_SUPABASE_URL`** (not `SUPABASE_URL` — that one may not be set correctly).

---

## Environment Variables (Vercel)

- `VITE_SUPABASE_URL` — Supabase project URL (base URL, no `/rest/v1/` suffix)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (for server-side inserts)
- `RESEND_API_KEY` — Resend email API key
- `STRIPE_SECRET_KEY` — Stripe secret key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret

---

## What Base44 Is Still Used For (Temporarily)

- The app shell / routing (App.jsx, pages/) — being migrated
- Internal admin tools that don't need to scale

Base44 is NOT the production platform. Vercel + Supabase IS.