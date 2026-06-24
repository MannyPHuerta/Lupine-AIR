import { supabaseData } from "./supabaseData";

// Legacy Base44 shim — routes every base44.entities.X.list/get/create/update/delete
// call into the supabaseData adapter so old screens keep working during migration.
const entityNames = [
  "CompanySettings",
  "Branch",
  "Employee",
  "Customer",
  "Equipment",
  "EquipmentCategory",
  "Rental",
  "RentalItem",
  "Reservation",
  "Invoice",
  "Payment",
  "MaintenanceLog",
  "Role",
  "UserRole",
  "Notification",
  "AuditLog",
];

const makeEntity = (name) => ({
  list:   (...a) => supabaseData.list(name, ...a),
  get:    (...a) => supabaseData.get(name, ...a),
  create: (...a) => supabaseData.create(name, ...a),
  update: (...a) => supabaseData.update(name, ...a),
  delete: (...a) => supabaseData.delete(name, ...a),
  filter: (...a) => supabaseData.filter?.(name, ...a),
});

const entities = Object.fromEntries(
  entityNames.map((n) => [n, makeEntity(n)])
);

export const base44 = {
  entities,
  auth: supabaseData.auth,
};

export default base44;
