/**
 * Role-Based Access Control (RBAC) utilities for Phase 2 security architecture
 */

// Core permission codes
export const PERMISSIONS = {
  // Equipment
  EQUIPMENT_READ: 'equipment.read',
  EQUIPMENT_CREATE: 'equipment.create',
  EQUIPMENT_UPDATE: 'equipment.update',
  EQUIPMENT_DELETE: 'equipment.delete',

  // Rentals
  RENTAL_READ: 'rental.read',
  RENTAL_CREATE: 'rental.create',
  RENTAL_UPDATE: 'rental.update',
  RENTAL_DELETE: 'rental.delete',

  // Customers
  CUSTOMER_READ: 'customer.read',
  CUSTOMER_CREATE: 'customer.create',
  CUSTOMER_UPDATE: 'customer.update',
  CUSTOMER_DELETE: 'customer.delete',
  CUSTOMER_BLACKLIST: 'customer.blacklist',

  // Financial
  DISCOUNT_APPLY: 'discount.apply',
  DISCOUNT_OVERRIDE: 'discount.override',
  PAYMENT_PROCESS: 'payment.process',
  REPORT_FINANCIAL: 'report.financial',

  // Maintenance
  MAINTENANCE_LOG: 'maintenance.log',
  MAINTENANCE_SCHEDULE: 'maintenance.schedule',

  // Reports
  REPORT_READ: 'report.read',
  REPORT_CREATE: 'report.create',
  REPORT_EXPORT: 'report.export',

  // Accounting
  ACCOUNTING_VIEW: 'accounting.view',
  ACCOUNTING_MANAGE: 'accounting.manage',
  EXPENSE_CREATE: 'expense.create',
  EXPENSE_DELETE: 'expense.delete',
  INVOICE_VOID: 'invoice.void',

  // Admin
  USER_MANAGE: 'user.manage',
  ROLE_MANAGE: 'role.manage',
  SETTINGS_MANAGE: 'settings.manage',
  AUDIT_VIEW: 'audit.view',
};

// Built-in role definitions (seeded on first app load)
export const BUILT_IN_ROLES = {
  PLATFORM_ADMIN: {
    name: 'Platform Admin',
    description: 'Full platform access across all subscribers',
    level: 100,
    scope: 'platform',
    permissions: Object.values(PERMISSIONS),
    isBuiltIn: true,
  },
  SUBSCRIBER_ADMIN: {
    name: 'Subscriber Admin',
    description: 'Full access within their subscriber account',
    level: 80,
    scope: 'subscriber',
    permissions: [
      PERMISSIONS.EQUIPMENT_READ,
      PERMISSIONS.EQUIPMENT_CREATE,
      PERMISSIONS.EQUIPMENT_UPDATE,
      PERMISSIONS.EQUIPMENT_DELETE,
      PERMISSIONS.RENTAL_READ,
      PERMISSIONS.RENTAL_CREATE,
      PERMISSIONS.RENTAL_UPDATE,
      PERMISSIONS.RENTAL_DELETE,
      PERMISSIONS.CUSTOMER_READ,
      PERMISSIONS.CUSTOMER_CREATE,
      PERMISSIONS.CUSTOMER_UPDATE,
      PERMISSIONS.CUSTOMER_DELETE,
      PERMISSIONS.CUSTOMER_BLACKLIST,
      PERMISSIONS.DISCOUNT_APPLY,
      PERMISSIONS.DISCOUNT_OVERRIDE,
      PERMISSIONS.PAYMENT_PROCESS,
      PERMISSIONS.REPORT_FINANCIAL,
      PERMISSIONS.MAINTENANCE_LOG,
      PERMISSIONS.MAINTENANCE_SCHEDULE,
      PERMISSIONS.REPORT_READ,
      PERMISSIONS.REPORT_CREATE,
      PERMISSIONS.REPORT_EXPORT,
      PERMISSIONS.USER_MANAGE,
      PERMISSIONS.SETTINGS_MANAGE,
      PERMISSIONS.AUDIT_VIEW,
    ],
    isBuiltIn: true,
  },
  BRANCH_MANAGER: {
    name: 'Branch Manager',
    description: 'Full access within their branch',
    level: 60,
    scope: 'branch',
    permissions: [
      PERMISSIONS.EQUIPMENT_READ,
      PERMISSIONS.EQUIPMENT_UPDATE,
      PERMISSIONS.RENTAL_READ,
      PERMISSIONS.RENTAL_CREATE,
      PERMISSIONS.RENTAL_UPDATE,
      PERMISSIONS.CUSTOMER_READ,
      PERMISSIONS.CUSTOMER_CREATE,
      PERMISSIONS.CUSTOMER_UPDATE,
      PERMISSIONS.DISCOUNT_APPLY,
      PERMISSIONS.DISCOUNT_OVERRIDE,
      PERMISSIONS.PAYMENT_PROCESS,
      PERMISSIONS.MAINTENANCE_LOG,
      PERMISSIONS.REPORT_READ,
      PERMISSIONS.REPORT_CREATE,
      PERMISSIONS.AUDIT_VIEW,
    ],
    isBuiltIn: true,
  },
  COUNTER_STAFF: {
    name: 'Counter Staff',
    description: 'Create and manage rentals; apply standard discounts',
    level: 40,
    scope: 'branch',
    permissions: [
      PERMISSIONS.EQUIPMENT_READ,
      PERMISSIONS.RENTAL_READ,
      PERMISSIONS.RENTAL_CREATE,
      PERMISSIONS.RENTAL_UPDATE,
      PERMISSIONS.CUSTOMER_READ,
      PERMISSIONS.CUSTOMER_CREATE,
      PERMISSIONS.CUSTOMER_UPDATE,
      PERMISSIONS.DISCOUNT_APPLY,
      PERMISSIONS.PAYMENT_PROCESS,
    ],
    isBuiltIn: true,
  },
  SHOP_MECHANIC: {
    name: 'Shop Mechanic',
    description: 'Equipment maintenance and repair tracking',
    level: 30,
    scope: 'branch',
    permissions: [
      PERMISSIONS.EQUIPMENT_READ,
      PERMISSIONS.EQUIPMENT_UPDATE,
      PERMISSIONS.MAINTENANCE_LOG,
      PERMISSIONS.MAINTENANCE_SCHEDULE,
      PERMISSIONS.REPORT_READ,
    ],
    isBuiltIn: true,
  },
  DRIVER: {
    name: 'Driver',
    description: 'View assigned deliveries, update status, capture photos',
    level: 20,
    scope: 'branch',
    permissions: [
      PERMISSIONS.RENTAL_READ,
      PERMISSIONS.RENTAL_UPDATE,
    ],
    isBuiltIn: true,
  },
  ACCOUNTANT: {
    name: 'Accountant',
    description: 'Full access to accounting, expenses, invoices, and financial reports. No rental or equipment management.',
    level: 50,
    scope: 'subscriber',
    permissions: [
      PERMISSIONS.ACCOUNTING_VIEW,
      PERMISSIONS.ACCOUNTING_MANAGE,
      PERMISSIONS.EXPENSE_CREATE,
      PERMISSIONS.EXPENSE_DELETE,
      PERMISSIONS.INVOICE_VOID,
      PERMISSIONS.REPORT_FINANCIAL,
      PERMISSIONS.REPORT_READ,
      PERMISSIONS.REPORT_EXPORT,
      PERMISSIONS.RENTAL_READ,
      PERMISSIONS.CUSTOMER_READ,
      PERMISSIONS.AUDIT_VIEW,
    ],
    isBuiltIn: true,
  },
};

/**
 * Check if a user has a specific permission
 * @param {String} userRole - User's role name
 * @param {String} permission - Permission code to check
 * @param {Array} allRoles - All role records from DB
 * @returns {Boolean}
 */
export function hasPermission(userRole, permission, allRoles = []) {
  const roleRecord = allRoles.find(r => r.name === userRole);
  if (!roleRecord) return false;
  return roleRecord.permissions?.includes(permission) || false;
}

/**
 * Check if user can access a resource based on scope
 * @param {String} userRole - User's role name
 * @param {String} userBranch - User's branch (if branch-scoped)
 * @param {String} resourceBranch - Branch of the resource being accessed
 * @param {Array} allRoles - All role records from DB
 * @returns {Boolean}
 */
export function canAccessBranch(userRole, userBranch, resourceBranch, allRoles = []) {
  const roleRecord = allRoles.find(r => r.name === userRole);
  if (!roleRecord) return false;

  // Platform-scoped users can access any branch
  if (roleRecord.scope === 'platform') return true;

  // Branch-scoped users can only access their own branch
  if (roleRecord.scope === 'branch') return userBranch === resourceBranch;

  return false;
}

/**
 * Check multiple permissions (all must be true)
 * @param {String} userRole - User's role name
 * @param {Array<String>} permissions - Array of permission codes
 * @param {Array} allRoles - All role records from DB
 * @returns {Boolean}
 */
export function hasAllPermissions(userRole, permissions, allRoles = []) {
  return permissions.every(perm => hasPermission(userRole, perm, allRoles));
}

/**
 * Check if user can perform action (action → permission mapping)
 * @param {String} userRole - User's role name
 * @param {String} action - Action (e.g. 'create_rental', 'delete_customer')
 * @param {Array} allRoles - All role records from DB
 * @returns {Boolean}
 */
export function canPerformAction(userRole, action, allRoles = []) {
  const actionToPermission = {
    create_equipment: PERMISSIONS.EQUIPMENT_CREATE,
    update_equipment: PERMISSIONS.EQUIPMENT_UPDATE,
    delete_equipment: PERMISSIONS.EQUIPMENT_DELETE,
    create_rental: PERMISSIONS.RENTAL_CREATE,
    update_rental: PERMISSIONS.RENTAL_UPDATE,
    delete_rental: PERMISSIONS.RENTAL_DELETE,
    create_customer: PERMISSIONS.CUSTOMER_CREATE,
    update_customer: PERMISSIONS.CUSTOMER_UPDATE,
    delete_customer: PERMISSIONS.CUSTOMER_DELETE,
    blacklist_customer: PERMISSIONS.CUSTOMER_BLACKLIST,
    apply_discount: PERMISSIONS.DISCOUNT_APPLY,
    override_discount: PERMISSIONS.DISCOUNT_OVERRIDE,
    process_payment: PERMISSIONS.PAYMENT_PROCESS,
    export_report: PERMISSIONS.REPORT_EXPORT,
    manage_users: PERMISSIONS.USER_MANAGE,
    manage_settings: PERMISSIONS.SETTINGS_MANAGE,
    view_audit: PERMISSIONS.AUDIT_VIEW,
  };

  const permission = actionToPermission[action];
  if (!permission) return false;

  return hasPermission(userRole, permission, allRoles);
}