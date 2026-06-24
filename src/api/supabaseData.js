import { supabase } from './supabaseClient';

const TABLE_MAPPINGS = {
  AuditLog: 'audit_logs',
  AvailabilityConfig: 'availability_configs',
  Branch: 'branches',
  BranchSettings: 'branch_settings',
  CashDrawer: 'cash_drawers',
  CompanySettings: 'company_settings',
  Customer: 'customers',
  Delivery: 'deliveries',
  DeliveryMatrix: 'delivery_matrix',
  DiscountLog: 'discount_logs',
  DriverLocation: 'driver_locations',
  Equipment: 'equipment',
  EquipmentCategory: 'equipment_categories',
  EquipmentGPSLink: 'equipment_gps_links',
  EventPlan: 'event_plans',
  Expense: 'expenses',
  GPSProvider: 'gps_providers',
  MaintenanceLog: 'maintenance_logs',
  MechanicProfile: 'mechanic_profiles',
  PartRequirement: 'part_requirements',
  PartsProcurement: 'parts_procurement',
  PaymentSettings: 'payment_settings',
  PlatformFeature: 'platform_features',
  PredictiveAlert: 'predictive_alerts',
  PromoCode: 'promo_codes',
  PullRequest: 'pull_requests',
  PurchaseOrder: 'purchase_orders',
  Recovery: 'recoveries',
  RecurringRental: 'recurring_rentals',
  Rental: 'rentals',
  RentalAgreement: 'rental_agreements',
  RentalItem: 'rental_items',
  Report: 'reports',
  RFQRecord: 'rfq_records',
  Role: 'roles',
  RtoPayment: 'rto_payments',
  StaffPhone: 'staff_phones',
  SupplyItem: 'supply_items',
  TentSpecs: 'tent_specs',
  Timesheet: 'timesheets',
  User: 'profiles',
  UserRole: 'user_roles',
  UserRoster: 'user_roster',
  Vendor: 'vendors',
  VolumeDiscountRule: 'volume_discount_rules',
  WorkOrder: 'work_orders',
};

const OPTIONAL_TABLES = new Set([
  'availability_configs',
  'delivery_matrix',
  'driver_locations',
  'equipment_gps_links',
  'platform_features',
  'pull_requests',
  'rental_items',
  'roles',
  'tent_specs',
  'user_roles',
  'user_roster',
]);

const KNOWN_MISSING_TABLE_CODES = new Set(['42P01', 'PGRST205']);
const KNOWN_MISSING_COLUMN_CODES = new Set(['42703', 'PGRST204']);
const DEFAULT_BUCKET = 'uploads';

const FIELD_ALIASES = {
  created_date: 'created_at',
  createdDate: 'created_at',
  updated_date: 'updated_at',
  updatedDate: 'updated_at',
};

const DB_TO_LEGACY_FIELD_ALIASES = {
  created_at: 'created_date',
  updated_at: 'updated_date',
};

const camelToSnake = (value) =>
  String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();

const normalizeFieldName = (value) => {
  const raw = String(value);
  const snake = camelToSnake(raw);
  return FIELD_ALIASES[raw] || FIELD_ALIASES[snake] || snake;
};

const snakeToCamel = (value) =>
  String(value).replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

const resolveTableName = (entityName) => TABLE_MAPPINGS[entityName] || camelToSnake(entityName);

function normalizeSortField(sortField) {
  if (!sortField || typeof sortField !== 'string') return null;
  const descending = sortField.startsWith('-');
  const rawField = descending ? sortField.slice(1) : sortField;
  if (!rawField) return null;
  return { field: normalizeFieldName(rawField), ascending: !descending };
}

function toDbValue(value) {
  if (Array.isArray(value)) return value.map(toDbValue);
  if (value && typeof value === 'object' && !(value instanceof File) && !(value instanceof Blob)) {
    return toDbRow(value);
  }
  return value;
}

function toDbRow(row = {}) {
  return Object.fromEntries(
    Object.entries(row)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [normalizeFieldName(key), toDbValue(value)])
  );
}

function fromDbValue(value) {
  if (Array.isArray(value)) return value.map(fromDbValue);
  if (value && typeof value === 'object') return fromDbRow(value);
  return value;
}

function fromDbRow(row) {
  if (!row || typeof row !== 'object') return row;

  const converted = {};
  for (const [key, value] of Object.entries(row)) {
    const convertedValue = fromDbValue(value);
    converted[key] = convertedValue;
    converted[snakeToCamel(key)] = convertedValue;

    const legacyKey = DB_TO_LEGACY_FIELD_ALIASES[key];
    if (legacyKey) converted[legacyKey] = convertedValue;
  }
  return converted;
}

function fromDbRows(rows) {
  return Array.isArray(rows) ? rows.map(fromDbRow) : [];
}

function isMissingTableError(error) {
  return error && KNOWN_MISSING_TABLE_CODES.has(error.code);
}

function isMissingColumnError(error) {
  return error && KNOWN_MISSING_COLUMN_CODES.has(error.code);
}

function warn(entityName, method, message, error) {
  const suffix = error?.message ? `: ${error.message}` : '';
  console.warn(`[supabaseData.${entityName}.${method}] ${message}${suffix}`);
}

async function safeSelect(entityName, tableName, buildQuery, fallback = []) {
  try {
    const { data, error } = await buildQuery(supabase.from(tableName));
    if (error) throw error;
    return fromDbRows(data);
  } catch (error) {
    if (isMissingTableError(error) || OPTIONAL_TABLES.has(tableName)) {
      warn(entityName, 'select', `Table ${tableName} is not available yet; returning an empty list`, error);
      return fallback;
    }
    if (isMissingColumnError(error)) {
      warn(entityName, 'select', 'A requested sort/filter column is missing; retrying without sort/filter', error);
      try {
        const { data, error: retryError } = await supabase.from(tableName).select('*');
        if (retryError) throw retryError;
        return fromDbRows(data);
      } catch (retryError) {
        warn(entityName, 'select', 'Retry failed; returning an empty list', retryError);
        return fallback;
      }
    }
    warn(entityName, 'select', 'Query failed; returning an empty list', error);
    return fallback;
  }
}

async function safeMutation(entityName, method, tableName, runMutation, fallback = null) {
  try {
    const { data, error } = await runMutation(supabase.from(tableName));
    if (error) throw error;
    return Array.isArray(data) ? fromDbRows(data) : fromDbRow(data);
  } catch (error) {
    if (isMissingTableError(error) || OPTIONAL_TABLES.has(tableName)) {
      warn(entityName, method, `Table ${tableName} is not available yet; skipping mutation`, error);
      return fallback;
    }
    warn(entityName, method, 'Mutation failed', error);
    return fallback;
  }
}

function createEntityAccessor(entityName) {
  const tableName = resolveTableName(entityName);

  return {
    list: async (sortField = '-created_at', limit = 1000, offset = 0) => {
      const sort = normalizeSortField(sortField);
      const maxRows = Number.isFinite(Number(limit)) ? Number(limit) : 1000;
      const start = Number.isFinite(Number(offset)) ? Number(offset) : 0;

      return safeSelect(entityName, tableName, (table) => {
        let query = table.select('*');
        if (sort) query = query.order(sort.field, { ascending: sort.ascending });
        if (maxRows > 0) query = query.range(start, start + maxRows - 1);
        return query;
      });
    },

    filter: async (filters = {}, sortField = '-created_at', limit = 1000, offset = 0) => {
      const sort = normalizeSortField(sortField);
      const maxRows = Number.isFinite(Number(limit)) ? Number(limit) : 1000;
      const start = Number.isFinite(Number(offset)) ? Number(offset) : 0;

      return safeSelect(entityName, tableName, (table) => {
        let query = table.select('*');
        for (const [key, value] of Object.entries(filters || {})) {
          if (value === undefined || value === null) continue;
          const dbKey = normalizeFieldName(key);
          if (Array.isArray(value)) query = query.in(dbKey, value);
          else query = query.eq(dbKey, value);
        }
        if (sort) query = query.order(sort.field, { ascending: sort.ascending });
        if (maxRows > 0) query = query.range(start, start + maxRows - 1);
        return query;
      });
    },

    get: async (id) => {
      const rows = await safeSelect(entityName, tableName, (table) =>
        table.select('*').eq('id', id).limit(1)
      );
      return rows[0] || null;
    },

    create: async (row) => {
      const payload = toDbRow(row);
      return safeMutation(entityName, 'create', tableName, (table) =>
        table.insert(payload).select().single()
      );
    },

    bulkCreate: async (rows = []) => {
      if (!Array.isArray(rows) || rows.length === 0) return [];
      const payload = rows.map(toDbRow);
      return safeMutation(entityName, 'bulkCreate', tableName, (table) =>
        table.insert(payload).select()
      , []);
    },

    update: async (id, patch) => {
      const payload = toDbRow(patch);
      return safeMutation(entityName, 'update', tableName, (table) =>
        table.update(payload).eq('id', id).select().single()
      );
    },

    delete: async (id) => {
      const result = await safeMutation(entityName, 'delete', tableName, (table) =>
        table.delete().eq('id', id).select('id')
      , []);
      return Array.isArray(result);
    },

    subscribe: (_callback) => {
      warn(entityName, 'subscribe', 'Realtime subscriptions are disabled in the compatibility shim');
      return () => {};
    },

    invite: async () => null,
  };
}

const entityCache = new Map();
function getEntity(entityName) {
  const key = String(entityName);
  if (!entityCache.has(key)) entityCache.set(key, createEntityAccessor(key));
  return entityCache.get(key);
}

export const auth = {
  me: async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) throw error;
    if (!user) return null;

    const baseUser = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
      fullName: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
      role: user.user_metadata?.role || user.app_metadata?.role || 'user',
      raw: user,
    };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError && !isMissingTableError(profileError)) {
      warn('auth', 'me', 'Profile lookup failed; using auth user only', profileError);
      return baseUser;
    }

    return {
      ...baseUser,
      ...(profile ? fromDbRow(profile) : {}),
      id: user.id,
      email: user.email,
      raw: user,
    };
  },

  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  isAuthenticated: async () => {
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session);
  },

  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  logout: async (redirectUrl = '/signin') => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') window.location.href = redirectUrl;
  },

  redirectToLogin: (nextUrl) => {
    if (typeof window === 'undefined') return;
    const next = nextUrl || `${window.location.pathname}${window.location.search}`;
    window.location.href = `/signin?next=${encodeURIComponent(next)}`;
  },

  updateMe: async (data) => {
    const { data: result, error } = await supabase.auth.updateUser({ data });
    if (error) throw error;
    return result;
  },
};

export async function uploadFile(file, bucket = DEFAULT_BUCKET) {
  if (!file) throw new Error('No file provided');

  const extension = file.name?.includes('.') ? file.name.split('.').pop() : 'bin';
  const safeName = file.name?.replace(/[^a-zA-Z0-9._-]/g, '-') || `upload.${extension}`;
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return {
    file_url: publicUrlData.publicUrl,
    publicUrl: publicUrlData.publicUrl,
    path: data.path,
    bucket,
  };
}

const rootMethods = {
  auth,
  uploadFile,
  list: (entityName, ...args) => getEntity(entityName).list(...args),
  filter: (entityName, ...args) => getEntity(entityName).filter(...args),
  get: (entityName, ...args) => getEntity(entityName).get(...args),
  create: (entityName, ...args) => getEntity(entityName).create(...args),
  bulkCreate: (entityName, ...args) => getEntity(entityName).bulkCreate(...args),
  update: (entityName, ...args) => getEntity(entityName).update(...args),
  delete: (entityName, ...args) => getEntity(entityName).delete(...args),
  subscribe: (entityName, ...args) => getEntity(entityName).subscribe(...args),
};

export const supabaseData = new Proxy(rootMethods, {
  get(target, property) {
    if (property in target) return target[property];
    if (typeof property === 'symbol') return target[property];
    return getEntity(property);
  },
});

export default supabaseData;
