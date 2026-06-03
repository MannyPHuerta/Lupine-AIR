# Supabase + Vercel Migration Roadmap
*Last updated: 2026-06-03*

## Goal
Migrate the AIR platform (currently on Base44) to:
- **Database + Auth**: Supabase (Postgres + Supabase Auth + RLS)
- **Frontend hosting**: Vercel
- **Keep**: Stripe, Twilio, Resend (these are external and unchanged)

---

## Phase 1 — Schema Generation (do this first, no risk)
Generate `CREATE TABLE` SQL for every Base44 entity. Each table gets:
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `created_at TIMESTAMPTZ DEFAULT now()`
- `updated_at TIMESTAMPTZ DEFAULT now()`
- `created_by_id UUID REFERENCES auth.users(id)`

### Entities to migrate (in dependency order):
1. `CompanySettings`
2. `BranchSettings`
3. `AvailabilityConfig`
4. `RentalAgreement`
5. `EquipmentCategory`
6. `InventoryItem`
7. `Equipment`
8. `Customer`
9. `Rental`
10. `Delivery`
11. `WorkOrder`
12. `MaintenanceLog`
13. `Recovery`
14. `Expense`
15. `RecurringRental`
16. `RtoPayment`
17. `Timesheet`
18. `Delivery` (driver assignments)
19. `DriverLocation`
20. `GPSProvider`
21. `EquipmentGPSLink`
22. `MechanicProfile`
23. `PartRequirement`
24. `PartsProcurement`
25. `PredictiveAlert`
26. `EventPlan`
27. `DeliveryMatrix`
28. `VolumeDiscountRule`
29. `PromoCode`
30. `DiscountLog`
31. `AuditLog`
32. `Report`
33. `RFQRecord`
34. `PaymentSettings`
35. `CustomEmail`
36. `StaffPhone`
37. `UserRoster`
38. `Role`
39. `PlatformFeature`
40. `CproContact`
41. `PullRequest`

---

## Phase 2 — Supabase Project Setup
- [x] Supabase project created
- [ ] Run schema SQL in Supabase SQL editor
- [ ] Enable RLS on all tables
- [ ] Write RLS policies (see policy templates below)
- [ ] Create `updated_at` trigger function and apply to all tables
- [ ] Test a read and write from the Supabase dashboard

### RLS Policy Template (per table)
```sql
-- Allow users to read their own records
CREATE POLICY "Users can read own records"
  ON public.table_name FOR SELECT
  USING (auth.uid() = created_by_id);

-- Admins can read all
CREATE POLICY "Admins can read all"
  ON public.table_name FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );
```

### updated_at Trigger (apply to every table)
```sql
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to each table:
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.table_name
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

---

## Phase 3 — Auth Migration
- [ ] Enable Supabase Auth (Email + Magic Link to match current Base44 auth)
- [ ] Set up `users` profile table extending `auth.users`
- [ ] Map Base44 roles (`admin`, `user`, custom roles) to `raw_user_meta_data->>'role'`
- [ ] Test invite flow

### User Profile Table
```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'user',
  branch TEXT,
  stripe_customer_id TEXT,
  subscription_tier TEXT DEFAULT 'core',
  subscription_status TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## Phase 4 — Frontend SDK Swap
Replace `@base44/sdk` calls with Supabase client calls.

### Install
```bash
npm install @supabase/supabase-js
```

### New client file (`src/api/supabaseClient.js`)
```js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### Mapping Base44 → Supabase SDK calls
| Base44 | Supabase Equivalent |
|--------|-------------------|
| `base44.entities.Equipment.list()` | `supabase.from('equipment').select('*')` |
| `base44.entities.Equipment.filter({status:'available'})` | `supabase.from('equipment').select('*').eq('status','available')` |
| `base44.entities.Equipment.create(data)` | `supabase.from('equipment').insert(data)` |
| `base44.entities.Equipment.update(id, data)` | `supabase.from('equipment').update(data).eq('id', id)` |
| `base44.entities.Equipment.delete(id)` | `supabase.from('equipment').delete().eq('id', id)` |
| `base44.auth.me()` | `supabase.auth.getUser()` |
| `base44.auth.logout()` | `supabase.auth.signOut()` |
| `base44.integrations.Core.InvokeLLM(...)` | Call OpenAI/Anthropic API directly via Edge Function |
| `base44.integrations.Core.SendEmail(...)` | Call Resend API directly (already have key) |
| `base44.integrations.Core.UploadFile(...)` | `supabase.storage.from('bucket').upload(path, file)` |

---

## Phase 5 — Backend Functions Migration
Base44 backend functions → Supabase Edge Functions

### Install Supabase CLI
```bash
npm install -g supabase
supabase login
supabase init
```

### Create an Edge Function
```bash
supabase functions new functionName
```

### Key functions to migrate (roughly in priority order):
1. `sendNotifications` (Twilio SMS — just swap env vars)
2. `returnReminders` (scheduled — use pg_cron in Supabase)
3. `stripePaymentHandler` + `subscriptionWebhook` (keep Stripe keys)
4. `sendRentalConfirmation` (Resend — keep key)
5. `calculateLateFees` (pure logic, easy port)
6. `generateRecurringRentals` (scheduled)
7. `driverSMS`
8. All AI functions (swap Base44 LLM → direct OpenAI/Anthropic calls)
9. GPS functions (`gpsQuery`, `gpsTestConnection`, `checkGeofenceBreaches`)

### Environment variables to set in Supabase Edge Functions:
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
RESEND_API_KEY
OPENAI_API_KEY (or ANTHROPIC_API_KEY — need to get one)
SUPABASE_URL (auto-set)
SUPABASE_SERVICE_ROLE_KEY (auto-set)
```

---

## Phase 6 — Vercel Deployment
**Don't start the 14-day trial until Phases 1–4 are working locally.**

- [ ] Connect GitHub repo to Vercel
- [ ] Set environment variables in Vercel dashboard:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- [ ] Deploy and smoke test
- [ ] Point `theprojectair.com` domain to Vercel

---

## Phase 7 — Data Migration
Export Base44 data → import to Supabase.

1. Use `exportAllData` backend function (already exists) to dump all entity records as JSON
2. Transform IDs: Base44 uses string IDs, Supabase uses UUIDs — need a mapping table
3. Import via Supabase `INSERT` batches or `supabase db push`
4. Verify record counts match

---

## Rollback Plan
If anything breaks during migration:
- Base44 app remains live and untouched until cutover is confirmed
- DNS cutover is the last step — flip `theprojectair.com` only after Vercel deploy is validated
- Supabase free tier persists indefinitely (no data loss risk)
- All secrets (Stripe, Twilio, Resend) are external and unaffected

---

## Current Status
- [x] Supabase account created, project initialized, RLS enabled
- [x] Vercel account created, linked to GitHub repo
- [ ] Schema SQL generated and run
- [ ] RLS policies written
- [ ] Auth configured
- [ ] Frontend SDK swap started
- [ ] Edge Functions migration started
- [ ] Vercel trial activated
- [ ] Data migrated
- [ ] DNS cutover