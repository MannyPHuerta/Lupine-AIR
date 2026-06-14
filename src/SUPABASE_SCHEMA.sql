-- =============================================================================
-- AIR PLATFORM — COMPLETE SUPABASE SCHEMA
-- Multi-tenant, multi-branch equipment rental SaaS
-- Generated: 2026-06-14  |  Safe to re-run: uses IF NOT EXISTS throughout
-- =============================================================================
-- USAGE: Run this entire file in Supabase SQL Editor.
-- All tables use tenant_id for RLS isolation.
-- Branch filtering is handled at the app layer (not RLS).
-- =============================================================================

create extension if not exists "pgcrypto";

-- =============================================================================
-- SECTION 1: CORE STRUCTURE — Tenants, Branches, Profiles
-- =============================================================================

create table if not exists tenants (
  id                        uuid primary key default gen_random_uuid(),
  company_name              text not null,
  slug                      text unique not null,
  admin_email               text not null,
  phone                     text,
  industry                  text check (industry in ('construction','events','both')) default 'both',
  plan_tier                 text check (plan_tier in ('starter','professional','enterprise')) default 'starter',
  status                    text check (status in ('trial','active','suspended','cancelled')) default 'trial',
  trial_start_date          date,
  trial_ends_at             date,
  onboarding_completed      boolean default false,
  onboarding_step           integer default 0,
  stripe_customer_id        text,
  stripe_subscription_id    text,
  trial_reminder_day12_sent boolean default false,
  trial_reminder_day14_sent boolean default false,
  suspended_at              timestamptz,
  data_delete_scheduled_at  timestamptz,
  created_at                timestamptz default now()
);

create table if not exists branches (
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null references tenants(id) on delete cascade,
  name                   text not null,
  code                   text,
  address                text,
  city                   text,
  state                  text,
  zip                    text,
  phone                  text,
  email                  text,
  parts_buyer_email      text,
  purchasing_email       text,
  accounting_email       text,
  default_area_code      text,
  default_starting_float numeric(10,2) default 0,
  next_invoice_number    integer default 1000,
  is_active              boolean default true,
  created_at             timestamptz default now()
);

create table if not exists profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  tenant_id         uuid not null references tenants(id),
  home_branch_id    uuid references branches(id),
  current_branch_id uuid references branches(id),
  full_name         text,
  role              text check (role in ('owner','admin','regional_manager','branch_manager','staff','driver','mechanic')) default 'staff',
  phone             text,
  hourly_rate       numeric(10,2),
  is_active         boolean default true,
  created_at        timestamptz default now()
);

-- =============================================================================
-- SECTION 2: COMPANY & BRANCH SETTINGS
-- =============================================================================

create table if not exists company_settings (
  id                          uuid primary key default gen_random_uuid(),
  tenant_id                   uuid not null unique references tenants(id) on delete cascade,
  logo_url                    text,
  website_url                 text,
  tax_id                      text,
  duns_number                 text,
  cage_code                   text,
  certifications              text[],
  invoice_terms               text,
  invoice_footer              text,
  invoice_number_prefix       text default 'INV',
  invoice_number_start        integer default 1001,
  auto_assign_invoice_numbers boolean default true,
  sms_reminders_enabled       boolean default true,
  rental_day_mode             text check (rental_day_mode in ('clock_hour','calendar_day')) default 'clock_hour',
  late_fees_enabled           boolean default false,
  late_fee_per_day            numeric(10,2) default 0,
  late_fee_penalty_rate       numeric(5,4) default 0,
  late_fee_grace_period       integer default 0,
  late_fee_max_cap            numeric(10,2) default 0,
  header_style                text check (header_style in ('classic','glassmorphism','neon','navy','seasonal')) default 'classic',
  seasonal_auto_activate      boolean default false,
  seasonal_theme_key          text,
  auth_method                 text check (auth_method in ('magic_link','password','sso')) default 'magic_link',
  demo_mode_enabled           boolean default false,
  demo_branch_id              uuid references branches(id),
  store_mode                  text check (store_mode in ('both','construction_only','events_only')) default 'both',
  store_intent_style          text default 'split_screen',
  geofence_alert_phones       text[],
  geofence_alert_emails       text[],
  fraud_alert_phones          text[],
  fraud_alert_emails          text[],
  branding_theme              jsonb,
  rfid_options                jsonb,
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now()
);

create table if not exists payment_settings (
  id                         uuid primary key default gen_random_uuid(),
  tenant_id                  uuid not null unique references tenants(id) on delete cascade,
  active_processor           text check (active_processor in ('stripe','square','paypal','authorize_net','amazon_pay','wise','quickbooks','none')) default 'none',
  stripe_api_key             text,
  stripe_publishable_key     text,
  square_access_token        text,
  square_application_id      text,
  paypal_client_id           text,
  paypal_client_secret       text,
  authorize_net_api_key      text,
  authorize_net_api_login_id text,
  amazon_pay_merchant_id     text,
  amazon_pay_public_key      text,
  amazon_pay_private_key     text,
  wise_api_token             text,
  quickbooks_realm_id        text,
  quickbooks_access_token    text,
  quickbooks_refresh_token   text,
  auto_capture               boolean default false,
  send_receipt_email         boolean default true,
  webhook_secret             text,
  created_at                 timestamptz default now()
);

-- =============================================================================
-- SECTION 3: EQUIPMENT
-- =============================================================================

create table if not exists equipment_categories (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null references tenants(id) on delete cascade,
  name                     text not null,
  parent                   text,
  description              text,
  default_footprint_width  numeric(8,2),
  default_footprint_length numeric(8,2),
  attributes               jsonb,
  created_at               timestamptz default now()
);

create table if not exists equipment (
  id                         uuid primary key default gen_random_uuid(),
  tenant_id                  uuid not null references tenants(id) on delete cascade,
  home_branch_id             uuid not null references branches(id),
  current_branch_id          uuid not null references branches(id),
  inventory_item_id          text,
  name                       text not null,
  category                   text,
  consumable                 boolean default false,
  rental_alert               text,
  daily_rate                 numeric(10,2) not null,
  weekly_rate                numeric(10,2),
  monthly_rate               numeric(10,2),
  hourly_rate                numeric(10,2),
  has_hour_meter             boolean default false,
  current_hour_meter_reading numeric(10,2) default 0,
  deposit_required           numeric(10,2),
  taxable                    boolean default true,
  footprint_width            numeric(8,2),
  footprint_length           numeric(8,2),
  unit_status                text check (unit_status in ('available','reserved','out_on_rental','in_shop','awaiting_parts','in_laundry','under_inspection','retired')) default 'available',
  status_note                text,
  status_updated_at          timestamptz,
  status_updated_by          text,
  condition                  text check (condition in ('New','Good','Fair','Needs Repair','Retired')) default 'Good',
  asset_number               text,
  serial_number              text,
  model_number               text,
  purchase_date              date,
  purchase_cost              numeric(10,2),
  depreciation_method        text check (depreciation_method in ('straight_line','declining_balance')) default 'straight_line',
  useful_life_years          numeric(5,2),
  salvage_value              numeric(10,2) default 0,
  depreciation_start_date    date,
  serialized                 boolean default true,
  bulk_quantity              integer default 1,
  buffer_days                integer default 0,
  allow_overbook             boolean default false,
  max_overbook_percent       numeric(5,2) default 0,
  dependencies               jsonb,
  image_url                  text,
  image_enriched_at          timestamptz,
  rfid_tag                   text,
  rent_to_own_eligible       boolean default false,
  rent_to_own_price          numeric(10,2),
  rent_to_own_credit_percent numeric(5,2) default 50,
  rent_to_own_term_months    integer,
  specs                      jsonb,
  tent_specs_id              uuid,
  price_changed_at           timestamptz,
  price_changed_by           text,
  notes                      text,
  created_at                 timestamptz default now(),
  updated_at                 timestamptz default now()
);

create index if not exists idx_equipment_tenant         on equipment(tenant_id);
create index if not exists idx_equipment_home_branch    on equipment(home_branch_id);
create index if not exists idx_equipment_current_branch on equipment(current_branch_id);
create index if not exists idx_equipment_unit_status    on equipment(unit_status);

-- =============================================================================
-- SECTION 4: CUSTOMERS  (tenant-level — no branch_id)
-- =============================================================================

create table if not exists customers (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null references tenants(id) on delete cascade,
  full_name                text not null,
  company_name             text,
  account_type             text check (account_type in ('individual','business','municipal','nonprofit')) default 'individual',
  phone                    text,
  phone_verified           boolean default false,
  phone_verified_at        timestamptz,
  phone_verified_by        text,
  secondary_phone          text,
  secondary_phone_relation text,
  secondary_phone_name     text,
  email                    text,
  address                  text,
  city                     text,
  state                    text,
  zip                      text,
  payment_terms            text check (payment_terms in ('due_on_receipt','net_15','net_30','net_60')) default 'due_on_receipt',
  credit_hold              boolean default false,
  credit_hold_reason       text,
  blacklisted              boolean default false,
  blacklist_reason         text,
  tax_exempt               boolean default false,
  tax_exempt_cert_number   text,
  tax_exempt_expiry        date,
  id_verified              boolean default false,
  id_type                  text,
  id_number                text,
  sms_opt_in               boolean default false,
  sms_opt_in_date          timestamptz,
  linked_contacts          jsonb,
  preferred_branch_id      uuid references branches(id),
  loyalty_discount_enabled boolean default false,
  loyalty_discount_percent numeric(5,2),
  loyalty_discount_note    text,
  total_rentals            integer default 0,
  total_spend              numeric(12,2) default 0,
  last_rental_date         date,
  source                   text check (source in ('manual','rental_form','cpro_import','portal')) default 'manual',
  notes                    text,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

create index if not exists idx_customers_tenant on customers(tenant_id);
create index if not exists idx_customers_phone  on customers(tenant_id, phone);
create index if not exists idx_customers_email  on customers(tenant_id, email);

-- =============================================================================
-- SECTION 5: RENTALS
-- =============================================================================

create table if not exists rentals (
  id                         uuid primary key default gen_random_uuid(),
  tenant_id                  uuid not null references tenants(id) on delete cascade,
  branch_id                  uuid not null references branches(id),
  customer_id                uuid references customers(id),
  customer_name              text not null,
  customer_email             text,
  customer_phone             text,
  customer_address           text,
  customer_city              text,
  customer_state             text,
  customer_zip               text,
  worksite_address           text,
  worksite_city              text,
  worksite_state             text,
  worksite_zip               text,
  equipment_id               uuid references equipment(id),
  equipment_name             text,
  source_branch_id           uuid references branches(id),
  is_cross_branch            boolean default false,
  transfer_out_completed     boolean default false,
  transfer_back_completed    boolean default false,
  start_date                 date not null,
  end_date                   date not null,
  total_days                 integer,
  status                     text check (status in ('quote','reservation','contract','out','returned','completed','cancelled')) default 'quote',
  delivery_method            text check (delivery_method in ('customer_pickup','company_delivery','shipped')) default 'customer_pickup',
  return_method              text check (return_method in ('company_pickup','customer_return','customer_ships')),
  base_amount                numeric(10,2),
  extra_shifts               integer default 0,
  extra_shift_rate           numeric(10,2) default 0,
  extra_shift_total          numeric(10,2) default 0,
  hour_meter_start           numeric(10,2),
  hour_meter_end             numeric(10,2),
  hours_used                 numeric(10,2),
  hourly_rate                numeric(10,2),
  hour_meter_charges         numeric(10,2) default 0,
  tax_rate                   numeric(6,4),
  tax_amount                 numeric(10,2),
  deposit                    numeric(10,2),
  delivery_fee               numeric(10,2) default 0,
  return_fee                 numeric(10,2) default 0,
  amount_paid                numeric(10,2) default 0,
  invoice_number             text,
  late_fees_enabled          boolean default true,
  is_late                    boolean default false,
  days_late                  integer default 0,
  late_fee_per_day           numeric(10,2) default 0,
  late_fee_total             numeric(10,2) default 0,
  is_major_job               boolean default false,
  major_job_name             text,
  is_subrent                 boolean default false,
  subrent_vendor             text,
  subrent_cost               numeric(10,2),
  subrent_return_date        date,
  subrent_markup             numeric(10,2),
  is_rent_to_own             boolean default false,
  purchase_price             numeric(10,2),
  rent_to_own_credit_percent numeric(5,2) default 0,
  amount_credited            numeric(10,2) default 0,
  balance_remaining          numeric(10,2),
  purchase_option_expiry     date,
  signature_data_url         text,
  status_history             jsonb,
  notes                      text,
  created_at                 timestamptz default now(),
  updated_at                 timestamptz default now()
);

create index if not exists idx_rentals_tenant    on rentals(tenant_id);
create index if not exists idx_rentals_branch    on rentals(branch_id);
create index if not exists idx_rentals_customer  on rentals(customer_id);
create index if not exists idx_rentals_equipment on rentals(equipment_id);
create index if not exists idx_rentals_status    on rentals(tenant_id, status);
create index if not exists idx_rentals_dates     on rentals(start_date, end_date);

create table if not exists recurring_rentals (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null references tenants(id) on delete cascade,
  branch_id                uuid not null references branches(id),
  customer_id              uuid references customers(id),
  customer_name            text not null,
  customer_email           text,
  customer_phone           text,
  customer_address         text,
  customer_city            text,
  customer_state           text,
  customer_zip             text,
  line_items               jsonb not null,
  frequency                text check (frequency in ('weekly','biweekly','monthly','quarterly','yearly')) not null,
  start_date               date not null,
  end_date                 date,
  rental_days              integer not null,
  next_occurrence_date     date,
  status                   text check (status in ('active','paused','completed')) default 'active',
  auto_confirm             boolean default false,
  delivery_method          text check (delivery_method in ('customer_pickup','company_delivery','shipped')) default 'customer_pickup',
  return_method            text check (return_method in ('company_pickup','customer_return','customer_ships')) default 'customer_return',
  total_occurrences        integer,
  generated_count          integer default 0,
  last_generated_date      date,
  last_generated_rental_id uuid references rentals(id),
  created_by               text,
  notes                    text,
  created_at               timestamptz default now()
);

create table if not exists rto_payments (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  branch_id        uuid not null references branches(id),
  rental_id        uuid not null references rentals(id) on delete cascade,
  customer_name    text,
  customer_email   text,
  equipment_name   text,
  payment_number   integer not null,
  total_payments   integer,
  due_date         date not null,
  amount_due       numeric(10,2) not null,
  amount_paid      numeric(10,2) default 0,
  status           text check (status in ('pending','paid','late','cancelled')) default 'pending',
  paid_at          timestamptz,
  paid_by          text,
  reminder_sent_at timestamptz,
  purchase_price   numeric(10,2),
  credit_percent   numeric(5,2),
  created_at       timestamptz default now()
);

-- =============================================================================
-- SECTION 6: DELIVERIES & RECOVERIES
-- =============================================================================

create table if not exists deliveries (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null references tenants(id) on delete cascade,
  branch_id                uuid not null references branches(id),
  rental_id                uuid references rentals(id),
  customer_id              uuid references customers(id),
  customer_name            text not null,
  customer_phone           text,
  customer_address         text,
  customer_city            text,
  customer_state           text,
  customer_zip             text,
  driver_id                text,
  driver_name              text,
  team_drivers             jsonb,
  assigned_at              timestamptz,
  assigned_by              text,
  received_at              timestamptz,
  received_by              text,
  status                   text check (status in ('scheduled','departed','arrived','setup_complete','signed','completed','cancelled')) default 'scheduled',
  is_cross_transfer        boolean default false,
  destination_branch_id    uuid references branches(id),
  recommended_crew         integer,
  recommended_vehicles     integer,
  recommended_vehicle_type text,
  recommended_delivery_fee numeric(10,2),
  items                    jsonb,
  scheduled_date           date not null,
  scheduled_time           text,
  schedule_changed_at      timestamptz,
  schedule_changed_by      text,
  previous_scheduled_date  date,
  previous_scheduled_time  text,
  departed_at              timestamptz,
  arrived_at               timestamptz,
  completed_at             timestamptz,
  gps_coordinates          jsonb,
  photos                   jsonb,
  signature_data_url       text,
  signed_at                timestamptz,
  damage_notes             text,
  notes                    text,
  created_at               timestamptz default now()
);

create index if not exists idx_deliveries_tenant         on deliveries(tenant_id);
create index if not exists idx_deliveries_branch         on deliveries(branch_id);
create index if not exists idx_deliveries_scheduled_date on deliveries(scheduled_date);

create table if not exists recoveries (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  branch_id             uuid not null references branches(id),
  rental_id             uuid references rentals(id),
  delivery_id           uuid references deliveries(id),
  customer_id           uuid references customers(id),
  customer_name         text not null,
  driver_id             text,
  driver_name           text,
  status                text check (status in ('scheduled','departed','arrived','photos_captured','loaded','returned_to_branch','completed','cancelled')) default 'scheduled',
  return_route          text check (return_route in ('company_pickup','customer_return','customer_ships')) default 'company_pickup',
  items                 jsonb,
  scheduled_date        date not null,
  departed_at           timestamptz,
  arrived_at            timestamptz,
  completed_at          timestamptz,
  returned_to_branch_at timestamptz,
  photos                jsonb,
  detected_damages      jsonb,
  route                 text check (route in ('shop','laundry')),
  work_order_id         uuid,
  notes                 text,
  created_at            timestamptz default now()
);

-- =============================================================================
-- SECTION 7: MAINTENANCE, WORK ORDERS, PARTS
-- =============================================================================

create table if not exists maintenance_logs (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  branch_id         uuid not null references branches(id),
  equipment_id      uuid not null references equipment(id),
  equipment_name    text,
  type              text check (type in ('preventive','repair','inspection','cleaning','parts_replacement','other')) not null,
  status            text check (status in ('scheduled','in_progress','completed','cancelled')) default 'completed',
  description       text,
  performed_by      text,
  cost              numeric(10,2),
  scheduled_date    date not null,
  completed_date    date,
  next_service_date date,
  condition_before  text check (condition_before in ('New','Good','Fair','Needs Repair','Retired')),
  condition_after   text check (condition_after in ('New','Good','Fair','Needs Repair','Retired')),
  parts_used        text,
  notes             text,
  created_at        timestamptz default now()
);

create table if not exists work_orders (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references tenants(id) on delete cascade,
  branch_id               uuid not null references branches(id),
  recovery_id             uuid references recoveries(id),
  rental_id               uuid references rentals(id),
  equipment_id            uuid not null references equipment(id),
  equipment_name          text,
  type                    text check (type in ('repair','inspection','cleaning','preventive_maintenance')) not null,
  status                  text check (status in ('scheduled','in_progress','awaiting_parts','completed','cancelled')) default 'scheduled',
  assigned_to             text,
  assigned_at             timestamptz,
  assignment_score        numeric(5,2),
  can_start_without_parts boolean default false,
  estimated_labor_cost    numeric(10,2),
  mechanic_compensation   numeric(10,2),
  scheduled_date          date,
  completed_date          date,
  eta                     date,
  description             text,
  parts_required          jsonb,
  cost                    numeric(10,2),
  labor_cost              numeric(10,2),
  parts_cost              numeric(10,2),
  condition_before        text check (condition_before in ('New','Good','Fair','Needs Repair','Retired')),
  condition_after         text check (condition_after in ('New','Good','Fair','Needs Repair','Retired')),
  notes                   text,
  created_at              timestamptz default now()
);

create table if not exists part_requirements (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references tenants(id) on delete cascade,
  work_order_id uuid not null references work_orders(id) on delete cascade,
  part_name     text not null,
  quantity      integer default 1,
  status        text check (status in ('in_stock','on_order','unavailable','received')) default 'in_stock',
  eta           date,
  is_critical   boolean default false,
  vendor        text,
  cost          numeric(10,2),
  notes         text,
  created_at    timestamptz default now()
);

create table if not exists parts_procurement (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  branch_id           uuid not null references branches(id),
  work_order_id       uuid not null references work_orders(id),
  part_requirement_id uuid references part_requirements(id),
  part_name           text not null,
  quantity            integer default 1,
  vendor              text not null,
  unit_cost           numeric(10,2) not null,
  total_cost          numeric(10,2),
  purchase_date       date,
  received_date       date,
  invoice_number      text,
  status              text check (status in ('ordered','in_transit','received','rejected')) default 'ordered',
  purchased_by        text,
  notes               text,
  created_at          timestamptz default now()
);

create table if not exists mechanic_profiles (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  branch_id           uuid not null references branches(id),
  profile_id          uuid references profiles(id),
  email               text not null,
  full_name           text not null,
  skills              text[],
  hourly_rate         numeric(10,2),
  per_job_rate        numeric(10,2),
  payment_type        text check (payment_type in ('hourly','per_job')) default 'per_job',
  is_active           boolean default true,
  max_concurrent_jobs integer default 2,
  certifications      text[],
  notes               text,
  created_at          timestamptz default now()
);

create table if not exists predictive_alerts (
  id                           uuid primary key default gen_random_uuid(),
  tenant_id                    uuid not null references tenants(id) on delete cascade,
  branch_id                    uuid not null references branches(id),
  equipment_id                 uuid not null references equipment(id),
  equipment_name               text,
  category                     text,
  severity                     text check (severity in ('low','medium','high','critical')) default 'medium',
  alert_type                   text check (alert_type in ('maintenance_overdue','wear_pattern','failure_risk','inspection_due','parts_degradation')) not null,
  message                      text not null,
  recommendation               text,
  confidence_score             numeric(5,2),
  days_since_last_service      integer,
  estimated_days_until_failure integer,
  status                       text check (status in ('active','acknowledged','resolved')) default 'active',
  acknowledged_at              timestamptz,
  acknowledged_by              text,
  generated_at                 timestamptz default now(),
  expires_at                   timestamptz
);

-- =============================================================================
-- SECTION 8: FINANCIALS
-- =============================================================================

create table if not exists expenses (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null references tenants(id) on delete cascade,
  branch_id                uuid not null references branches(id),
  date                     date not null,
  category                 text not null,
  vendor                   text,
  vendor_invoice_number    text,
  vendor_invoice_date      date,
  payment_method           text check (payment_method in ('check','ach','credit_card','cash','wire','other')),
  amount                   numeric(10,2) not null,
  description              text,
  job_invoice_number       text,
  receipt_url              text,
  captured_by_driver       boolean default false,
  captured_by              text,
  flagged_warnings         text,
  capitalized_equipment_id uuid references equipment(id),
  is_capitalized           boolean default false,
  created_at               timestamptz default now()
);

create table if not exists vendors (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  name           text not null,
  category       text not null,
  contact_name   text,
  phone          text,
  email          text,
  website        text,
  account_number text,
  payment_terms  text,
  is_active      boolean default true,
  added_by       text,
  notes          text,
  created_at     timestamptz default now()
);

create table if not exists supply_items (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  branch_id             uuid references branches(id),
  name                  text not null,
  category              text not null,
  unit                  text not null,
  preferred_vendor_id   uuid references vendors(id),
  preferred_vendor_name text,
  last_unit_price       numeric(10,2),
  current_stock         numeric(10,2) default 0,
  min_stock_level       numeric(10,2) default 0,
  reorder_quantity      numeric(10,2) default 1,
  sku                   text,
  is_active             boolean default true,
  notes                 text,
  created_at            timestamptz default now()
);

create table if not exists purchase_orders (
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null references tenants(id) on delete cascade,
  branch_id              uuid not null references branches(id),
  po_number              text,
  vendor_id              uuid references vendors(id),
  vendor_name            text not null,
  vendor_email           text,
  status                 text check (status in ('draft','pending_approval','approved','submitted','ordered','partially_received','received','closed','cancelled')) default 'draft',
  line_items             jsonb,
  total_amount           numeric(10,2),
  requested_by           text,
  approved_by            text,
  approved_at            timestamptz,
  submitted_at           timestamptz,
  expected_delivery_date date,
  received_at            timestamptz,
  received_by            text,
  receipt_notes          text,
  is_urgent              boolean default false,
  notes                  text,
  created_at             timestamptz default now()
);

create table if not exists cash_drawers (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references tenants(id) on delete cascade,
  branch_id               uuid not null references branches(id),
  shift_date              date not null,
  shift_label             text check (shift_label in ('Morning','Afternoon','Evening','Full Day')) default 'Full Day',
  opened_by               text,
  opened_at               timestamptz,
  starting_float          numeric(10,2) default 0,
  attendant_log           jsonb,
  closed_by               text,
  closed_at               timestamptz,
  status                  text check (status in ('open','closed','reconciled')) default 'open',
  cash_collected          numeric(10,2) default 0,
  card_collected          numeric(10,2) default 0,
  check_collected         numeric(10,2) default 0,
  other_collected         numeric(10,2) default 0,
  counted_cash            numeric(10,2),
  expected_cash           numeric(10,2),
  variance                numeric(10,2),
  petty_cash_transactions jsonb,
  rental_payment_links    text[],
  closing_notes           text,
  reconciled_by           text,
  reconciled_at           timestamptz,
  reconciled_notes        text,
  created_at              timestamptz default now()
);

-- =============================================================================
-- SECTION 9: DISCOUNTS & PROMOS
-- =============================================================================

create table if not exists promo_codes (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  code                text not null,
  description         text,
  discount_type       text check (discount_type in ('percent','flat')) default 'percent',
  discount_value      numeric(10,2) not null,
  active              boolean default true,
  usage_limit         integer,
  usage_count         integer default 0,
  expires_at          date,
  applies_to          text check (applies_to in ('all','category','item')) default 'all',
  applies_to_category text,
  created_at          timestamptz default now(),
  unique (tenant_id, code)
);

create table if not exists volume_discount_rules (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  name             text not null,
  category         text,
  equipment_id     uuid references equipment(id),
  equipment_name   text,
  minimum_quantity integer not null,
  discount_type    text check (discount_type in ('percent','flat')) default 'percent',
  discount_value   numeric(10,2) not null,
  active           boolean default true,
  created_at       timestamptz default now()
);

create table if not exists discount_logs (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  branch_id       uuid not null references branches(id),
  rental_id       uuid references rentals(id),
  invoice_number  text,
  customer_name   text,
  discount_type   text check (discount_type in ('promo_code','volume','loyalty','manual','duration')) not null,
  discount_label  text,
  discount_amount numeric(10,2) not null,
  original_amount numeric(10,2),
  applied_by      text,
  created_at      timestamptz default now()
);

-- =============================================================================
-- SECTION 10: RFQ
-- =============================================================================

create table if not exists rfq_records (
  id                        uuid primary key default gen_random_uuid(),
  tenant_id                 uuid not null references tenants(id) on delete cascade,
  branch_id                 uuid not null references branches(id),
  rfq_number                text,
  title                     text,
  issuing_org               text not null,
  org_type                  text check (org_type in ('municipal','county','state','federal','private','nonprofit','other')) default 'municipal',
  source                    text check (source in ('email','mail','web','phone','event_planner','other')) default 'email',
  received_date             date not null,
  due_date                  date,
  due_time                  text,
  submission_method         text check (submission_method in ('email','mail','portal','hand_delivery','fax')),
  submission_address        text,
  contact_name              text,
  contact_email             text,
  contact_phone             text,
  status                    text check (status in ('received','analyzing','draft','review','submitted','won','lost','no_bid')) default 'received',
  uploaded_file_url         text,
  uploaded_file_name        text,
  raw_rfq_text              text,
  extracted_requirements    jsonb,
  compliance_matrix         jsonb,
  proposed_line_items       jsonb,
  estimated_total_value     numeric(12,2),
  ai_analysis_summary       text,
  org_history_summary       text,
  suggested_response_format text,
  response_narrative        text,
  manual_response_mode      boolean default false,
  is_template               boolean default false,
  internal_notes            text,
  suggested_file_name       text,
  submitted_at              timestamptz,
  submitted_by              text,
  outcome                   text,
  awarded_value             numeric(12,2),
  linked_event_plan_id      uuid,
  created_at                timestamptz default now()
);

-- =============================================================================
-- SECTION 11: EVENT PLANNER
-- =============================================================================

create table if not exists event_plans (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  branch_id           uuid references branches(id),
  title               text not null,
  event_date          date not null,
  event_type          text check (event_type in ('birthday','quinceañera','wedding','corporate','municipal','festival','other')) default 'other',
  status              text check (status in ('draft','customer_review','planner_review','finalized','converted','cancelled')) default 'draft',
  owner_email         text,
  owner_role          text check (owner_role in ('staff','customer')) default 'staff',
  customer_name       text,
  customer_email      text,
  customer_phone      text,
  guest_count         integer,
  venue_type          text check (venue_type in ('dimensions','photo','address')) default 'dimensions',
  venue_name          text,
  venue_width_ft      numeric(8,2),
  venue_length_ft     numeric(8,2),
  venue_photo_url     text,
  venue_surface       text check (venue_surface in ('grass','asphalt','concrete','pavers','sand','mixed','unknown')) default 'unknown',
  canvas_items        jsonb,
  canvas_scale        numeric(8,2) default 10,
  quoted_total        numeric(10,2),
  rental_id           uuid references rentals(id),
  planner_notes       text,
  customer_notes      text,
  nudges_acknowledged text[],
  last_edited_by      text,
  last_edited_at      timestamptz,
  created_at          timestamptz default now()
);

-- =============================================================================
-- SECTION 12: TIMESHEETS & STAFF
-- =============================================================================

create table if not exists timesheets (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  branch_id      uuid not null references branches(id),
  profile_id     uuid references profiles(id),
  staff_name     text not null,
  staff_email    text,
  staff_type     text check (staff_type in ('full_time','part_time','temp','event')) default 'temp',
  job_reference  text,
  job_type       text check (job_type in ('delivery','event','shop','laundry','general')) default 'general',
  work_date      date not null,
  clock_in       text,
  clock_out      text,
  hours_worked   numeric(6,2),
  overtime_hours numeric(6,2) default 0,
  hourly_rate    numeric(10,2),
  regular_pay    numeric(10,2),
  overtime_pay   numeric(10,2),
  total_pay      numeric(10,2),
  status         text check (status in ('pending','approved','rejected','paid')) default 'pending',
  approved_by    text,
  approved_at    timestamptz,
  pay_period     text,
  notes          text,
  created_at     timestamptz default now()
);

create table if not exists staff_phones (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  email      text not null,
  phone      text not null,
  created_at timestamptz default now(),
  unique (tenant_id, email)
);

-- =============================================================================
-- SECTION 13: AUDIT, GPS, AGREEMENTS, REPORTS
-- =============================================================================

create table if not exists audit_logs (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  branch_id    uuid references branches(id),
  action       text not null,
  entity_name  text not null,
  entity_id    text,
  entity_label text,
  performed_by text not null,
  performed_at timestamptz default now(),
  changes      jsonb,
  ip_address   text,
  user_agent   text,
  reason       text
);

create index if not exists idx_audit_tenant       on audit_logs(tenant_id);
create index if not exists idx_audit_performed_at on audit_logs(performed_at desc);

create table if not exists gps_providers (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  branch_id             uuid references branches(id),
  name                  text not null,
  provider_type         text check (provider_type in ('samsara','fleettraks','fleettracks','calamp','verizon_connect','geotab','spireon','trackimo','bouncie','custom')) not null,
  api_key               text,
  api_secret            text,
  account_id            text,
  base_url              text,
  webhook_secret        text,
  geofence_radius_miles numeric(8,2) default 1,
  poll_interval_minutes integer default 30,
  is_active             boolean default true,
  last_tested_at        timestamptz,
  last_test_result      text check (last_test_result in ('ok','fail')),
  last_test_message     text,
  notes                 text,
  created_at            timestamptz default now()
);

create table if not exists equipment_gps_links (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references tenants(id) on delete cascade,
  equipment_id            uuid not null references equipment(id) on delete cascade,
  equipment_name          text,
  provider_id             uuid not null references gps_providers(id),
  provider_type           text,
  device_id               text not null,
  device_label            text,
  last_known_lat          numeric(11,8),
  last_known_lng          numeric(11,8),
  last_known_address      text,
  last_known_speed        numeric(8,2),
  ignition_on             boolean,
  battery_level           numeric(5,2),
  last_seen_at            timestamptz,
  geofence_breached       boolean default false,
  geofence_breached_at    timestamptz,
  speed_anomaly_detected  boolean default false,
  speed_anomaly_at        timestamptz,
  night_movement_detected boolean default false,
  night_movement_at       timestamptz,
  is_active               boolean default true,
  created_at              timestamptz default now()
);

create table if not exists driver_locations (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  branch_id      uuid references branches(id),
  driver_email   text not null,
  driver_name    text,
  latitude       numeric(11,8),
  longitude      numeric(11,8),
  accuracy       numeric(8,2),
  updated_at     timestamptz default now(),
  current_status text,
  unique (tenant_id, driver_email)
);

create table if not exists rental_agreements (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  branch_id        uuid not null references branches(id),
  agreement_type   text check (agreement_type in ('ARA_standard','bespoke','custom_url')) default 'ARA_standard',
  title            text default 'Equipment Rental Agreement',
  content          text,
  custom_pdf_url   text,
  pages            integer default 1,
  requires_initials boolean default true,
  is_active        boolean default true,
  last_updated_at  timestamptz,
  last_updated_by  text,
  created_at       timestamptz default now(),
  unique (tenant_id, branch_id)
);

create table if not exists availability_configs (
  id                               uuid primary key default gen_random_uuid(),
  tenant_id                        uuid not null references tenants(id) on delete cascade,
  branch_id                        uuid not null references branches(id),
  allow_overbooking_by_default     boolean default false,
  default_max_overbook_percent     numeric(5,2) default 0,
  require_approval_above_percent   numeric(5,2) default 5,
  default_buffer_days              integer default 0,
  enable_cross_branch_reservations boolean default true,
  notes                            text,
  created_at                       timestamptz default now(),
  unique (tenant_id, branch_id)
);

create table if not exists delivery_matrix (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references tenants(id) on delete cascade,
  branch_id               uuid not null references branches(id),
  labor_rate_per_man_hour numeric(10,2),
  truck_rate_per_hour     numeric(10,2),
  default_crew_size       integer default 2,
  default_trucks          integer default 1,
  minimum_charge          numeric(10,2),
  zones                   jsonb,
  notes                   text,
  created_at              timestamptz default now(),
  unique (tenant_id, branch_id)
);

create table if not exists reports (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  branch_id      uuid not null references branches(id),
  item_name      text not null,
  item_type      text not null,
  model          text,
  serial_number  text,
  asset_number   text,
  action         text check (action in ('Sell','Repair','Discard/Part out','Need Quote for Customer')) not null,
  asking_price   numeric(10,2),
  comments       text,
  meeting_note   text,
  reviewed_at    timestamptz,
  reviewed_by    text,
  send_to_emails text[],
  custom_email   text,
  sent_by        text,
  photo_paths    text[],
  is_sent        boolean default false,
  is_posted      boolean default false,
  is_deleted     boolean default false,
  sent_at        timestamptz,
  last_sent_at   timestamptz,
  last_edited_at timestamptz,
  viewed_at      timestamptz,
  viewed_by      text,
  activity_log   text[],
  created_at     timestamptz default now()
);

-- =============================================================================
-- SECTION 14: PLATFORM-LEVEL TABLES (AIR SaaS — not tenant data)
-- =============================================================================

create table if not exists waitlist_entries (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  email       text not null unique,
  phone       text,
  company     text,
  branches    text,
  status      text check (status in ('pending','approved','rejected')) default 'pending',
  approved_by text,
  approved_at timestamptz,
  notes       text,
  created_at  timestamptz default now()
);

create table if not exists subscriber_trials (
  id                     uuid primary key default gen_random_uuid(),
  email                  text not null unique,
  company_name           text,
  contact_name           text,
  phone                  text,
  branches               text,
  status                 text check (status in ('invited','trial','core','active','suspended','cancelled')) default 'invited',
  plan_tier              text check (plan_tier in ('core','pro','custom')) default 'pro',
  trial_start_date       date,
  trial_ends_at          date,
  lockout_date           date,
  reminder_day12_sent    boolean default false,
  reminder_day14_sent    boolean default false,
  lockout_notice_sent    boolean default false,
  approved_by            text,
  approved_at            timestamptz,
  tenant_id              uuid references tenants(id),
  stripe_customer_id     text,
  stripe_subscription_id text,
  notes                  text,
  created_at             timestamptz default now()
);

-- =============================================================================
-- SECTION 15: ROW LEVEL SECURITY
-- Uses DROP POLICY IF EXISTS before each CREATE POLICY so re-runs don't fail
-- =============================================================================

alter table branches enable row level security;
alter table profiles enable row level security;
alter table company_settings enable row level security;
alter table payment_settings enable row level security;
alter table equipment_categories enable row level security;
alter table equipment enable row level security;
alter table customers enable row level security;
alter table rentals enable row level security;
alter table recurring_rentals enable row level security;
alter table rto_payments enable row level security;
alter table deliveries enable row level security;
alter table recoveries enable row level security;
alter table maintenance_logs enable row level security;
alter table work_orders enable row level security;
alter table part_requirements enable row level security;
alter table parts_procurement enable row level security;
alter table mechanic_profiles enable row level security;
alter table predictive_alerts enable row level security;
alter table expenses enable row level security;
alter table vendors enable row level security;
alter table supply_items enable row level security;
alter table purchase_orders enable row level security;
alter table cash_drawers enable row level security;
alter table promo_codes enable row level security;
alter table volume_discount_rules enable row level security;
alter table discount_logs enable row level security;
alter table rfq_records enable row level security;
alter table event_plans enable row level security;
alter table timesheets enable row level security;
alter table staff_phones enable row level security;
alter table audit_logs enable row level security;
alter table gps_providers enable row level security;
alter table equipment_gps_links enable row level security;
alter table driver_locations enable row level security;
alter table rental_agreements enable row level security;
alter table availability_configs enable row level security;
alter table delivery_matrix enable row level security;
alter table reports enable row level security;
alter table waitlist_entries enable row level security;
alter table subscriber_trials enable row level security;
alter table tenants enable row level security;

-- Drop existing policies before recreating (idempotent)
do $$ declare tbl text; begin
  foreach tbl in array array[
    'branches','profiles','company_settings','payment_settings',
    'equipment_categories','equipment','customers','rentals',
    'recurring_rentals','rto_payments','deliveries','recoveries',
    'maintenance_logs','work_orders','part_requirements','parts_procurement',
    'mechanic_profiles','predictive_alerts','expenses','vendors',
    'supply_items','purchase_orders','cash_drawers','promo_codes',
    'volume_discount_rules','discount_logs','rfq_records','event_plans',
    'timesheets','staff_phones','audit_logs','gps_providers',
    'equipment_gps_links','driver_locations','rental_agreements',
    'availability_configs','delivery_matrix','reports'
  ] loop
    execute format('drop policy if exists "tenant_isolation" on %I', tbl);
  end loop;
end $$;

drop policy if exists "service_role_only" on waitlist_entries;
drop policy if exists "service_role_only" on subscriber_trials;
drop policy if exists "service_role_only" on tenants;

-- Tenant isolation policies
create policy "tenant_isolation" on branches             for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on profiles             for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on company_settings     for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on payment_settings     for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on equipment_categories for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on equipment            for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on customers            for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on rentals              for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on recurring_rentals    for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on rto_payments         for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on deliveries           for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on recoveries           for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on maintenance_logs     for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on work_orders          for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on part_requirements    for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on parts_procurement    for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on mechanic_profiles    for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on predictive_alerts    for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on expenses             for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on vendors              for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on supply_items         for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on purchase_orders      for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on cash_drawers         for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on promo_codes          for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on volume_discount_rules for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on discount_logs        for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on rfq_records          for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on event_plans          for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on timesheets           for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on staff_phones         for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on audit_logs           for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on gps_providers        for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on equipment_gps_links  for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on driver_locations     for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on rental_agreements    for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on availability_configs for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on delivery_matrix      for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
create policy "tenant_isolation" on reports              for all using (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Platform tables: service role only
create policy "service_role_only" on waitlist_entries  for all using (auth.role() = 'service_role');
create policy "service_role_only" on subscriber_trials for all using (auth.role() = 'service_role');
create policy "service_role_only" on tenants           for all using (auth.role() = 'service_role');

-- =============================================================================
-- SECTION 16: CUSTOM JWT CLAIMS HOOK
-- Register in: Supabase Dashboard → Auth → Hooks → Customize Access Token
-- =============================================================================

create or replace function public.custom_access_token(event jsonb)
returns jsonb language plpgsql stable security definer as $$
declare
  profile_row profiles%rowtype;
begin
  select * into profile_row
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  if profile_row.id is null then
    return event;  -- No profile yet (first login), return unmodified
  end if;

  return event || jsonb_build_object(
    'tenant_id',         profile_row.tenant_id,
    'home_branch_id',    profile_row.home_branch_id,
    'current_branch_id', profile_row.current_branch_id,
    'user_role',         profile_row.role
  );
end;
$$;

-- =============================================================================
-- SECTION 17: HELPER — intentionally empty auto-create hook
-- Profiles are created by provisionTenant backend function, not auto-trigger.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  return new;
end;
$$;

-- =============================================================================
-- END OF SCHEMA — Safe to re-run at any time.
-- =============================================================================
-- NEXT STEPS:
-- 1. Supabase Dashboard → Auth → Hooks → Add "Customize Access Token" hook
--    pointing to: public.custom_access_token
-- 2. Update provisionTenant function to INSERT: tenants → branches → profiles
-- 3. Replace base44.entities.X calls with supabase.from('x') in React pages
-- 4. Test at /supabase-test
-- =============================================================================