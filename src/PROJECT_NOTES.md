# AIR Platform — Project Notes
*Last updated: 2026-06-04*

## 🎯 Goal: Live on theprojectair.com by June 15, 2026

---

## Architecture

| Layer | Dev (Base44) | Prod (Vercel) |
|-------|-------------|---------------|
| Frontend | Base44 preview | theprojectair.com (Vercel) |
| Database | Supabase `lupineair-dev` | Supabase `lupineair-prod` |
| Auth | Supabase Auth (dev project) | Supabase Auth (prod project) |
| Stripe | Test mode keys | Live mode keys |
| Twilio | Same account (safe) | Same account |
| Resend | Same account (safe) | Same account |

---

## ✅ DONE
- [x] Supabase account created
- [x] Vercel account created, linked to GitHub repo (`Lupine-AIR`)
- [x] `SUPABASE_SCHEMA.sql` — complete schema for all 41 entities
- [x] `vite.config.js` — fixed `__dirname` ES module issue
- [x] `vercel.json` — SPA routing rewrites configured
- [x] `package.json` — all dependencies listed
- [x] `api/supabaseClient.js` — Supabase client wrapper exists

---

## 🔲 JUNE 15 CHECKLIST (in order)

### STEP 1 — Supabase: Create Two Projects (you do this)
- [ ] Create project: `lupineair-dev` (for Base44 development)
- [ ] Create project: `lupineair-prod` (for Vercel production)
- [ ] Run `SUPABASE_SCHEMA.sql` in BOTH projects' SQL editors
- [ ] Note down for each project:
  - Project URL (`https://xxxx.supabase.co`)
  - Anon public key
  - Service role key (keep secret — backend only)

### STEP 2 — Vercel: Set Environment Variables (you do this)
Go to Vercel → Project → Settings → Environment Variables.
Set the following, **scoped to Production** only (not Preview):

```
VITE_SUPABASE_URL         = https://[PROD-PROJECT-ID].supabase.co
VITE_SUPABASE_ANON_KEY    = [PROD ANON KEY]
VITE_STRIPE_PUBLISHABLE_KEY = pk_live_...
```

Set these as **secret** (not exposed in build logs):
```
STRIPE_SECRET_KEY         = sk_live_...
STRIPE_WEBHOOK_SECRET     = whsec_live_...
SUPABASE_SERVICE_ROLE_KEY = [PROD SERVICE ROLE KEY]
RESEND_API_KEY            = [same as Base44]
TWILIO_ACCOUNT_SID        = [same as Base44]
TWILIO_AUTH_TOKEN         = [same as Base44]
TWILIO_PHONE_NUMBER       = [same as Base44]
```

### STEP 3 — GitHub: Push to trigger Vercel deploy (you do this)
- [ ] `git add -A && git commit -m "Vercel production config" && git push origin main`
- [ ] Check Vercel build logs — should succeed
- [ ] Visit the Vercel preview URL and confirm app loads
- [ ] Test a route refresh (e.g. go to `/counter` and hit F5 — should NOT 404)

### STEP 4 — DNS: Point theprojectair.com to Vercel (you do this)
- [ ] In Vercel: Project → Settings → Domains → Add `theprojectair.com`
- [ ] Vercel will show you a CNAME or A record to add
- [ ] Add that record in your domain registrar (GoDaddy/Namecheap/Cloudflare/etc.)
- [ ] Also add `www.theprojectair.com` → redirect to apex
- [ ] Also add `app.theprojectair.com` → same Vercel project (for future)
- [ ] Wait for DNS propagation (usually <30 min with Cloudflare, up to 24h otherwise)

### STEP 5 — SDK Swap: Replace Base44 calls with Supabase (I do this in Base44)
- [ ] Swap `base44.auth.*` → `supabase.auth.*`
- [ ] Swap `base44.entities.*` → `supabase.from('table').*`
- [ ] Swap `base44.integrations.Core.InvokeLLM` → direct OpenAI/Anthropic API call
- [ ] Swap `base44.integrations.Core.SendEmail` → Resend API direct
- [ ] Swap `base44.integrations.Core.UploadFile` → Supabase Storage
- [ ] Update `AuthContext.jsx` to use Supabase session
- [ ] Test login, data read, data write

### STEP 6 — Backend Functions: Migrate to Supabase Edge Functions (I do this)
Priority order:
- [ ] `sendRentalConfirmation` (Resend)
- [ ] `stripePaymentHandler` + `subscriptionWebhook`
- [ ] `returnReminders` (use pg_cron)
- [ ] `calculateLateFees`
- [ ] `driverSMS` (Twilio)
- [ ] `trialReminders`
- [ ] AI functions (OpenAI direct)

### STEP 7 — Smoke Test on theprojectair.com (you + me)
- [ ] Sign up as a new user
- [ ] Create a rental
- [ ] Check Supabase dashboard — confirm record written to `lupineair-prod`
- [ ] Send a test confirmation email
- [ ] Process a test Stripe payment (use Stripe test card first, then go live)

### STEP 8 — Go Live
- [ ] Flip Stripe from test → live keys in Vercel
- [ ] Announce 🎉

---

## Environment Variable Reference

### Base44 (dev) — set in Base44 dashboard → Settings → Secrets
| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://[DEV-PROJECT-ID].supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Dev anon key |
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_test_...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Dev service role key |
| `RESEND_API_KEY` | (already set) |
| `TWILIO_ACCOUNT_SID` | (already set) |
| `TWILIO_AUTH_TOKEN` | (already set) |
| `TWILIO_PHONE_NUMBER` | (already set) |

### Vercel (prod) — set in Vercel dashboard → Settings → Environment Variables
| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://[PROD-PROJECT-ID].supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Prod anon key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_live_...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Prod service role key |
| `RESEND_API_KEY` | same |
| `TWILIO_ACCOUNT_SID` | same |
| `TWILIO_AUTH_TOKEN` | same |
| `TWILIO_PHONE_NUMBER` | same |

---

## DNS Records for theprojectair.com
Add these at your registrar:

| Type | Name | Value |
|------|------|-------|
| `A` | `@` | Vercel IP (shown in Vercel dashboard) |
| `CNAME` | `www` | `cname.vercel-dns.com` |
| `CNAME` | `app` | `cname.vercel-dns.com` |

---

## Timeline to June 15

| Date | Task | Owner |
|------|------|-------|
| Jun 4–5 | Create 2 Supabase projects, run schema SQL | You |
| Jun 4–5 | Push to GitHub, confirm Vercel build passes | You |
| Jun 5–6 | Set Vercel env vars | You |
| Jun 5–8 | SDK swap (Base44 → Supabase) | Me (in Base44) |
| Jun 7–9 | Edge functions migration (priority 6) | Me (in Base44) |
| Jun 9–10 | DNS cutover to theprojectair.com | You |
| Jun 10–13 | Smoke testing on prod URL | Both |
| Jun 14 | Flip Stripe to live keys | You |
| **Jun 15** | 🚀 **Launch** | Both |