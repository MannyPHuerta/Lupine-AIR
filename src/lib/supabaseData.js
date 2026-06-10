import { supabase } from '@/api/supabaseClient';

/**
 * Supabase Data Helper
 * Provides a Base44-like interface for querying Supabase tables
 * Usage: supabaseData.Rental.list(), supabaseData.Equipment.filter(), etc.
 */

const TABLE_MAPPINGS = {
  Rental: 'rentals',
  WorkOrder: 'work_orders',
  Equipment: 'equipment',
  Customer: 'customers',
  Delivery: 'deliveries',
  Recovery: 'recoveries',
  MaintenanceLog: 'maintenance_logs',
  PartRequirement: 'part_requirements',
  PartsProcurement: 'parts_procurement',
  RecurringRental: 'recurring_rentals',
  RtoPayment: 'rto_payments',
  Expense: 'expenses',
  Timesheet: 'timesheets',
  DriverLocation: 'driver_locations',
  GPSProvider: 'gps_providers',
  EquipmentGPSLink: 'equipment_gps_links',
  MechanicProfile: 'mechanic_profiles',
  PredictiveAlert: 'predictive_alerts',
  EventPlan: 'event_plans',
  RFQRecord: 'rfq_records',
  VolumeDiscountRule: 'volume_discount_rules',
  PromoCode: 'promo_codes',
  DiscountLog: 'discount_logs',
  DeliveryMatrix: 'delivery_matrix',
  AuditLog: 'audit_logs',
  Report: 'reports',
  Role: 'roles',
  PlatformFeature: 'platform_features',
  PaymentSettings: 'payment_settings',
  StaffPhone: 'staff_phones',
  CustomEmail: 'custom_emails',
  UserRoster: 'user_roster',
  CompanySettings: 'company_settings',
  BranchSettings: 'branch_settings',
  AvailabilityConfig: 'availability_config',
  RentalAgreement: 'rental_agreements',
  EquipmentCategory: 'equipment_categories',
  InventoryItem: 'inventory_items',
  User: 'users',
  CproContact: 'cpro_contacts',
  SupplyItem: 'supply_items',
  Vendor: 'vendors',
  PurchaseOrder: 'purchase_orders',
  CashDrawer: 'cash_drawers',
  LaundryReport: 'laundry_reports',
  DriverReport: 'driver_reports',
};

function createEntityAccessor(entityName) {
  const tableName = TABLE_MAPPINGS[entityName];
  
  if (!tableName) {
    console.warn(`[supabaseData] No table mapping for entity: ${entityName}`);
    return {
      list: async () => [],
      filter: async () => [],
      get: async () => null,
      create: async () => null,
      update: async () => null,
      delete: async () => null,
    };
  }

  return {
    /**
     * List all records with optional sort and limit
     * @param {string} sortField - Field to sort by (prefix with '-' for descending)
     * @param {number} limit - Maximum number of records
     */
    list: async (sortField = '-created_at', limit = 1000) => {
      try {
        if (!supabase) {
          console.warn(`[supabaseData.${entityName}] Supabase client not initialized`);
          return [];
        }
        const descending = sortField.startsWith('-');
        const field = descending ? sortField.slice(1) : sortField;
        
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .order(field, { ascending: !descending })
          .limit(limit);
        
        if (error) {
          if (error.code === '42P01') {
            console.warn(`[supabaseData.${entityName}] Table ${tableName} does not exist yet`);
            return [];
          }
          throw error;
        }
        return data || [];
      } catch (error) {
        console.error(`[supabaseData.${entityName}.list] Error:`, error.message);
        return [];
      }
    },

    /**
     * Filter records by criteria
     * @param {object} filters - Key-value pairs for filtering
     * @param {string} sortField - Field to sort by
     * @param {number} limit - Maximum number of records
     */
    filter: async (filters = {}, sortField = '-created_at', limit = 1000) => {
      try {
        if (!supabase) {
          console.warn(`[supabaseData.${entityName}] Supabase client not initialized`);
          return [];
        }
        const descending = sortField.startsWith('-');
        const field = descending ? sortField.slice(1) : sortField;
        
        let query = supabase.from(tableName).select('*');
        
        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            query = query.eq(key, value);
          }
        });
        
        const { data, error } = await query
          .order(field, { ascending: !descending })
          .limit(limit);
        
        if (error) {
          if (error.code === '42P01') {
            console.warn(`[supabaseData.${entityName}] Table ${tableName} does not exist yet`);
            return [];
          }
          throw error;
        }
        return data || [];
      } catch (error) {
        console.error(`[supabaseData.${entityName}.filter] Error:`, error.message);
        return [];
      }
    },

    /**
     * Get a single record by ID
     */
    get: async (id) => {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        return data;
      } catch (error) {
        console.error(`[supabaseData.${entityName}.get] Error:`, error);
        return null;
      }
    },

    /**
     * Create a new record
     */
    create: async (data) => {
      try {
        const { data: result, error } = await supabase
          .from(tableName)
          .insert(data)
          .select()
          .single();
        
        if (error) throw error;
        return result;
      } catch (error) {
        console.error(`[supabaseData.${entityName}.create] Error:`, error);
        return null;
      }
    },

    /**
     * Update an existing record
     */
    update: async (id, data) => {
      try {
        const { data: result, error } = await supabase
          .from(tableName)
          .update(data)
          .eq('id', id)
          .select()
          .single();
        
        if (error) throw error;
        return result;
      } catch (error) {
        console.error(`[supabaseData.${entityName}.update] Error:`, error);
        return null;
      }
    },

    /**
     * Delete a record
     */
    delete: async (id) => {
      try {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        return true;
      } catch (error) {
        console.error(`[supabaseData.${entityName}.delete] Error:`, error);
        return false;
      }
    },
  };
}

// Create accessors for all entities
const supabaseData = {};
Object.keys(TABLE_MAPPINGS).forEach(entityName => {
  supabaseData[entityName] = createEntityAccessor(entityName);
});

export { supabaseData };