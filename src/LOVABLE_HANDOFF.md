# AIR Platform — Lovable Backend Handoff Document
*Prepared: 2026-06-20 | Author: Base44 AI (Frontend)*

---

## 🎯 WHAT THIS DOCUMENT IS

This is a structured handoff from the **frontend AI** (Base44) to **Lovable** for backend architecture and implementation ownership.

**Division of Responsibility:**
- **Base44 (frontend AI)** → React UI, pages, components, routing, UX flows
- **Lovable (backend AI)** → Supabase schema, RLS policies, Edge Functions, Vercel API routes, auth flows, multi-tenant architecture

This separation is intentional. The frontend AI has proven strong at building UI but repeatedly struggles with backend consistency — especially multi-tenant auth flows, RLS, and serverless function reliability. The magic link → onboarding redirect issue that has persisted across many sessions is the clearest example of this problem.

---

## 🏗️ WHAT AIR IS

**AIR** (by Lupine) is a **multi-tenant SaaS platform** for heavy equipment and event rental companies — think "Shopify for rental yards." It replaces paper-based or legacy systems like CPro (a decades-old DOS-based rental software) with a modern, AI-powered operations platform.

### Target Customer
Independent equipment rental companies with 1–10 branches. Examples:
- A South Texas company renting construction equipment (generators, scissor lifts, excavators)
- A party/event rental company (tents, chairs, stages, linens)
- Companies doing both

### Core Value Proposition
- Replace CPro and similar legacy software
- AI-native: every module has AI suggestions, not just a "chatbot"
- Multi-branch, multi-user, role-based
- Built for counter staff, managers, drivers, mechanics, and executives

---

## 🏛️ ARCHITECTURE OVERVIEW

### Tech Stack (Production)
| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite, hosted on Vercel |
| Backend API | Vercel Serverless Functions (`/api/*.js`) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (magic link + Google OAuth) |
| Email | Resend API |
| SMS | Twilio |
| Payments | Stripe |
| AI | OpenAI / Anthropic (direct API calls) |

### Multi-Tenant Model
Every customer of AIR is a **Tenant**. Each tenant has:
- A unique subdomain: `rentalworld.theprojectair.com`
- Isolated data via Row-Level Security (RLS) on every table using `tenant_id`
- One or more **Branches** (physical locations)
- One or more **Users** (staff) with roles

### Critical Tables
```
tenants          — one row per AIR customer company
profiles         — one row per user (extends auth.users)
branch_settings  — one row per physical branch
```

---

## 🚨 CURRENT BACKEND PROBLEMS (What Needs to Be Fixed)

This section documents the bugs and architectural gaps that are causing the most pain. **These should be the first things Lovable addresses.**

### Problem 1: Magic Link → /onboarding Loop (CRITICAL)

**Symptom:** Users who click a magic link from their email are sent to `/onboarding` instead of their workspace subdomain, even after they've already set up their workspace.

**Root Cause (multi-layered):**
1. The `OpsLanding` page and `AuthCallback` page both try to resolve the tenant after auth
2. They query the `tenants` table directly — but RLS blocks anon/authenticated users from reading it
3. Fallback calls a Supabase Edge Function (`debugUserRecords`) — but that function has CORS issues when called from `theprojectair.com`
4. The final fallback (`/api/resolveTenant` Vercel route) was returning 405 errors due to `vercel.json` routing configuration at one point
5. A new route `/api/resolveMyTenant` was created as a workaround — but this is not yet tested end-to-end in production

**What the correct flow should be:**
```
User clicks magic link
  → Supabase verifies token
  → User lands on /auth/callback or /ops
  → App calls /api/resolveMyTenant with user's JWT
  → Vercel function uses service role to query profiles → tenants
  → Returns { tenant: { slug, status } }
  → Frontend redirects to https://{slug}.theprojectair.com
```

**What needs to be fixed in Supabase:**
- RLS on `tenants` table: authenticated users should be able to read their own tenant
- RLS on `profiles` table: users should be able to read their own profile
- The `profiles` table trigger that auto-creates a profile on signup may not be setting `tenant_id` reliably

**Recommended Fix:**
```sql
-- Allow users to read their own tenant
CREATE POLICY "Users can read own tenant"
  ON public.tenants FOR SELECT
  USING (
    id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
    OR admin_email = auth.jwt()->>'email'
  );

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());
```

If these policies are in place, the frontend can directly query `supabase.from('profiles').select('tenant_id')` and then `supabase.from('tenants').select('slug').eq('id', tenant_id)` — no Edge Function needed.

---

### Problem 2: Edge Function CORS Failures

All Supabase Edge Functions fail with CORS errors when called from `https://theprojectair.com`. The Supabase dashboard shows the functions are deployed, but they respond to preflight `OPTIONS` requests with a non-200 status.

**Diagnosis:**
- The Edge Functions were written in the Base44 environment and deployed via Base44's CI, NOT via the Supabase CLI
- Base44 writes Edge Functions as Deno-compatible JS but the deployment pipeline may not be routing them correctly to the correct Supabase project
- It's also possible the functions are being deployed to the *wrong* Supabase project (dev vs prod)

**Recommended Fix:**
1. Audit which Supabase project the Edge Functions are actually deployed to
2. Redeploy using `supabase functions deploy <name>` via the CLI against the correct project
3. Or: abandon Edge Functions entirely and use Vercel API routes for everything (simpler, no CORS)

**Our current workaround:** All important server-side logic has been moved to `/api/*.js` Vercel serverless functions. These have no CORS issues and use the `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS.

---

### Problem 3: Tenant Provisioning Race Condition

**Symptom:** After a user completes onboarding (fills out Company → Branch → Plan → clicks "Start Free Trial"), sometimes the `provisionTenant` API call succeeds but the redirect fails because the profile's `tenant_id` hasn't propagated yet.

**Root Cause:** `provisionTenant` does:
1. INSERT into `tenants`
2. INSERT into `profiles` (update tenant_id)
3. INSERT into `branch_settings`
4. INSERT into `company_settings`

If step 2 fails silently (e.g., RLS rejection), the user's profile has no `tenant_id`, so the post-provisioning redirect to the workspace fails.

**Recommended Fix:**
- `provisionTenant` should return the tenant slug directly so the frontend can redirect immediately without a second lookup
- Add a verification step at the end: confirm `profiles.tenant_id` was set before returning success
- Use a Supabase transaction to make provisioning atomic

---

### Problem 4: `vercel.json` Routing Conflicts

The current `vercel.json` is:
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This was causing `/api/*` routes to sometimes return 405 (Method Not Allowed) because Vercel was treating them as static rewrites rather than serverless function invocations. The current config should work, but it needs to be verified after every deployment.

**Recommended Fix:** Use `routes` instead of `rewrites` in Vercel for cleaner separation:
```json
{
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

---

### Problem 5: No SDLC Environment Separation

Currently there is only one Supabase project and one Vercel deployment. All testing happens in production. This is dangerous.

**Required Setup:**
- `lupineair-prod` — production Supabase project, `theprojectair.com`
- `lupineair-dev2` — staging/QA, `dev2.theprojectair.com` or similar
- `lupineair-dev1` — development, used by Base44 AI for frontend work

(See full SDLC schema request at end of this document.)

---

## 📦 FEATURE MODULES — What Hits the Backend

Below is every major AIR module with the tables it reads/writes and what Lovable needs to support.

---

### 1. Counter (Point-of-Sale Rental Creation)
**Path:** `/counter`
**What it does:** Staff creates rentals, adds equipment line items, sets dates, applies discounts, takes payment, prints invoice.

**Tables:**
- `rentals` — main rental record
- `equipment` — availability check
- `customers` — lookup/create customer
- `branch_settings` — invoice prefix/numbering
- `promo_codes` — discount validation
- `volume_discount_rules` — bulk pricing
- `discount_logs` — audit trail
- `rental_agreements` — contract template
- `cash_drawer` — payment tracking

**Backend Functions Needed:**
- `calculateRentalTotal(items, customerId, promoCode)` — price calculation
- `checkAvailability(equipmentId, startDate, endDate)` — conflict detection
- `createRental(data)` — atomic rental creation with invoice number assignment
- `processPayment(rentalId, method, amount)` — payment recording

---

### 2. Equipment & Inventory Management
**Paths:** `/equipment/:id`, `/equipment-status`, `/availability-calendar`
**What it does:** Track every physical unit — status, condition, location, rates, specs.

**Tables:**
- `equipment` — unit records
- `inventory_items` — catalog items (approved templates)
- `equipment_categories` — taxonomy
- `equipment_gps_links` — GPS tracker assignments
- `maintenance_logs` — service history

**Backend Functions Needed:**
- `updateEquipmentStatus(id, status, note)` — with audit log
- `checkConflicts(equipmentId, dateRange)` — for availability
- `getEquipmentTimeline(id)` — rental history

---

### 3. Delivery & Dispatch
**Paths:** `/dispatch`, `/delivery/:id`, `/driver`
**What it does:** Assign deliveries to drivers, track GPS, capture photos and signatures on delivery.

**Tables:**
- `deliveries` — delivery records
- `driver_locations` — real-time GPS pings
- `delivery_matrix` — pricing zones

**Backend Functions Needed:**
- `assignDelivery(deliveryId, driverId)` — with SMS notification via Twilio
- `updateDeliveryStatus(deliveryId, status, gps, photos)` — driver app events
- `calculateDeliveryFee(zip, items)` — zone-based pricing

---

### 4. Repairs & Shop Floor
**Paths:** `/shop-floor`, `/airepair`
**What it does:** Work orders for equipment repair, mechanic assignment, parts tracking, AI-powered predictive maintenance.

**Tables:**
- `work_orders`
- `maintenance_logs`
- `mechanic_profiles`
- `part_requirements`
- `parts_procurement`
- `predictive_alerts`

**Backend Functions Needed:**
- `createWorkOrder(equipmentId, issue)` — with AI diagnosis
- `assignMechanic(workOrderId, mechanicId)` — with notification
- `predictiveHealthCheck(equipmentId)` — AI function, calls OpenAI

---

### 5. Customers
**Path:** `/customers`
**What it does:** Full customer CRM — rental history, credit status, blacklist, tax exempt, ID verification, SMS opt-in.

**Tables:**
- `customers`
- `rentals` (for history)

**Backend Functions Needed:**
- `upsertCustomer(data)` — deduplicate by phone/email
- `verifyCustomerPhone(customerId, staffEmail)` — verification audit

---

### 6. Accounting & Financials
**Paths:** `/accounting`, `/cash-drawer`, `/spend-analytics`
**What it does:** P&L, cash drawer reconciliation, expense tracking, invoice generation.

**Tables:**
- `cash_drawer`
- `expenses`
- `rentals` (revenue)
- `discount_logs`

**Backend Functions Needed:**
- `openDrawer(branch, staffEmail, float)` — shift start
- `closeDrawer(drawerId, countedCash)` — with variance calculation
- `generatePLStatement(branch, startDate, endDate)` — aggregation query

---

### 7. Online Store (Customer-Facing)
**Paths:** `/store`, `/store/events`
**What it does:** Public-facing rental catalog where customers browse and submit reservation requests.

**Tables:**
- `equipment` (public read for available items)
- `event_plans` (for event store)
- `rentals` (reservation creation)

**Backend Functions Needed:**
- `storeCreateReservation(data)` — public endpoint, no auth
- `getPublicCatalog(tenantId, branch)` — filtered for store display

---

### 8. RFQ / Government Bidding
**Paths:** `/rfq`, `/rfq/:id`
**What it does:** AI-powered RFQ analysis and response generation for government contract bids.

**Tables:**
- `rfq_records`

**Backend Functions Needed (multi-step AI pipeline):**
- `rfqStep1Analyze` — document parsing
- `rfqStep2Compliance` — compliance matrix
- `rfqStep3LineItems` — pricing extraction
- `rfqStep4Response` — response generation

---

### 9. Purchasing / Purchase Orders
**Paths:** `/purchase-orders`, `/vendors`, `/supply-catalog`
**What it does:** Create POs, route for approval, track vendor invoices.

**Tables:**
- `purchase_orders`
- `vendors`
- `supply_items`

**Backend Functions Needed:**
- `submitPO(data)` — with email notification to purchasing dept
- `approvePO(poId, approverEmail)` — with email to vendor + accounting

---

### 10. GPS & Asset Tracking
**Path:** `/gps-settings`, fleet monitoring across all pages
**What it does:** Connect to GPS providers (Samsara, FleetTraks, CalAmp, etc.), poll for location, detect geofence breaches and theft.

**Tables:**
- `gps_providers`
- `equipment_gps_links`
- `driver_locations`

**Backend Functions Needed:**
- `gpsQuery(providerId)` — polls GPS API, updates equipment locations
- `checkGeofenceBreaches()` — scheduled, fires SMS alerts via Twilio
- `fraudAlertWatcher()` — detects night movement, speed anomalies

---

### 11. Trial & Subscription Management
**Paths:** `/onboarding`, plan upgrade flows
**What it does:** 14-day trial → paid subscription lifecycle. Stripe integration.

**Tables:**
- `tenants` — plan tier, trial dates
- `subscriber_trials` — trial tracking
- `waitlist_entries` — pre-launch waitlist

**Backend Functions Needed:**
- `provisionTenant(data)` — creates tenant + branch + profile atomically
- `subscriptionCheckout(planId)` — Stripe checkout session
- `subscriptionWebhook(event)` — Stripe webhook handler
- `trialLifecycleCheck()` — scheduled daily, sends reminders, downgrades expired trials

---

### 12. AI Modules (all require OpenAI/Anthropic direct calls)
| Module | Path | AI Function |
|--------|------|-------------|
| AIRental | `/airental` | Natural language rental creation |
| AIEvents | `/airevents` | Event planning suggestions |
| AIRepair | `/airepair` | Fault diagnosis from symptoms |
| AIRecovery | `/airecovery` | Theft/fraud intelligence |
| AIReports | `/aireports` | Natural language report generation |
| AIRoads | `/airoads` | Load optimization & logistics |
| AIRfq | `/airfq` | Government bid response |
| AI Assistant | All pages | Context-aware help |

---

## 🗂️ DATABASE SCHEMA SUMMARY

The complete schema is in `SUPABASE_SCHEMA.sql` at the root of the repo. Key points:

### Multi-Tenancy
Every operational table has a `tenant_id UUID REFERENCES tenants(id)` column. RLS policies use this to isolate data between tenants.

### Key Tables Not in Base44 Schema (Platform-Level)
These exist outside tenant isolation — they're for AIR's own SaaS management:
```sql
tenants              -- AIR customers (companies)
profiles             -- extends auth.users, links user → tenant
subscriber_trials    -- trial lifecycle tracking
waitlist_entries     -- pre-launch waitlist
```

### Authentication Flow
1. User enters email on `/signin`
2. Supabase sends magic link to email
3. User clicks link → redirected to `/auth/callback` (PKCE flow) or `/ops` (hash flow)
4. App detects session → calls `/api/resolveMyTenant` (Vercel)
5. Vercel function looks up `profiles.tenant_id` → `tenants.slug` using service role
6. Redirect to `https://{slug}.theprojectair.com`

---

## 📁 REPO STRUCTURE

```
/
├── api/                    ← Vercel serverless functions (Node.js)
│   ├── provisionTenant.js  ← Tenant creation
│   ├── resolveTenant.js    ← Tenant lookup by email
│   ├── resolveMyTenant.js  ← Tenant lookup by JWT (newest, recommended)
│   ├── waitlist-manager.js ← Waitlist admin ops
│   ├── waitlist.js         ← Public waitlist signup
│   └── ...
├── functions/              ← Base44 Edge Functions (Deno) — BEING PHASED OUT
│   ├── debugUserRecords    ← Has CORS issues — replace with Vercel route
│   ├── sendMagicLink       ← Works via Resend
│   └── ...
├── pages/                  ← React pages (Base44 frontend)
├── components/             ← React components
├── entities/               ← Base44 entity schemas (JSON) — NOT production DB
├── SUPABASE_SCHEMA.sql     ← Full Postgres schema — run this in Supabase
├── CLAUDE.md               ← Architecture rules for Base44 AI
└── PROJECT_NOTES.md        ← Migration roadmap and status
```

---

## ⚡ IMMEDIATE PRIORITIES FOR LOVABLE

In order of urgency:

### Priority 1 — Fix the Auth/Redirect Loop
1. Audit Supabase RLS policies on `tenants` and `profiles` tables
2. Ensure the `handle_new_user()` trigger creates profiles correctly
3. Confirm `provisionTenant` API correctly sets `profiles.tenant_id`
4. Test the full flow: magic link → `/auth/callback` → `/api/resolveMyTenant` → workspace redirect

### Priority 2 — Establish SDLC Environments
Set up three Supabase projects and corresponding Vercel environments:
- `prod` → `theprojectair.com`
- `dev2` → `staging.theprojectair.com` (QA testing)
- `dev1` → used by Base44 AI for frontend development

### Priority 3 — Migrate Edge Functions to Vercel Routes
All Supabase Edge Functions that are called from the frontend should be rewritten as Vercel `/api/*.js` files. This eliminates CORS entirely.

Priority order:
1. `debugUserRecords` → replace with `/api/resolveMyTenant` (done, needs testing)
2. `sendMagicLink` → `/api/sendMagicLink`
3. `trialLifecycleCheck` → Vercel Cron job
4. `returnReminders` → Vercel Cron job
5. AI functions → `/api/ai/*.js` with OpenAI direct calls

### Priority 4 — Supabase Schema Hardening
- Add proper RLS to all 41 tables
- Add `tenant_id` to all operational tables
- Create `updated_at` triggers
- Add indexes on `tenant_id`, `created_at`, common filter columns

---

## 🤝 HOW BASE44 AND LOVABLE WILL COLLABORATE

**Base44 (frontend) owns:**
- All React pages and components
- Routing (App.jsx)
- UI state, forms, modals
- Styling (Tailwind)
- Frontend API calls (`fetch('/api/...')`)

**Lovable (backend) owns:**
- All `/api/*.js` Vercel functions
- Supabase schema and migrations
- RLS policies
- Auth flows and redirects
- Scheduled jobs (Vercel Cron)
- Stripe webhook handling
- Twilio/Resend integrations at the API layer

**Contract between them:**
- Lovable defines the API contract (URL, method, request body, response shape) for each endpoint
- Base44 implements the frontend call to that contract
- No Base44 changes to `/api/*.js` files without Lovable review
- No Lovable changes to `/pages/*.jsx` or `/components/*.jsx` files without Base44 review

---

## 📋 API CONTRACT REFERENCE (Current Endpoints)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/resolveMyTenant` | Bearer JWT | Look up tenant by user's JWT |
| POST | `/api/resolveTenant` | None (email) | Look up tenant by email (admin use) |
| POST | `/api/provisionTenant` | Bearer JWT | Create new tenant + branch |
| POST | `/api/waitlist` | None | Public waitlist signup |
| POST | `/api/waitlist-manager` | None (action-based) | Admin waitlist operations |
| POST | `/api/sendMagicLink` | None | Send magic link email via Resend |
| POST | `/api/approve-entry` | Bearer JWT | Approve waitlist entry |

---

## 🔐 ENVIRONMENT VARIABLES NEEDED

### Vercel (all environments)
```
VITE_SUPABASE_URL             = https://[project].supabase.co
VITE_SUPABASE_ANON_KEY        = eyJ...
SUPABASE_SERVICE_ROLE_KEY     = eyJ... (secret, never expose to frontend)
SUPABASE_URL                  = https://[project].supabase.co
SUPABASE_ANON_KEY             = eyJ...
RESEND_API_KEY                = re_...
STRIPE_SECRET_KEY             = sk_live_... / sk_test_...
STRIPE_WEBHOOK_SECRET         = whsec_...
TWILIO_ACCOUNT_SID            = AC...
TWILIO_AUTH_TOKEN             = ...
TWILIO_PHONE_NUMBER           = +1...
```

### Per-Environment Supabase Projects
| Env | Supabase Project | Vercel Env |
|-----|-----------------|-----------|
| Production | `lupineair-prod` | Production |
| Staging | `lupineair-dev2` | Preview (branch: `staging`) |
| Dev | `lupineair-dev1` | Preview (branch: `dev`) |

---

*End of Handoff Document*
*Frontend contact: Base44 AI (this chat)*
*Backend contact: Lovable*
*Repository: github.com/MannyPHuerta/Lupine-AIR*