-- ============================================================
-- AIR Platform — Supabase Postgres Schema
-- Generated: 2026-06-03
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- ── Shared trigger function for updated_at ──────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Helper macro: apply updated_at trigger to a table ───────
-- (Call this after each CREATE TABLE below)
-- CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.<table>
--   FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- AUTH / USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id                    UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name             TEXT,
  email                 TEXT,
  role                  TEXT DEFAULT 'user',
  branch                TEXT,
  stripe_customer_id    TEXT,
  subscription_tier     TEXT DEFAULT 'core',
  subscription_status   TEXT,
  stripe_subscription_id TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- COMPANY / BRANCH SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.company_settings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name              TEXT,
  logo_url                  TEXT,
  website_url               TEXT,
  tax_id                    TEXT,
  duns_number               TEXT,
  cage_code                 TEXT,
  certifications            TEXT[],
  invoice_terms             TEXT,
  invoice_footer            TEXT,
  auto_assign_invoice_numbers BOOLEAN DEFAULT true,
  invoice_number_start      INTEGER DEFAULT 1001,
  invoice_number_prefix     TEXT DEFAULT 'MCL',
  sms_reminders_enabled     BOOLEAN DEFAULT true,
  rental_day_mode           TEXT DEFAULT 'clock_hour',
  late_fees_enabled         BOOLEAN DEFAULT false,
  late_fee_per_day          NUMERIC(10,2) DEFAULT 0,
  late_fee_penalty_rate     NUMERIC(6,4) DEFAULT 0,
  late_fee_grace_period     INTEGER DEFAULT 0,
  late_fee_max_cap          NUMERIC(10,2) DEFAULT 0,
  branding_theme            JSONB,
  header_style              TEXT DEFAULT 'classic',
  seasonal_auto_activate    BOOLEAN DEFAULT false,
  seasonal_theme_key        TEXT,
  auth_method               TEXT DEFAULT 'magic_link',
  geofence_alert_phones     TEXT[],
  geofence_alert_emails     TEXT[],
  demo_mode_enabled         BOOLEAN DEFAULT false,
  demo_branch               TEXT,
  store_mode                TEXT DEFAULT 'both',
  store_intent_style        TEXT DEFAULT 'split_screen',
  rfid_options              JSONB,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now(),
  created_by_id             UUID REFERENCES auth.users(id)
);
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.branch_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch                TEXT NOT NULL,
  invoice_prefix        TEXT,
  next_invoice_number   INTEGER DEFAULT 1000,
  address               TEXT,
  phone                 TEXT,
  email                 TEXT,
  parts_buyer_email     TEXT,
  default_area_code     TEXT,
  certifications        TEXT[],
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  created_by_id         UUID REFERENCES auth.users(id)
);
ALTER TABLE public.branch_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.branch_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.availability_config (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch                          TEXT NOT NULL,
  allow_overbooking_by_default    BOOLEAN DEFAULT false,
  default_max_overbook_percent    NUMERIC(6,2) DEFAULT 0,
  require_approval_above_percent  NUMERIC(6,2) DEFAULT 5,
  default_buffer_days             INTEGER DEFAULT 0,
  enable_cross_branch_reservations BOOLEAN DEFAULT true,
  notes                           TEXT,
  created_at                      TIMESTAMPTZ DEFAULT now(),
  updated_at                      TIMESTAMPTZ DEFAULT now(),
  created_by_id                   UUID REFERENCES auth.users(id)
);
ALTER TABLE public.availability_config ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.availability_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.rental_agreements (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch              TEXT NOT NULL,
  agreement_type      TEXT DEFAULT 'ARA_standard',
  title               TEXT DEFAULT 'Equipment Rental Agreement',
  content             TEXT,
  custom_pdf_url      TEXT,
  pages               INTEGER DEFAULT 1,
  requires_initials   BOOLEAN DEFAULT true,
  is_active           BOOLEAN DEFAULT true,
  last_updated_at     TIMESTAMPTZ,
  last_updated_by     TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  created_by_id       UUID REFERENCES auth.users(id)
);
ALTER TABLE public.rental_agreements ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.rental_agreements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- EQUIPMENT CATALOG
-- ============================================================

CREATE TABLE IF NOT EXISTS public.equipment_categories (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT NOT NULL,
  parent                    TEXT,
  description               TEXT,
  default_footprint_width   NUMERIC(8,2),
  default_footprint_length  NUMERIC(8,2),
  attributes                JSONB,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now(),
  created_by_id             UUID REFERENCES auth.users(id)
);
ALTER TABLE public.equipment_categories ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.equipment_categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.inventory_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_index          INTEGER,
  byte_offset           INTEGER,
  description1          TEXT,
  description2          TEXT,
  serial_number         TEXT,
  assigned_to           TEXT[],
  location              TEXT,
  disposition           TEXT,
  branch_code           TEXT,
  raw_fields            TEXT[],
  migration_source      TEXT,
  migration_session_id  TEXT,
  clean_name            TEXT,
  category              TEXT,
  review_status         TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  created_by_id         UUID REFERENCES auth.users(id)
);
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.equipment (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id         UUID REFERENCES public.inventory_items(id),
  name                      TEXT NOT NULL,
  category                  TEXT,
  consumable                BOOLEAN DEFAULT false,
  rental_alert              TEXT,
  daily_rate                NUMERIC(10,2) NOT NULL,
  weekly_rate               NUMERIC(10,2),
  monthly_rate              NUMERIC(10,2),
  hourly_rate               NUMERIC(10,2),
  has_hour_meter            BOOLEAN DEFAULT false,
  current_hour_meter_reading NUMERIC(10,2) DEFAULT 0,
  deposit_required          NUMERIC(10,2),
  taxable                   BOOLEAN DEFAULT true,
  footprint_width           NUMERIC(8,2),
  footprint_length          NUMERIC(8,2),
  status                    TEXT DEFAULT 'available',
  unit_status               TEXT DEFAULT 'available',
  status_note               TEXT,
  status_updated_at         TIMESTAMPTZ,
  status_updated_by         TEXT,
  location                  TEXT,
  notes                     TEXT,
  tent_specs_id             UUID,
  specs                     JSONB,
  condition                 TEXT DEFAULT 'Good',
  asset_number              TEXT,
  serial_number             TEXT,
  model_number              TEXT,
  purchase_date             DATE,
  purchase_cost             NUMERIC(10,2),
  depreciation_method       TEXT DEFAULT 'straight_line',
  useful_life_years         NUMERIC(5,2),
  salvage_value             NUMERIC(10,2) DEFAULT 0,
  depreciation_start_date   DATE,
  serialized                BOOLEAN DEFAULT true,
  bulk_quantity             INTEGER DEFAULT 1,
  buffer_days               INTEGER DEFAULT 0,
  allow_overbook            BOOLEAN DEFAULT false,
  max_overbook_percent      NUMERIC(6,2) DEFAULT 0,
  dependencies              JSONB,
  price_changed_at          TIMESTAMPTZ,
  price_changed_by          TEXT,
  image_url                 TEXT,
  image_enriched_at         TIMESTAMPTZ,
  rfid_tag                  TEXT,
  rent_to_own_eligible      BOOLEAN DEFAULT false,
  rent_to_own_price         NUMERIC(10,2),
  rent_to_own_credit_percent NUMERIC(5,2) DEFAULT 50,
  rent_to_own_term_months   INTEGER,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now(),
  created_by_id             UUID REFERENCES auth.users(id)
);
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- CUSTOMERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name                   TEXT NOT NULL,
  company_name                TEXT,
  account_type                TEXT DEFAULT 'individual',
  phone                       TEXT,
  phone_verified              BOOLEAN DEFAULT false,
  phone_verified_at           TIMESTAMPTZ,
  phone_verified_by           TEXT,
  secondary_phone             TEXT,
  secondary_phone_relation    TEXT,
  secondary_phone_name        TEXT,
  email                       TEXT,
  address                     TEXT,
  city                        TEXT,
  state                       TEXT,
  zip                         TEXT,
  payment_terms               TEXT DEFAULT 'due_on_receipt',
  credit_hold                 BOOLEAN DEFAULT false,
  credit_hold_reason          TEXT,
  blacklisted                 BOOLEAN DEFAULT false,
  blacklist_reason            TEXT,
  tax_exempt                  BOOLEAN DEFAULT false,
  tax_exempt_cert_number      TEXT,
  tax_exempt_expiry           DATE,
  id_verified                 BOOLEAN DEFAULT false,
  id_type                     TEXT,
  id_number                   TEXT,
  sms_opt_in                  BOOLEAN DEFAULT false,
  sms_opt_in_date             TIMESTAMPTZ,
  linked_contacts             JSONB,
  preferred_branch            TEXT,
  notes                       TEXT,
  total_rentals               INTEGER DEFAULT 0,
  total_spend                 NUMERIC(12,2) DEFAULT 0,
  last_rental_date            DATE,
  source                      TEXT DEFAULT 'manual',
  loyalty_discount_enabled    BOOLEAN DEFAULT false,
  loyalty_discount_percent    NUMERIC(5,2),
  loyalty_discount_note       TEXT,
  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now(),
  created_by_id               UUID REFERENCES auth.users(id)
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- RENTALS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rentals (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id              UUID REFERENCES public.equipment(id),
  equipment_name            TEXT,
  start_date                DATE NOT NULL,
  end_date                  DATE NOT NULL,
  customer_name             TEXT NOT NULL,
  customer_email            TEXT,
  customer_phone            TEXT,
  customer_address          TEXT,
  customer_city             TEXT,
  customer_state            TEXT,
  customer_zip              TEXT,
  worksite_address          TEXT,
  worksite_city             TEXT,
  worksite_state            TEXT,
  worksite_zip              TEXT,
  customer_id               UUID REFERENCES public.customers(id),
  branch                    TEXT,
  source_branch             TEXT,
  is_cross_branch           BOOLEAN DEFAULT false,
  transfer_out_completed    BOOLEAN DEFAULT false,
  transfer_back_completed   BOOLEAN DEFAULT false,
  is_major_job              BOOLEAN DEFAULT false,
  major_job_name            TEXT,
  is_subrent                BOOLEAN DEFAULT false,
  subrent_vendor            TEXT,
  subrent_cost              NUMERIC(10,2),
  subrent_return_date       DATE,
  subrent_markup            NUMERIC(10,2),
  late_fees_enabled         BOOLEAN DEFAULT true,
  is_late                   BOOLEAN DEFAULT false,
  days_late                 INTEGER DEFAULT 0,
  late_fee_per_day          NUMERIC(10,2) DEFAULT 0,
  late_fee_total            NUMERIC(10,2) DEFAULT 0,
  total_days                INTEGER,
  base_amount               NUMERIC(10,2),
  extra_shifts              INTEGER DEFAULT 0,
  extra_shift_rate          NUMERIC(10,2) DEFAULT 0,
  extra_shift_total         NUMERIC(10,2) DEFAULT 0,
  hour_meter_start          NUMERIC(10,2),
  hour_meter_end            NUMERIC(10,2),
  hours_used                NUMERIC(10,2),
  hourly_rate               NUMERIC(10,2),
  hour_meter_charges        NUMERIC(10,2) DEFAULT 0,
  tax_rate                  NUMERIC(6,4),
  tax_amount                NUMERIC(10,2),
  deposit                   NUMERIC(10,2),
  delivery_fee              NUMERIC(10,2) DEFAULT 0,
  return_fee                NUMERIC(10,2) DEFAULT 0,
  amount_paid               NUMERIC(10,2) DEFAULT 0,
  invoice_number            TEXT,
  status                    TEXT DEFAULT 'quote',
  delivery_method           TEXT DEFAULT 'customer_pickup',
  return_method             TEXT,
  signature_data_url        TEXT,
  notes                     TEXT,
  status_history            JSONB,
  is_rent_to_own            BOOLEAN DEFAULT false,
  purchase_price            NUMERIC(10,2),
  rent_to_own_credit_percent NUMERIC(5,2) DEFAULT 0,
  amount_credited           NUMERIC(10,2) DEFAULT 0,
  balance_remaining         NUMERIC(10,2),
  purchase_option_expiry    DATE,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now(),
  created_by_id             UUID REFERENCES auth.users(id)
);
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.rentals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- DELIVERIES & RECOVERY
-- ============================================================

CREATE TABLE IF NOT EXISTS public.deliveries (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id                 UUID REFERENCES public.rentals(id),
  customer_id               UUID REFERENCES public.customers(id),
  customer_name             TEXT NOT NULL,
  customer_phone            TEXT,
  customer_address          TEXT,
  customer_city             TEXT,
  customer_state            TEXT,
  customer_zip              TEXT,
  driver_id                 TEXT,
  driver_name               TEXT,
  team_drivers              JSONB,
  assigned_at               TIMESTAMPTZ,
  assigned_by               TEXT,
  received_at               TIMESTAMPTZ,
  received_by               TEXT,
  branch                    TEXT,
  status                    TEXT DEFAULT 'scheduled',
  is_cross_transfer         BOOLEAN DEFAULT false,
  destination_branch        TEXT,
  recommended_crew          INTEGER,
  recommended_vehicles      INTEGER,
  recommended_vehicle_type  TEXT,
  recommended_delivery_fee  NUMERIC(10,2),
  items                     JSONB,
  scheduled_date            DATE NOT NULL,
  scheduled_time            TEXT,
  schedule_changed_at       TIMESTAMPTZ,
  schedule_changed_by       TEXT,
  previous_scheduled_date   TEXT,
  previous_scheduled_time   TEXT,
  departed_at               TIMESTAMPTZ,
  arrived_at                TIMESTAMPTZ,
  completed_at              TIMESTAMPTZ,
  gps_coordinates           JSONB,
  photos                    JSONB,
  signature_data_url        TEXT,
  signed_at                 TIMESTAMPTZ,
  notes                     TEXT,
  damage_notes              TEXT,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now(),
  created_by_id             UUID REFERENCES auth.users(id)
);
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.recoveries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id             UUID REFERENCES public.rentals(id),
  delivery_id           UUID REFERENCES public.deliveries(id),
  customer_id           UUID REFERENCES public.customers(id),
  customer_name         TEXT NOT NULL,
  driver_id             TEXT,
  driver_name           TEXT,
  branch                TEXT,
  status                TEXT DEFAULT 'scheduled',
  return_route          TEXT DEFAULT 'company_pickup',
  items                 JSONB,
  scheduled_date        DATE NOT NULL,
  departed_at           TIMESTAMPTZ,
  arrived_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  returned_to_branch_at TIMESTAMPTZ,
  photos                JSONB,
  detected_damages      JSONB,
  route                 TEXT,
  work_order_id         UUID,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  created_by_id         UUID REFERENCES auth.users(id)
);
ALTER TABLE public.recoveries ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.recoveries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- WORK ORDERS & MAINTENANCE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.work_orders (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recovery_id             UUID REFERENCES public.recoveries(id),
  rental_id               UUID REFERENCES public.rentals(id),
  equipment_id            UUID REFERENCES public.equipment(id),
  equipment_name          TEXT,
  type                    TEXT NOT NULL,
  status                  TEXT DEFAULT 'scheduled',
  branch                  TEXT,
  assigned_to             TEXT,
  assigned_at             TIMESTAMPTZ,
  assignment_score        NUMERIC(5,2),
  can_start_without_parts BOOLEAN DEFAULT false,
  estimated_labor_cost    NUMERIC(10,2),
  mechanic_compensation   NUMERIC(10,2),
  created_at_field        TIMESTAMPTZ,
  scheduled_date          DATE,
  completed_date          DATE,
  description             TEXT,
  parts_required          JSONB,
  cost                    NUMERIC(10,2),
  labor_cost              NUMERIC(10,2),
  parts_cost              NUMERIC(10,2),
  condition_before        TEXT,
  condition_after         TEXT,
  eta                     DATE,
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  created_by_id           UUID REFERENCES auth.users(id)
);
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.maintenance_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id      UUID REFERENCES public.equipment(id),
  equipment_name    TEXT,
  branch            TEXT,
  type              TEXT NOT NULL,
  status            TEXT DEFAULT 'completed',
  description       TEXT,
  performed_by      TEXT,
  cost              NUMERIC(10,2),
  scheduled_date    DATE NOT NULL,
  completed_date    DATE,
  next_service_date DATE,
  condition_before  TEXT,
  condition_after   TEXT,
  parts_used        TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  created_by_id     UUID REFERENCES auth.users(id)
);
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.maintenance_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- PARTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.part_requirements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID REFERENCES public.work_orders(id),
  part_name     TEXT NOT NULL,
  quantity      INTEGER DEFAULT 1,
  status        TEXT DEFAULT 'in_stock',
  eta           DATE,
  is_critical   BOOLEAN DEFAULT false,
  vendor        TEXT,
  cost          NUMERIC(10,2),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID REFERENCES auth.users(id)
);
ALTER TABLE public.part_requirements ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.part_requirements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.parts_procurement (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id         UUID REFERENCES public.work_orders(id),
  part_requirement_id   UUID REFERENCES public.part_requirements(id),
  part_name             TEXT,
  quantity              INTEGER DEFAULT 1,
  vendor                TEXT NOT NULL,
  unit_cost             NUMERIC(10,2) NOT NULL,
  total_cost            NUMERIC(10,2),
  purchase_date         DATE,
  received_date         DATE,
  invoice_number        TEXT,
  status                TEXT DEFAULT 'ordered',
  branch                TEXT,
  purchased_by          TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  created_by_id         UUID REFERENCES auth.users(id)
);
ALTER TABLE public.parts_procurement ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.parts_procurement
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- RECURRING RENTALS & RTO
-- ============================================================

CREATE TABLE IF NOT EXISTS public.recurring_rentals (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id             UUID REFERENCES public.customers(id),
  customer_name           TEXT NOT NULL,
  customer_email          TEXT,
  customer_phone          TEXT,
  customer_address        TEXT,
  customer_city           TEXT,
  customer_state          TEXT,
  customer_zip            TEXT,
  line_items              JSONB,
  frequency               TEXT NOT NULL,
  start_date              DATE NOT NULL,
  end_date                DATE,
  rental_days             INTEGER NOT NULL,
  next_occurrence_date    DATE,
  status                  TEXT DEFAULT 'active',
  auto_confirm            BOOLEAN DEFAULT false,
  delivery_method         TEXT DEFAULT 'customer_pickup',
  return_method           TEXT DEFAULT 'customer_return',
  branch                  TEXT NOT NULL,
  notes                   TEXT,
  total_occurrences       INTEGER,
  generated_count         INTEGER DEFAULT 0,
  last_generated_date     DATE,
  last_generated_rental_id UUID REFERENCES public.rentals(id),
  created_by              TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  created_by_id           UUID REFERENCES auth.users(id)
);
ALTER TABLE public.recurring_rentals ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.recurring_rentals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.rto_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id         UUID REFERENCES public.rentals(id),
  customer_name     TEXT NOT NULL,
  customer_email    TEXT,
  equipment_name    TEXT,
  payment_number    INTEGER NOT NULL,
  total_payments    INTEGER,
  due_date          DATE NOT NULL,
  amount_due        NUMERIC(10,2) NOT NULL,
  amount_paid       NUMERIC(10,2) DEFAULT 0,
  status            TEXT DEFAULT 'pending',
  paid_at           TIMESTAMPTZ,
  paid_by           TEXT,
  reminder_sent_at  TIMESTAMPTZ,
  branch            TEXT,
  purchase_price    NUMERIC(10,2),
  credit_percent    NUMERIC(5,2),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  created_by_id     UUID REFERENCES auth.users(id)
);
ALTER TABLE public.rto_payments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.rto_payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- EXPENSES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.expenses (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date                    DATE NOT NULL,
  category                TEXT NOT NULL,
  vendor                  TEXT,
  vendor_invoice_number   TEXT,
  vendor_invoice_date     DATE,
  payment_method          TEXT,
  amount                  NUMERIC(10,2) NOT NULL,
  branch                  TEXT NOT NULL,
  description             TEXT,
  job_invoice_number      TEXT,
  receipt_url             TEXT,
  captured_by_driver      BOOLEAN DEFAULT false,
  captured_by             TEXT,
  flagged_warnings        TEXT,
  capitalized_equipment_id UUID REFERENCES public.equipment(id),
  is_capitalized          BOOLEAN DEFAULT false,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  created_by_id           UUID REFERENCES auth.users(id)
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- TIMESHEETS & DRIVER LOCATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.timesheets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_name      TEXT NOT NULL,
  staff_email     TEXT,
  staff_type      TEXT DEFAULT 'temp',
  branch          TEXT NOT NULL,
  job_reference   TEXT,
  job_type        TEXT DEFAULT 'general',
  work_date       DATE NOT NULL,
  clock_in        TEXT,
  clock_out       TEXT,
  hours_worked    NUMERIC(5,2),
  overtime_hours  NUMERIC(5,2) DEFAULT 0,
  hourly_rate     NUMERIC(10,2),
  regular_pay     NUMERIC(10,2),
  overtime_pay    NUMERIC(10,2),
  total_pay       NUMERIC(10,2),
  status          TEXT DEFAULT 'pending',
  approved_by     TEXT,
  approved_at     TIMESTAMPTZ,
  notes           TEXT,
  pay_period      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID REFERENCES auth.users(id)
);
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.driver_locations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_email    TEXT NOT NULL,
  driver_name     TEXT,
  latitude        NUMERIC(10,6),
  longitude       NUMERIC(10,6),
  accuracy        NUMERIC(8,2),
  updated_at_field TIMESTAMPTZ,
  branch          TEXT,
  current_status  TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID REFERENCES auth.users(id)
);
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.driver_locations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- GPS / TRACKING
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gps_providers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  provider_type         TEXT NOT NULL,
  branch                TEXT,
  api_key               TEXT,
  api_secret            TEXT,
  account_id            TEXT,
  base_url              TEXT,
  webhook_secret        TEXT,
  geofence_radius_miles NUMERIC(6,2) DEFAULT 1,
  poll_interval_minutes INTEGER DEFAULT 30,
  is_active             BOOLEAN DEFAULT true,
  notes                 TEXT,
  last_tested_at        TIMESTAMPTZ,
  last_test_result      TEXT,
  last_test_message     TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  created_by_id         UUID REFERENCES auth.users(id)
);
ALTER TABLE public.gps_providers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.gps_providers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.equipment_gps_links (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id            UUID REFERENCES public.equipment(id),
  equipment_name          TEXT,
  provider_id             UUID REFERENCES public.gps_providers(id),
  provider_type           TEXT,
  device_id               TEXT NOT NULL,
  device_label            TEXT,
  last_known_lat          NUMERIC(10,6),
  last_known_lng          NUMERIC(10,6),
  last_known_address      TEXT,
  last_known_speed        NUMERIC(6,2),
  ignition_on             BOOLEAN,
  battery_level           NUMERIC(5,2),
  last_seen_at            TIMESTAMPTZ,
  geofence_breached       BOOLEAN DEFAULT false,
  geofence_breached_at    TIMESTAMPTZ,
  speed_anomaly_detected  BOOLEAN DEFAULT false,
  speed_anomaly_at        TIMESTAMPTZ,
  night_movement_detected BOOLEAN DEFAULT false,
  night_movement_at       TIMESTAMPTZ,
  is_active               BOOLEAN DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  created_by_id           UUID REFERENCES auth.users(id)
);
ALTER TABLE public.equipment_gps_links ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.equipment_gps_links
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- SHOP / MECHANICS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mechanic_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 TEXT NOT NULL,
  full_name             TEXT NOT NULL,
  skills                TEXT[],
  hourly_rate           NUMERIC(10,2),
  per_job_rate          NUMERIC(10,2),
  payment_type          TEXT DEFAULT 'per_job',
  branch                TEXT NOT NULL,
  is_active             BOOLEAN DEFAULT true,
  max_concurrent_jobs   INTEGER DEFAULT 2,
  certifications        TEXT[],
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  created_by_id         UUID REFERENCES auth.users(id)
);
ALTER TABLE public.mechanic_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.mechanic_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.predictive_alerts (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id                UUID REFERENCES public.equipment(id),
  equipment_name              TEXT,
  category                    TEXT,
  severity                    TEXT DEFAULT 'medium',
  alert_type                  TEXT NOT NULL,
  message                     TEXT NOT NULL,
  recommendation              TEXT,
  confidence_score            NUMERIC(5,2),
  days_since_last_service     INTEGER,
  estimated_days_until_failure INTEGER,
  branch                      TEXT,
  status                      TEXT DEFAULT 'active',
  acknowledged_at             TIMESTAMPTZ,
  acknowledged_by             TEXT,
  generated_at                TIMESTAMPTZ,
  expires_at                  TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now(),
  created_by_id               UUID REFERENCES auth.users(id)
);
ALTER TABLE public.predictive_alerts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.predictive_alerts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- EVENT PLANNING
-- ============================================================

CREATE TABLE IF NOT EXISTS public.event_plans (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 TEXT NOT NULL,
  event_date            DATE NOT NULL,
  event_type            TEXT DEFAULT 'other',
  status                TEXT DEFAULT 'draft',
  owner_email           TEXT,
  owner_role            TEXT DEFAULT 'staff',
  branch                TEXT,
  customer_name         TEXT,
  customer_email        TEXT,
  customer_phone        TEXT,
  guest_count           INTEGER,
  venue_type            TEXT DEFAULT 'dimensions',
  venue_name            TEXT,
  venue_width_ft        NUMERIC(8,2),
  venue_length_ft       NUMERIC(8,2),
  venue_photo_url       TEXT,
  venue_surface         TEXT DEFAULT 'unknown',
  canvas_items          JSONB,
  canvas_scale          NUMERIC(6,2) DEFAULT 10,
  quoted_total          NUMERIC(10,2),
  rental_id             UUID REFERENCES public.rentals(id),
  planner_notes         TEXT,
  customer_notes        TEXT,
  nudges_acknowledged   TEXT[],
  last_edited_by        TEXT,
  last_edited_at        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  created_by_id         UUID REFERENCES auth.users(id)
);
ALTER TABLE public.event_plans ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.event_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- RFQ
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rfq_records (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_number              TEXT,
  title                   TEXT,
  issuing_org             TEXT NOT NULL,
  org_type                TEXT DEFAULT 'municipal',
  source                  TEXT DEFAULT 'email',
  received_date           DATE NOT NULL,
  due_date                DATE,
  due_time                TEXT,
  submission_method       TEXT,
  submission_address      TEXT,
  contact_name            TEXT,
  contact_email           TEXT,
  contact_phone           TEXT,
  branch                  TEXT,
  status                  TEXT DEFAULT 'received',
  uploaded_file_url       TEXT,
  uploaded_file_name      TEXT,
  raw_rfq_text            TEXT,
  extracted_requirements  JSONB,
  compliance_matrix       JSONB,
  proposed_line_items     JSONB,
  estimated_total_value   NUMERIC(12,2),
  ai_analysis_summary     TEXT,
  org_history_summary     TEXT,
  suggested_response_format TEXT,
  response_narrative      TEXT,
  manual_response_mode    BOOLEAN DEFAULT false,
  is_template             BOOLEAN DEFAULT false,
  internal_notes          TEXT,
  suggested_file_name     TEXT,
  submitted_at            TIMESTAMPTZ,
  submitted_by            TEXT,
  outcome                 TEXT,
  awarded_value           NUMERIC(12,2),
  linked_event_plan_id    UUID REFERENCES public.event_plans(id),
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  created_by_id           UUID REFERENCES auth.users(id)
);
ALTER TABLE public.rfq_records ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.rfq_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- DISCOUNTS & PROMOS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.volume_discount_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  category          TEXT,
  equipment_id      UUID REFERENCES public.equipment(id),
  equipment_name    TEXT,
  minimum_quantity  INTEGER NOT NULL,
  discount_type     TEXT DEFAULT 'percent',
  discount_value    NUMERIC(10,2) NOT NULL,
  active            BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  created_by_id     UUID REFERENCES auth.users(id)
);
ALTER TABLE public.volume_discount_rules ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.volume_discount_rules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.promo_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  description     TEXT,
  discount_type   TEXT DEFAULT 'percent',
  discount_value  NUMERIC(10,2) NOT NULL,
  active          BOOLEAN DEFAULT true,
  usage_limit     INTEGER,
  usage_count     INTEGER DEFAULT 0,
  expires_at      DATE,
  applies_to      TEXT DEFAULT 'all',
  applies_to_category TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID REFERENCES auth.users(id)
);
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.discount_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id       UUID REFERENCES public.rentals(id),
  invoice_number  TEXT,
  customer_name   TEXT,
  discount_type   TEXT NOT NULL,
  discount_label  TEXT,
  discount_amount NUMERIC(10,2) NOT NULL,
  original_amount NUMERIC(10,2),
  applied_by      TEXT,
  branch          TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID REFERENCES auth.users(id)
);
ALTER TABLE public.discount_logs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.discount_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.delivery_matrix (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch                TEXT NOT NULL,
  labor_rate_per_man_hour NUMERIC(10,2),
  truck_rate_per_hour   NUMERIC(10,2),
  default_crew_size     INTEGER DEFAULT 2,
  default_trucks        INTEGER DEFAULT 1,
  minimum_charge        NUMERIC(10,2),
  zones                 JSONB,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  created_by_id         UUID REFERENCES auth.users(id)
);
ALTER TABLE public.delivery_matrix ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.delivery_matrix
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- AUDIT / REPORTS / MISC
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action        TEXT NOT NULL,
  entity_name   TEXT NOT NULL,
  entity_id     TEXT,
  entity_label  TEXT,
  performed_by  TEXT NOT NULL,
  performed_at  TIMESTAMPTZ,
  changes       JSONB,
  ip_address    TEXT,
  user_agent    TEXT,
  branch        TEXT,
  reason        TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID REFERENCES auth.users(id)
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name     TEXT NOT NULL,
  item_type     TEXT NOT NULL,
  model         TEXT,
  serial_number TEXT,
  asset_number  TEXT,
  action        TEXT NOT NULL,
  branch        TEXT NOT NULL,
  asking_price  NUMERIC(10,2),
  comments      TEXT,
  send_to_emails TEXT[],
  custom_email  TEXT,
  sent_by       TEXT,
  photo_paths   TEXT[],
  is_sent       BOOLEAN DEFAULT false,
  is_posted     BOOLEAN DEFAULT false,
  is_deleted    BOOLEAN DEFAULT false,
  sent_at       TIMESTAMPTZ,
  last_sent_at  TIMESTAMPTZ,
  last_edited_at TIMESTAMPTZ,
  viewed_at     TIMESTAMPTZ,
  viewed_by     TEXT,
  activity_log  TEXT[],
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID REFERENCES auth.users(id)
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  level       INTEGER NOT NULL,
  permissions TEXT[],
  scope       TEXT NOT NULL,
  is_built_in BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID REFERENCES auth.users(id)
);
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.platform_features (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module              TEXT,
  feature_name        TEXT,
  description         TEXT,
  workflow            TEXT[],
  requires_customer   BOOLEAN DEFAULT false,
  requires_signature  BOOLEAN DEFAULT false,
  requires_payment    BOOLEAN DEFAULT false,
  common_questions    JSONB,
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  created_by_id       UUID REFERENCES auth.users(id)
);
ALTER TABLE public.platform_features ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.platform_features
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.payment_settings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active_processor          TEXT DEFAULT 'none',
  stripe_api_key            TEXT,
  stripe_publishable_key    TEXT,
  square_access_token       TEXT,
  square_application_id     TEXT,
  paypal_client_id          TEXT,
  paypal_client_secret      TEXT,
  authorize_net_api_key     TEXT,
  authorize_net_api_login_id TEXT,
  amazon_pay_merchant_id    TEXT,
  amazon_pay_public_key     TEXT,
  amazon_pay_private_key    TEXT,
  wise_api_token            TEXT,
  quickbooks_realm_id       TEXT,
  quickbooks_access_token   TEXT,
  quickbooks_refresh_token  TEXT,
  auto_capture              BOOLEAN DEFAULT false,
  send_receipt_email        BOOLEAN DEFAULT true,
  webhook_secret            TEXT,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now(),
  created_by_id             UUID REFERENCES auth.users(id)
);
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.staff_phones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  phone         TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID REFERENCES auth.users(id)
);
ALTER TABLE public.staff_phones ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.staff_phones
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.custom_emails (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  type          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID REFERENCES auth.users(id)
);
ALTER TABLE public.custom_emails ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.custom_emails
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.user_roster (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT,
  email         TEXT NOT NULL,
  branch        TEXT,
  role          TEXT DEFAULT 'user',
  invite_status TEXT DEFAULT 'pending',
  invited_at    TIMESTAMPTZ,
  invite_error  TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID REFERENCES auth.users(id)
);
ALTER TABLE public.user_roster ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_roster
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.pull_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_number       INTEGER NOT NULL,
  title           TEXT NOT NULL,
  author          TEXT NOT NULL,
  status          TEXT NOT NULL,
  merged_at       TIMESTAMPTZ,
  url             TEXT,
  last_checked_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  created_by_id   UUID REFERENCES auth.users(id)
);
ALTER TABLE public.pull_requests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.pull_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.cpro_contacts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name             TEXT,
  phone                 TEXT,
  email                 TEXT,
  address               TEXT,
  city                  TEXT,
  state                 TEXT,
  zip_code              TEXT,
  company_name          TEXT,
  account_number        TEXT,
  notes                 TEXT,
  migration_source      TEXT NOT NULL,
  migration_session_id  TEXT NOT NULL,
  raw_data              JSONB,
  mapped_to_equipment   BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  created_by_id         UUID REFERENCES auth.users(id)
);
ALTER TABLE public.cpro_contacts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.cpro_contacts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- RLS POLICIES (Admin full access, users read own)
-- ============================================================
-- Apply this pattern to each table.
-- Replace `table_name` with the actual table name.

-- Example for `rentals`:
-- CREATE POLICY "Admin full access" ON public.rentals FOR ALL
--   USING (
--     EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
--   );
-- CREATE POLICY "Users read own" ON public.rentals FOR SELECT
--   USING (created_by_id = auth.uid());

-- ============================================================
-- USEFUL INDEXES
-- ============================================================

CREATE INDEX idx_rentals_customer_id       ON public.rentals(customer_id);
CREATE INDEX idx_rentals_equipment_id      ON public.rentals(equipment_id);
CREATE INDEX idx_rentals_status            ON public.rentals(status);
CREATE INDEX idx_rentals_branch            ON public.rentals(branch);
CREATE INDEX idx_rentals_start_date        ON public.rentals(start_date);
CREATE INDEX idx_deliveries_rental_id      ON public.deliveries(rental_id);
CREATE INDEX idx_deliveries_scheduled_date ON public.deliveries(scheduled_date);
CREATE INDEX idx_work_orders_equipment_id  ON public.work_orders(equipment_id);
CREATE INDEX idx_equipment_unit_status     ON public.equipment(unit_status);
CREATE INDEX idx_equipment_category        ON public.equipment(category);
CREATE INDEX idx_audit_logs_performed_by   ON public.audit_logs(performed_by);
CREATE INDEX idx_audit_logs_entity         ON public.audit_logs(entity_name, entity_id);
CREATE INDEX idx_expenses_branch           ON public.expenses(branch);
CREATE INDEX idx_expenses_date             ON public.expenses(date);
CREATE INDEX idx_timesheets_branch         ON public.timesheets(branch);
CREATE INDEX idx_timesheets_work_date      ON public.timesheets(work_date);