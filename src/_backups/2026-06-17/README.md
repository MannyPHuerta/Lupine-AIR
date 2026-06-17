# Backup — 2026-06-17

Captured before implementing the `/ops` magic-link landing page.

## What was working at time of backup
1. Marketing site at theprojectair.com ✅
2. Waitlist intake form (lead submission + admin notification) ✅
3. WaitlistManager page (approve/reject flow) ✅
4. Magic link generation pointing to `/ops` ✅ (email sends, link valid)
5. `/ops` route — **was missing** (blocker being fixed in this session)

## Files backed up
| Backup file | Source |
|---|---|
| `SUPABASE_SCHEMA.sql` | Root schema — full table/RLS/JWT hook definitions |
| `api--waitlist-manager.js` | `api/waitlist-manager.js` — Vercel handler, list/approve/reject/addLead |
| `api--approve-entry.js` | `api/approve-entry.js` — admin-gated single-entry approval |
| `pages--AuthCallback.jsx` | `pages/AuthCallback.jsx` — PKCE + hash token handler |
| `pages--WaitlistManager.jsx` | `pages/WaitlistManager.jsx` — admin UI |

## Key config values at backup time
- Magic link redirectTo: `https://theprojectair.com/ops`
- Supabase project: `esckfcvxmbuhimmseqtb.supabase.co`
- Trial period: 14 days full Pro, lockout at day 30
- subscriptionCheckout & subscriptionWebhook were Base44-auth backed (ported to Supabase in this session)

## Supabase schema notes
- `subscriber_trials` has unique constraint on `email`
- Platform tables (waitlist_entries, subscriber_trials, tenants) are service_role_only RLS
- JWT hook: `public.custom_access_token` — must be registered in Auth → Hooks