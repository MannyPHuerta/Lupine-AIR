/**
 * Supabase-backed compatibility shim.
 *
 * Exposes the same API surface as the old Base44 SDK so existing page/component
 * code continues to work without modification:
 *
 *   base44.entities.Equipment.list()
 *   base44.entities.Equipment.filter({ status: 'available' })
 *   base44.entities.Equipment.create(data)
 *   base44.entities.Equipment.update(id, data)
 *   base44.entities.Equipment.delete(id)
 *   base44.entities.Equipment.get(id)
 *   base44.auth.me()
 *   base44.auth.isAuthenticated()
 *   base44.auth.logout()
 *   base44.auth.redirectToLogin(next)
 *   base44.auth.updateMe(data)
 *   base44.functions.invoke(name, payload)  — calls Supabase Edge Functions
 */

import { supabase } from '@/api/supabaseClient';

// Map Base44 entity names (PascalCase) → Supabase table names (snake_case)
const TABLE_MAP = {
  Equipment: 'equipment',
  Rental: 'rentals',
  Customer: 'customers',
  Delivery: 'deliveries',
  WorkOrder: 'work_orders',
  MaintenanceLog: 'maintenance_logs',
  Recovery: 'recoveries',
  Expense: 'expenses',
  RecurringRental: 'recurring_rentals',
  RtoPayment: 'rto_payments',
  Timesheet: 'timesheets',
  DriverLocation: 'driver_locations',
  GPSProvider: 'gps_providers',
  EquipmentGPSLink: 'equipment_gps_links',
  MechanicProfile: 'mechanic_profiles',
  PartRequirement: 'part_requirements',
  PartsProcurement: 'parts_procurement',
  PredictiveAlert: 'predictive_alerts',
  EventPlan: 'event_plans',
  DeliveryMatrix: 'delivery_matrix',
  VolumeDiscountRule: 'volume_discount_rules',
  PromoCode: 'promo_codes',
  DiscountLog: 'discount_logs',
  AuditLog: 'audit_logs',
  Report: 'reports',
  RFQRecord: 'rfq_records',
  PaymentSettings: 'payment_settings',
  CustomEmail: 'custom_emails',
  StaffPhone: 'staff_phones',
  UserRoster: 'user_roster',
  Role: 'roles',
  PlatformFeature: 'platform_features',
  CproContact: 'cpro_contacts',
  PullRequest: 'pull_requests',
  CompanySettings: 'company_settings',
  BranchSettings: 'branch_settings',
  AvailabilityConfig: 'availability_config',
  RentalAgreement: 'rental_agreements',
  EquipmentCategory: 'equipment_categories',
  InventoryItem: 'inventory_items',
  Tenant: 'tenants',
  CashDrawer: 'cash_drawers',
  SupplyItem: 'supply_items',
  PurchaseOrder: 'purchase_orders',
  Vendor: 'vendors',
  User: 'profiles',
};

// Convert Base44 filter object to Supabase query
function applyFilters(query, filters) {
  if (!filters) return query;
  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined) {
      query = query.is(key, null);
    } else if (Array.isArray(value)) {
      query = query.in(key, value);
    } else if (typeof value === 'object' && value.$gte !== undefined) {
      query = query.gte(key, value.$gte);
    } else if (typeof value === 'object' && value.$lte !== undefined) {
      query = query.lte(key, value.$lte);
    } else if (typeof value === 'object' && value.$gt !== undefined) {
      query = query.gt(key, value.$gt);
    } else if (typeof value === 'object' && value.$lt !== undefined) {
      query = query.lt(key, value.$lt);
    } else {
      query = query.eq(key, value);
    }
  }
  return query;
}

// Parse Base44-style sort string ('-created_date' → { column: 'created_at', ascending: false })
function parseSort(sortStr) {
  if (!sortStr) return { column: 'created_at', ascending: false };
  const ascending = !sortStr.startsWith('-');
  const raw = sortStr.replace(/^-/, '');
  // Map common Base44 field names to Supabase column names
  const col = raw === 'created_date' ? 'created_at'
    : raw === 'updated_date' ? 'updated_at'
    : raw;
  return { column: col, ascending };
}

function makeEntityProxy(entityName) {
  const table = TABLE_MAP[entityName];
  if (!table) {
    console.warn(`[base44Client] No table mapping for entity: ${entityName}`);
  }

  return {
    async list(sort, limit) {
      const { column, ascending } = parseSort(sort);
      let q = supabase.from(table).select('*').order(column, { ascending });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },

    async filter(filters, sort, limit) {
      const { column, ascending } = parseSort(sort);
      let q = supabase.from(table).select('*').order(column, { ascending });
      q = applyFilters(q, filters);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },

    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },

    async create(payload) {
      const { data, error } = await supabase.from(table).insert(payload).select().single();
      if (error) throw error;
      return data;
    },

    async bulkCreate(payloads) {
      const { data, error } = await supabase.from(table).insert(payloads).select();
      if (error) throw error;
      return data;
    },

    async update(id, payload) {
      const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return true;
    },

    // Real-time subscription — maps to Supabase realtime
    subscribe(callback) {
      const channel = supabase
        .channel(`${table}_changes`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          const typeMap = { INSERT: 'create', UPDATE: 'update', DELETE: 'delete' };
          callback({
            type: typeMap[payload.eventType] || payload.eventType,
            id: payload.new?.id || payload.old?.id,
            data: payload.new || null,
            old_data: payload.old || null,
          });
        })
        .subscribe();

      return () => supabase.removeChannel(channel);
    },

    schema() { return {}; },
  };
}

// Auth adapter
const auth = {
  async me() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    return {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email,
      role: user.user_metadata?.role || 'user',
    };
  },

  async isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },

  async updateMe(data) {
    const { error } = await supabase.auth.updateUser({ data });
    if (error) throw error;
  },

  async logout(redirectUrl) {
    await supabase.auth.signOut();
    window.location.replace(redirectUrl || '/signin');
  },

  redirectToLogin(nextUrl) {
    const next = nextUrl || window.location.pathname + window.location.search;
    window.location.replace(`/signin?next=${encodeURIComponent(next)}`);
  },
};

// Functions adapter — calls Supabase Edge Functions
const functions = {
  async invoke(name, payload) {
    const { data, error } = await supabase.functions.invoke(name, { body: payload });
    if (error) throw error;
    // Return axios-style response so existing code works
    return { data };
  },
};

// Integrations stub — only InvokeLLM is wired, others log a warning
const integrations = {
  Core: {
    async InvokeLLM({ prompt, response_json_schema, add_context_from_internet }) {
      // Direct OpenAI call — requires VITE_OPENAI_API_KEY
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!apiKey) throw new Error('VITE_OPENAI_API_KEY not set');
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: response_json_schema ? { type: 'json_object' } : undefined,
        }),
      });
      const json = await res.json();
      const content = json.choices?.[0]?.message?.content || '';
      try { return JSON.parse(content); } catch { return content; }
    },

    async SendEmail(params) {
      console.warn('[base44Client] SendEmail — use Resend directly or via Edge Function', params);
    },

    async UploadFile({ file }) {
      const path = `uploads/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage.from('assets').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(path);
      return { file_url: publicUrl };
    },
  },
};

// Users adapter
const users = {
  async inviteUser(email, role = 'user') {
    const { data, error } = await supabase.functions.invoke('inviteUser', { body: { email, role } });
    if (error) throw error;
    return data;
  },
};

// Build the entities proxy (creates entity adapters on demand)
const entitiesProxy = new Proxy({}, {
  get(_, entityName) {
    return makeEntityProxy(entityName);
  }
});

export const base44 = {
  entities: entitiesProxy,
  auth,
  functions,
  integrations,
  users,
};