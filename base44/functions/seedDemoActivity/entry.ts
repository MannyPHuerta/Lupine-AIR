// Seeds a rich, demo-ready dataset into Supabase for the rentalworld.base44.app demo.
// Idempotent: wipes the demo tenant's transactional data, then re-inserts.
// Talks to Supabase directly via the service role key (bypasses RLS).
// Demo narrative: a busy rental operation + counter-theft / fraud signals the
// management modules detect (GPS geofence breach, blacklisted-customer block,
// cash-drawer skimming short, manager override audit).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Both tenants that currently have a user profile (the loggable demo accounts).
const TENANT_IDS = [
  "8cea3147-be07-41a8-b45a-9968b286bc43", // Rental World
  "6e67326f-dbdd-42a9-b442-f4088895a782", // Manny Huerta Demo
];

// ---- date helpers (today = 2026-08-12) ----
const D = (offset) => {
  const d = new Date("2026-08-12T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};
const TS = (offsetDays, hour, min) => {
  const d = new Date("2026-08-12T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + offsetDays);
  d.setUTCHours(hour, min || 0, 0, 0);
  return d.toISOString();
};

// ---- dataset ----
const BRANCHES = [
  { name: "01 McAllen", code: "MCL", address: "1420 N 10th St", city: "McAllen", state: "TX", zip: "78501", phone: "956-555-0100", email: "mcallen@rentalworld.com", parts_buyer_email: "parts@rentalworld.com", purchasing_email: "purchasing@rentalworld.com", accounting_email: "accounting@rentalworld.com", default_area_code: "956", default_starting_float: 300, next_invoice_number: 1046 },
  { name: "02 Weslaco", code: "WES", address: "801 W Expressway 83", city: "Weslaco", state: "TX", zip: "78596", phone: "956-555-0200", email: "weslaco@rentalworld.com", parts_buyer_email: "parts@rentalworld.com", purchasing_email: "purchasing@rentalworld.com", accounting_email: "accounting@rentalworld.com", default_area_code: "956", default_starting_float: 250, next_invoice_number: 2031 },
  { name: "03 Harlingen", code: "HAR", address: "502 S Loop 499", city: "Harlingen", state: "TX", zip: "78550", phone: "956-555-0300", email: "harlingen@rentalworld.com", parts_buyer_email: "parts@rentalworld.com", purchasing_email: "purchasing@rentalworld.com", accounting_email: "accounting@rentalworld.com", default_area_code: "956", default_starting_float: 250, next_invoice_number: 3018 },
  { name: "05 Brownsville", code: "BRO", address: "2200 Central Blvd", city: "Brownsville", state: "TX", zip: "78520", phone: "956-555-0500", email: "brownsville@rentalworld.com", parts_buyer_email: "parts@rentalworld.com", purchasing_email: "purchasing@rentalworld.com", accounting_email: "accounting@rentalworld.com", default_area_code: "956", default_starting_float: 200, next_invoice_number: 5011 },
  { name: "06 Corpus", code: "CRP", address: "5601 SPID", city: "Corpus Christi", state: "TX", zip: "78412", phone: "361-555-0600", email: "corpus@rentalworld.com", parts_buyer_email: "parts@rentalworld.com", purchasing_email: "purchasing@rentalworld.com", accounting_email: "accounting@rentalworld.com", default_area_code: "361", default_starting_float: 200, next_invoice_number: 6008 },
  { name: "98 Shop", code: "SHOP", address: "100 Shop Rd", city: "McAllen", state: "TX", zip: "78501", phone: "956-555-9800", email: "shop@rentalworld.com", parts_buyer_email: "parts@rentalworld.com", purchasing_email: "purchasing@rentalworld.com", accounting_email: "accounting@rentalworld.com", default_area_code: "956", default_starting_float: 100, next_invoice_number: 9800 },
  { name: "99 Warehouse", code: "WH", address: "200 Warehouse Dr", city: "McAllen", state: "TX", zip: "78501", phone: "956-555-9900", email: "wh@rentalworld.com", parts_buyer_email: "parts@rentalworld.com", purchasing_email: "purchasing@rentalworld.com", accounting_email: "accounting@rentalworld.com", default_area_code: "956", default_starting_float: 100, next_invoice_number: 9900 },
];

const EQUIPMENT = [
  { name: "20x40 Frame Tent", category: "Tent", dailyRate: 280, weeklyRate: 840, monthlyRate: 2520, deposit: 500, home: "01 McAllen", status: "available", condition: "Good", asset: "TENT-2040-01", serial: "SN-T40-001", serialized: true, bulk: 1 },
  { name: "20x20 Frame Tent", category: "Tent", dailyRate: 180, weeklyRate: 540, monthlyRate: 1620, deposit: 300, home: "01 McAllen", status: "available", condition: "Good", asset: "TENT-2020-01", serial: "SN-T20-001", serialized: true, bulk: 1 },
  { name: "White Folding Chair", category: "Chair", dailyRate: 1.5, weeklyRate: 4.5, monthlyRate: 13.5, deposit: 0, home: "01 McAllen", status: "available", condition: "Good", asset: null, serial: null, serialized: false, bulk: 500 },
  { name: "6ft Round Table", category: "Table", dailyRate: 8, weeklyRate: 24, monthlyRate: 72, deposit: 0, home: "01 McAllen", status: "available", condition: "Good", asset: null, serial: null, serialized: false, bulk: 150 },
  { name: "8ft Rectangular Table", category: "Table", dailyRate: 10, weeklyRate: 30, monthlyRate: 90, deposit: 0, home: "01 McAllen", status: "available", condition: "Good", asset: null, serial: null, serialized: false, bulk: 100 },
  { name: "Portable Generator 5000W", category: "Generator", dailyRate: 95, weeklyRate: 285, monthlyRate: 855, deposit: 200, home: "01 McAllen", status: "available", condition: "Good", asset: "GEN-5K-01", serial: "SN-GEN5K-01", serialized: true, bulk: 1 },
  { name: "Portable Generator 10000W", category: "Generator", dailyRate: 150, weeklyRate: 450, monthlyRate: 1350, deposit: 300, home: "01 McAllen", status: "out_on_rental", condition: "Good", asset: "GEN-10K-01", serial: "SN-GEN10K-01", serialized: true, bulk: 1, statusNote: "OUT — rental MCL-1033 (GPS breach / theft)" },
  { name: "Dance Floor 12x12", category: "Dance Floor", dailyRate: 120, weeklyRate: 360, monthlyRate: 1080, deposit: 250, home: "01 McAllen", status: "available", condition: "Good", asset: "DF-12-01", serial: "SN-DF12-01", serialized: true, bulk: 1 },
  { name: "Stage 4x8 Platform", category: "Staging", dailyRate: 45, weeklyRate: 135, monthlyRate: 405, deposit: 150, home: "01 McAllen", status: "available", condition: "Good", asset: null, serial: null, serialized: false, bulk: 20 },
  { name: "Skid Steer S160", category: "Skid Steer", dailyRate: 225, weeklyRate: 675, monthlyRate: 2025, deposit: 500, home: "01 McAllen", status: "out_on_rental", condition: "Good", asset: "SKD-S160-01", serial: "SN-SKD-01", serialized: true, bulk: 1, statusNote: "OUT — rental MCL-1036 (overdue)" },
  { name: "Mini Excavator U27", category: "Excavator", dailyRate: 275, weeklyRate: 825, monthlyRate: 2475, deposit: 750, home: "02 Weslaco", status: "available", condition: "Good", asset: "EXC-U27-01", serial: "SN-EXC-01", serialized: true, bulk: 1 },
  { name: "Plate Compactor", category: "Plate Compactor", dailyRate: 65, weeklyRate: 195, monthlyRate: 585, deposit: 150, home: "02 Weslaco", status: "available", condition: "Good", asset: "PC-01", serial: "SN-PC-01", serialized: true, bulk: 1 },
  { name: "Concrete Mixer 9cuft", category: "Concrete Mixer", dailyRate: 85, weeklyRate: 255, monthlyRate: 765, deposit: 200, home: "03 Harlingen", status: "available", condition: "Good", asset: "MIX-09-01", serial: "SN-MIX-01", serialized: true, bulk: 1 },
  { name: "Pressure Washer 4000PSI", category: "Pressure Washer", dailyRate: 75, weeklyRate: 225, monthlyRate: 675, deposit: 150, home: "03 Harlingen", status: "out_on_rental", condition: "Good", asset: "PW-4K-01", serial: "SN-PW-01", serialized: true, bulk: 1, statusNote: "OUT — RTO rental HAR-3009" },
  { name: "Barricade 8ft", category: "Other", dailyRate: 12, weeklyRate: 36, monthlyRate: 108, deposit: 50, home: "01 McAllen", status: "available", condition: "Good", asset: null, serial: null, serialized: false, bulk: 100 },
  { name: "30x60 Frame Tent", category: "Tent", dailyRate: 420, weeklyRate: 1260, monthlyRate: 3780, deposit: 800, home: "05 Brownsville", status: "available", condition: "Good", asset: "TENT-3060-01", serial: "SN-T3060-01", serialized: true, bulk: 1 },
];

const CUSTOMERS = [
  { fullName: "Juan Rodríguez", companyName: "Rodríguez Construction", accountType: "business", phone: "956-555-1234", email: "juan@rodriguezconst.com", address: "1420 Palm Blvd", city: "McAllen", state: "TX", zip: "78501", idVerified: true, phoneVerified: true, paymentTerms: "net_30", totalRentals: 14, totalSpend: 18420, lastRentalDate: D(-3), loyalty: false, blacklisted: false, creditHold: false, taxExempt: false },
  { fullName: "Maria Santos", companyName: "Santos Event Planning", accountType: "business", phone: "956-555-2345", email: "maria@santosevents.com", address: "2801 N 23rd St", city: "McAllen", state: "TX", zip: "78501", idVerified: true, phoneVerified: true, paymentTerms: "due_on_receipt", totalRentals: 9, totalSpend: 9800, lastRentalDate: D(-7), loyalty: false, blacklisted: false, creditHold: false, taxExempt: false },
  { fullName: "Robert Chen", companyName: null, accountType: "individual", phone: "956-555-3456", email: "rchen@email.com", address: "505 W Nolana Ave", city: "McAllen", state: "TX", zip: "78504", idVerified: true, phoneVerified: true, paymentTerms: "due_on_receipt", totalRentals: 5, totalSpend: 2100, lastRentalDate: D(-5), loyalty: false, blacklisted: false, creditHold: false, taxExempt: false },
  { fullName: "Sarah Johnson", companyName: "Johnson Weddings", accountType: "business", phone: "956-555-4567", email: "sarah@johnsonweddings.com", address: "3300 McColl Rd", city: "McAllen", state: "TX", zip: "78503", idVerified: true, phoneVerified: true, paymentTerms: "due_on_receipt", totalRentals: 22, totalSpend: 31200, lastRentalDate: D(-5), loyalty: true, blacklisted: false, creditHold: false, taxExempt: false },
  { fullName: "Miguel Hernández", companyName: "Hernández Landscaping", accountType: "business", phone: "956-555-5678", email: "miguel@hernandezlandscape.com", address: "1015 S Shary Rd", city: "Mission", state: "TX", zip: "78572", idVerified: true, phoneVerified: true, paymentTerms: "net_15", totalRentals: 11, totalSpend: 7600, lastRentalDate: D(-5), loyalty: false, blacklisted: false, creditHold: false, taxExempt: false },
  { fullName: "City of Edinburg", companyName: null, accountType: "municipal", phone: "956-555-6789", email: "procurement@edinburgtx.gov", address: "110 N 6th St", city: "Edinburg", state: "TX", zip: "78539", idVerified: true, phoneVerified: true, paymentTerms: "net_30", totalRentals: 8, totalSpend: 12400, lastRentalDate: D(-10), loyalty: false, blacklisted: false, creditHold: false, taxExempt: true, taxExemptCert: "TX-EXEMPT-4471" },
  { fullName: "Valley Party Rentals", companyName: "Valley Party Rentals LLC", accountType: "business", phone: "956-555-7890", email: "info@valleyparty.com", address: "2400 E Expressway 83", city: "Weslaco", state: "TX", zip: "78596", idVerified: true, phoneVerified: true, paymentTerms: "due_on_receipt", totalRentals: 17, totalSpend: 22300, lastRentalDate: D(-5), loyalty: false, blacklisted: false, creditHold: false, taxExempt: false },
  { fullName: "David Martinez", companyName: null, accountType: "individual", phone: "956-555-8901", email: "dmartinez@email.com", address: "701 E Trenton Rd", city: "Edinburg", state: "TX", zip: "78539", idVerified: true, phoneVerified: true, paymentTerms: "due_on_receipt", totalRentals: 6, totalSpend: 3400, lastRentalDate: D(-1), loyalty: false, blacklisted: false, creditHold: false, taxExempt: false },
  { fullName: "Carlos Alvarez", companyName: null, accountType: "individual", phone: "956-555-9012", email: "skipalvarez@email.com", address: "905 S Bicentennial Blvd", city: "McAllen", state: "TX", zip: "78501", idVerified: false, phoneVerified: false, paymentTerms: "due_on_receipt", totalRentals: 2, totalSpend: 480, loyalty: false, blacklisted: true, blacklistReason: "PRIOR THEFT INCIDENT (2025-11): Returned empty generator shells instead of units. Falsified DL on file. DO NOT RENT.", creditHold: false, taxExempt: false },
  { fullName: "Linda Park", companyName: null, accountType: "individual", phone: "956-555-0123", email: "lpark@email.com", address: "402 N Main St", city: "McAllen", state: "TX", zip: "78501", idVerified: true, phoneVerified: false, paymentTerms: "due_on_receipt", totalRentals: 3, totalSpend: 2600, loyalty: false, blacklisted: false, creditHold: true, creditHoldReason: "Outstanding balance $1,840.00 on invoice MCL-0987 — 90+ days overdue. Require payment upfront.", taxExempt: false },
];

const RENTALS = [
  { key: "R1", cust: "Juan Rodríguez", equip: "20x40 Frame Tent", branch: "01 McAllen", start: D(0), end: D(3), status: "contract", invoice: "MCL-1042", deliveryMethod: "company_delivery", baseAmount: 1120, deliveryFee: 150, amountPaid: 500, deposit: 500, worksiteAddress: "2400 Convention Center Blvd", worksiteCity: "McAllen", worksiteState: "TX", worksiteZip: "78501" },
  { key: "R2", cust: "Maria Santos", equip: "Dance Floor 12x12", branch: "01 McAllen", start: D(0), end: D(1), status: "reservation", invoice: "MCL-1043", deliveryMethod: "company_delivery", baseAmount: 240, deliveryFee: 75, amountPaid: 0, deposit: 250, worksiteAddress: "2801 N 23rd St", worksiteCity: "McAllen", worksiteState: "TX", worksiteZip: "78501" },
  { key: "R3", cust: "City of Edinburg", equip: "Stage 4x8 Platform", branch: "01 McAllen", start: D(0), end: D(3), status: "contract", invoice: "MCL-1044", deliveryMethod: "company_delivery", baseAmount: 1350, deliveryFee: 200, amountPaid: 0, deposit: 0, taxExempt: true, worksiteAddress: "110 N 6th St", worksiteCity: "Edinburg", worksiteState: "TX", worksiteZip: "78539" },
  { key: "R4", cust: "Robert Chen", equip: "Portable Generator 5000W", branch: "01 McAllen", start: D(-5), end: D(0), status: "out", invoice: "MCL-1039", deliveryMethod: "customer_pickup", baseAmount: 475, deliveryFee: 0, amountPaid: 475, deposit: 200 },
  { key: "R5", cust: "Sarah Johnson", equip: "20x20 Frame Tent", branch: "01 McAllen", start: D(-5), end: D(0), status: "out", invoice: "MCL-1040", deliveryMethod: "company_delivery", baseAmount: 900, deliveryFee: 100, amountPaid: 1000, deposit: 300, loyalty: true, worksiteAddress: "3300 McColl Rd", worksiteCity: "McAllen", worksiteState: "TX", worksiteZip: "78503" },
  { key: "R6", cust: "Juan Rodríguez", equip: "Portable Generator 10000W", branch: "01 McAllen", start: D(-10), end: D(-3), status: "out", invoice: "MCL-1033", deliveryMethod: "company_delivery", baseAmount: 1050, deliveryFee: 150, amountPaid: 300, deposit: 300, isLate: true, daysLate: 3, lateFeePerDay: 25, lateFeeTotal: 75, notes: "OVERDUE + GPS GEOFENCE BREACH — equipment moving south at 55mph at 2:14 AM. Possible theft. Recovery dispatched.", worksiteAddress: "4200 S Bentsen Rd", worksiteCity: "McAllen", worksiteState: "TX", worksiteZip: "78501" },
  { key: "R7", cust: "David Martinez", equip: "Skid Steer S160", branch: "01 McAllen", start: D(-7), end: D(-1), status: "out", invoice: "MCL-1036", deliveryMethod: "customer_pickup", baseAmount: 1575, deliveryFee: 0, amountPaid: 1575, deposit: 500, isLate: true, daysLate: 1, lateFeePerDay: 25, lateFeeTotal: 25, worksiteAddress: "701 E Trenton Rd", worksiteCity: "Edinburg", worksiteState: "TX", worksiteZip: "78539" },
  { key: "R8", cust: "Miguel Hernández", equip: "Mini Excavator U27", branch: "02 Weslaco", start: D(-5), end: D(1), status: "out", invoice: "WES-2029", deliveryMethod: "company_delivery", baseAmount: 1375, deliveryFee: 175, amountPaid: 1550, deposit: 750, worksiteAddress: "1015 S Shary Rd", worksiteCity: "Mission", worksiteState: "TX", worksiteZip: "78572" },
  { key: "R9", cust: "Valley Party Rentals", equip: "30x60 Frame Tent", branch: "05 Brownsville", start: D(-5), end: D(1), status: "out", invoice: "BRO-5010", deliveryMethod: "company_delivery", baseAmount: 2100, deliveryFee: 250, amountPaid: 2350, deposit: 800, worksiteAddress: "2200 Central Blvd", worksiteCity: "Brownsville", worksiteState: "TX", worksiteZip: "78520" },
  { key: "R10", cust: "Sarah Johnson", equip: "Mini Excavator U27", branch: "01 McAllen", sourceBranch: "02 Weslaco", cross: true, start: D(3), end: D(7), status: "reservation", invoice: "MCL-1045", deliveryMethod: "company_delivery", baseAmount: 1925, deliveryFee: 225, amountPaid: 0, deposit: 750, transferOutCompleted: false },
  { key: "R11", cust: "Robert Chen", equip: "Pressure Washer 4000PSI", branch: "01 McAllen", sourceBranch: "03 Harlingen", cross: true, start: D(-10), end: D(-5), status: "returned", invoice: "MCL-1030", deliveryMethod: "company_delivery", baseAmount: 375, deliveryFee: 125, amountPaid: 500, deposit: 150, transferBackCompleted: false },
  { key: "R12", cust: "City of Edinburg", equip: "Concrete Mixer 9cuft", branch: "03 Harlingen", start: D(-15), end: D(-10), status: "completed", invoice: "HAR-3015", deliveryMethod: "customer_pickup", baseAmount: 425, deliveryFee: 0, amountPaid: 425, deposit: 200, taxExempt: true },
  { key: "R13", cust: "Miguel Hernández", equip: "Plate Compactor", branch: "02 Weslaco", start: D(-12), end: D(-7), status: "completed", invoice: "WES-2027", deliveryMethod: "customer_pickup", baseAmount: 325, deliveryFee: 0, amountPaid: 325, deposit: 150 },
  { key: "R14", cust: "Valley Party Rentals", equip: "Barricade 8ft", branch: "01 McAllen", start: D(-14), end: D(-8), status: "completed", invoice: "MCL-1031", deliveryMethod: "customer_pickup", baseAmount: 144, deliveryFee: 0, amountPaid: 144, deposit: 0 },
  { key: "R15", cust: "Carlos Alvarez", equip: "Portable Generator 5000W", branch: "01 McAllen", start: D(0), end: D(1), status: "cancelled", invoice: "MCL-1046-CXL", deliveryMethod: "customer_pickup", baseAmount: 95, deliveryFee: 0, amountPaid: 0, deposit: 0, notes: "RENTAL BLOCKED AT COUNTER: Customer is BLACKLISTED (prior theft incident 2025-11). Staff declined rental and sent customer away. Manager notified." },
  { key: "R16", cust: "David Martinez", equip: "Pressure Washer 4000PSI", branch: "03 Harlingen", start: "2026-07-01", end: "2026-12-01", status: "out", invoice: "HAR-3009", deliveryMethod: "customer_pickup", baseAmount: 1500, deliveryFee: 0, amountPaid: 500, deposit: 0, rto: true, purchasePrice: 1500, amountCredited: 250, balanceRemaining: 1250, notes: "Rent-to-Own contract — 6 monthly payments of $250, 50% credited toward purchase." },
  { key: "R17", cust: "Robert Chen", equip: "20x40 Frame Tent", branch: "01 McAllen", start: D(7), end: D(10), status: "quote", invoice: "MCL-1047-Q", deliveryMethod: "company_delivery", baseAmount: 1120, deliveryFee: 150, amountPaid: 0, deposit: 500 },
  { key: "R18", cust: "City of Edinburg", equip: "30x60 Frame Tent", branch: "05 Brownsville", start: D(14), end: D(17), status: "quote", invoice: "BRO-5012-Q", deliveryMethod: "company_delivery", baseAmount: 1680, deliveryFee: 300, amountPaid: 0, deposit: 800, taxExempt: true },
];

const DELIVERIES = [
  { rkey: "R1", status: "scheduled", driver: null, driverId: null, branch: "01 McAllen", date: D(0), time: "10:00-12:00", items: [{ equipmentName: "20x40 Frame Tent", quantity: 1 }] },
  { rkey: "R2", status: "departed", driver: "Carlos Mendoza", driverId: "carlos@rentalworld.com", branch: "01 McAllen", date: D(0), time: "09:00-11:00", departedAt: TS(0, 14, 30), items: [{ equipmentName: "Dance Floor 12x12", quantity: 1 }] },
  { rkey: "R3", status: "arrived", driver: "James Wilson", driverId: "james@rentalworld.com", branch: "01 McAllen", date: D(0), time: "08:00-10:00", departedAt: TS(0, 13, 45), arrivedAt: TS(0, 14, 10), items: [{ equipmentName: "Stage 4x8 Platform", quantity: 10 }] },
  { rkey: "R5", status: "setup_complete", driver: "Carlos Mendoza", driverId: "carlos@rentalworld.com", branch: "01 McAllen", date: D(-5), time: "14:00-16:00", items: [{ equipmentName: "20x20 Frame Tent", quantity: 1 }] },
  { rkey: "R12", status: "completed", driver: "Linda Morales", driverId: "linda@rentalworld.com", branch: "03 Harlingen", date: D(-15), time: "09:00", items: [{ equipmentName: "Concrete Mixer 9cuft", quantity: 1 }] },
  { rkey: "R9", status: "scheduled", driver: "Roberto Silva", driverId: "roberto@rentalworld.com", branch: "05 Brownsville", date: D(1), time: "07:00-09:00", scheduleChangedAt: TS(0, 15, 0), scheduleChangedBy: "ana@rentalworld.com", prevDate: D(0), prevTime: "07:00-09:00", items: [{ equipmentName: "30x60 Frame Tent", quantity: 1 }] },
  { rkey: "R10", status: "scheduled", driver: null, driverId: null, branch: "02 Weslaco", crossTransfer: true, destBranch: "01 McAllen", date: D(2), time: "08:00", items: [{ equipmentName: "Mini Excavator U27", quantity: 1 }] },
];

const RECOVERIES = [
  { rkey: "R4", status: "scheduled", driver: "Carlos Mendoza", driverId: "carlos@rentalworld.com", branch: "01 McAllen", date: D(0), route: "shop", notes: "Routine pickup — generator due back today. Route to shop for inspection." },
  { rkey: "R7", status: "departed", driver: "James Wilson", driverId: "james@rentalworld.com", branch: "01 McAllen", date: D(0), route: "shop", departedAt: TS(0, 15, 30), notes: "Overdue skid steer — driver dispatched for pickup." },
  { rkey: "R6", status: "scheduled", driver: "James Wilson", driverId: "james@rentalworld.com", branch: "01 McAllen", date: D(0), route: "shop", notes: "URGENT THEFT RECOVERY: GPS geofence breach — generator moving south at 55mph at 2:14 AM toward Hidalgo port of entry. Recovery dispatched to last known location. Police notified." },
];

const CASH_DRAWERS = [
  { branch: "01 McAllen", date: D(0), label: "Full Day", status: "open", openedBy: "ana@rentalworld.com", openedAt: TS(0, 13, 0), closedBy: null, closedAt: null, float: 300, cashCollected: 2400, cardCollected: 3800, checkCollected: 500, countedCash: 2360, expectedCash: 2700, variance: -340, attendantLog: [{ email: "ana@rentalworld.com", note: "Opened drawer", loggedBy: "ana@rentalworld.com", loggedAt: TS(0, 13, 0) }, { email: "carlos@rentalworld.com", note: "Carlos logged on for afternoon", loggedBy: "ana@rentalworld.com", loggedAt: TS(0, 17, 0) }], closingNotes: null, reconciledBy: null, reconciledAt: null, reconciledNotes: null },
  { branch: "01 McAllen", date: D(-1), label: "Full Day", status: "closed", openedBy: "ana@rentalworld.com", openedAt: TS(-1, 13, 0), closedBy: "ana@rentalworld.com", closedAt: TS(-1, 1, 0), float: 300, cashCollected: 1850, cardCollected: 4200, checkCollected: 300, countedCash: 1875, expectedCash: 2150, variance: 25, attendantLog: null, closingNotes: "Busy day — two large event rentals.", reconciledBy: null, reconciledAt: null, reconciledNotes: null },
  { branch: "02 Weslaco", date: D(0), label: "Full Day", status: "open", openedBy: "roberto@rentalworld.com", openedAt: TS(0, 13, 30), closedBy: null, closedAt: null, float: 250, cashCollected: 1200, cardCollected: 2400, checkCollected: 0, countedCash: 1450, expectedCash: 1450, variance: 0, attendantLog: null, closingNotes: null, reconciledBy: null, reconciledAt: null, reconciledNotes: null },
  { branch: "03 Harlingen", date: D(-1), label: "Afternoon", status: "closed", openedBy: "linda@rentalworld.com", openedAt: TS(-1, 18, 0), closedBy: "linda@rentalworld.com", closedAt: TS(0, 1, 0), float: 200, cashCollected: 940, cardCollected: 1800, checkCollected: 0, countedCash: 1080, expectedCash: 1140, variance: -60, attendantLog: null, closingNotes: "Short $60 — could not locate. CCTV review pending.", reconciledBy: null, reconciledAt: null, reconciledNotes: null },
  { branch: "05 Brownsville", date: D(-2), label: "Full Day", status: "reconciled", openedBy: "roberto@rentalworld.com", openedAt: TS(-2, 13, 0), closedBy: "roberto@rentalworld.com", closedAt: TS(-1, 1, 0), float: 200, cashCollected: 1500, cardCollected: 2900, checkCollected: 200, countedCash: 1715, expectedCash: 1700, variance: 15, attendantLog: null, closingNotes: null, reconciledBy: "ana@rentalworld.com", reconciledAt: TS(-1, 16, 0), reconciledNotes: "Reconciled — minor over, no action." },
  { branch: "01 McAllen", date: D(-2), label: "Full Day", status: "closed", openedBy: "carlos@rentalworld.com", openedAt: TS(-2, 13, 0), closedBy: "carlos@rentalworld.com", closedAt: TS(-1, 1, 0), float: 300, cashCollected: 2100, cardCollected: 3600, checkCollected: 400, countedCash: 2388, expectedCash: 2400, variance: -12, attendantLog: null, closingNotes: "Minor short within tolerance.", reconciledBy: null, reconciledAt: null, reconciledNotes: null },
];

const AUDIT_LOGS = [
  { action: "alert", entity: "EquipmentGPSLink", label: "Portable Generator 10000W (GEN-10K-01)", performedBy: "system@rentalworld.com", performedAt: TS(0, 7, 14), branch: "01 McAllen", reason: "GEOFENCE BREACH: Equipment left assigned worksite. Moving at 55.4 mph southbound on US-281 toward Hidalgo port of entry. Night movement detected (2:14 AM). Possible theft in progress — recovery dispatched, police notified.", changes: null },
  { action: "block", entity: "Customer", label: "Carlos Alvarez", performedBy: "carlos@rentalworld.com", performedAt: TS(0, 15, 22), branch: "01 McAllen", reason: "Rental blocked at counter — customer is BLACKLISTED (prior theft incident 2025-11, returned empty generator shells). Staff declined rental and sent customer away.", changes: null },
  { action: "override", entity: "Rental", label: "MCL-1040 (Johnson Weddings)", performedBy: "ana@rentalworld.com", performedAt: TS(-1, 21, 0), branch: "01 McAllen", reason: "Manager applied 15% loyalty discount to wedding tent rental.", changes: { discountPercent: { before: 0, after: 15 }, discountAmount: { before: 0, after: 135 } } },
  { action: "alert", entity: "CashDrawer", label: "McAllen 2026-08-12 Full Day", performedBy: "system@rentalworld.com", performedAt: TS(0, 20, 0), branch: "01 McAllen", reason: "CASH SHORT: Drawer variance -$340 (12.6% of cash collected). Exceeds 5% threshold — possible skimming. Review attendant log and CCTV for shift window.", changes: null },
  { action: "update", entity: "Equipment", label: "20x40 Frame Tent", performedBy: "ana@rentalworld.com", performedAt: TS(-2, 18, 0), branch: "01 McAllen", reason: "Quarterly rate review — tent pricing increased.", changes: { dailyRate: { before: 265, after: 280 }, weeklyRate: { before: 800, after: 840 } } },
  { action: "create", entity: "Rental", label: "MCL-1042 (Rodríguez Construction)", performedBy: "carlos@rentalworld.com", performedAt: TS(-1, 20, 0), branch: "01 McAllen", reason: "New rental created — 20x40 tent, 3 days, delivery to Convention Center.", changes: null },
  { action: "update", entity: "Rental", label: "HAR-3015 (City of Edinburg)", performedBy: "linda@rentalworld.com", performedAt: TS(-10, 18, 0), branch: "03 Harlingen", reason: "Equipment returned in good condition — rental closed.", changes: null },
  { action: "update", entity: "Delivery", label: "Valley Party Rentals 30x60 Tent (BRO-5010)", performedBy: "ana@rentalworld.com", performedAt: TS(0, 15, 0), branch: "05 Brownsville", reason: "Customer requested delivery rescheduled from 8/12 to 8/13. Driver notified via SMS.", changes: { scheduledDate: { before: "2026-08-12", after: "2026-08-13" } } },
  { action: "block", entity: "Customer", label: "Linda Park", performedBy: "carlos@rentalworld.com", performedAt: TS(-1, 17, 0), branch: "01 McAllen", reason: "Rental blocked — customer on CREDIT HOLD (outstanding $1,840 on invoice MCL-0987, 90+ days). Require payment upfront.", changes: null },
  { action: "create", entity: "RtoPayment", label: "HAR-3009 (D. Martinez — Pressure Washer RTO)", performedBy: "linda@rentalworld.com", performedAt: TS(-3, 19, 0), branch: "03 Harlingen", reason: "RTO payment #2 of 6 recorded ($250). 50% ($125) credited toward purchase. Balance remaining $1,250.", changes: null },
];

const GPS_LINKS = [
  { equip: "Portable Generator 10000W", device: "SAMS-1042", label: "GEN-10K-01 — McAllen", breached: true, breachedAt: TS(0, 7, 14), speedAnomaly: true, speedAnomalyAt: TS(0, 7, 14), nightMove: true, nightMoveAt: TS(0, 7, 14), lat: 26.1, lng: -98.28, speed: 55.4, ignition: true, lastSeen: TS(0, 7, 14), address: "US-281 SB near Hidalgo, TX" },
  { equip: "Skid Steer S160", device: "SAMS-2018", label: "SKD-S160-01 — Edinburg worksite", breached: false, breachedAt: null, speedAnomaly: false, speedAnomalyAt: null, nightMove: false, nightMoveAt: null, lat: 26.245, lng: -98.218, speed: 0, ignition: false, lastSeen: TS(0, 16, 0), address: "701 E Trenton Rd, Edinburg, TX" },
  { equip: "Mini Excavator U27", device: "SAMS-3071", label: "EXC-U27-01 — Mission worksite", breached: false, breachedAt: null, speedAnomaly: false, speedAnomalyAt: null, nightMove: false, nightMoveAt: null, lat: 26.159, lng: -98.231, speed: 0, ignition: false, lastSeen: TS(0, 15, 30), address: "1015 S Shary Rd, Mission, TX" },
];

const DRIVER_LOCS = [
  { email: "carlos@rentalworld.com", name: "Carlos Mendoza", branch: "01 McAllen", lat: 26.205, lng: -98.23, status: "En route — María Santos delivery", updatedAt: TS(0, 16, 40) },
  { email: "james@rentalworld.com", name: "James Wilson", branch: "01 McAllen", lat: 26.1, lng: -98.28, status: "At stop — generator theft recovery (US-281)", updatedAt: TS(0, 16, 50) },
  { email: "roberto@rentalworld.com", name: "Roberto Silva", branch: "02 Weslaco", lat: 26.159, lng: -98.231, status: "Returning to Weslaco branch", updatedAt: TS(0, 16, 25) },
];

// ---- Supabase REST helpers ----
function headers() {
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
}

// Ensure every row in a batch has identical keys (PostgREST requires this).
function uniform(rows) {
  const keys = new Set();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const o = {};
    for (const k of keys) o[k] = r[k] === undefined ? null : r[k];
    return o;
  });
}

async function sbInsert(table, rows, select = "*") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`, {
    method: "POST",
    headers: { ...headers(), Prefer: "return=representation" },
    body: JSON.stringify(uniform(rows)),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`insert ${table} failed ${res.status}: ${t}`);
  }
  return res.json();
}

async function sbDelete(table, tenantId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?tenant_id=eq.${tenantId}`, {
    method: "DELETE",
    headers: { ...headers(), Prefer: "return=representation" },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`delete ${table} failed ${res.status}: ${t}`);
  }
}

async function sbPatch(table, filter, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: { ...headers(), Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`patch ${table} failed ${res.status}: ${t}`);
  }
  return res.json();
}

async function sbGet(table, select, filter = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}${filter}`, { headers: headers() });
  if (!res.ok) return [];
  return res.json();
}

async function seedTenant(tid) {
  // 1. wipe (children first)
  for (const t of ["rto_payments", "equipment_gps_links", "driver_locations", "audit_logs", "cash_drawers", "recoveries", "deliveries", "rentals", "customers", "equipment", "promo_codes", "gps_providers"]) {
    try { await sbDelete(t, tid); } catch (e) { /* table may be empty/missing — ignore */ }
  }

  // 2. branches (reuse existing, create missing)
  let br = await sbGet("branches", "id,name", `&tenant_id=eq.${tid}`);
  const bmap = {};
  br.forEach((b) => (bmap[b.name] = b.id));
  const toCreate = BRANCHES.filter((b) => !bmap[b.name]);
  if (toCreate.length) {
    const created = await sbInsert("branches", toCreate.map((b) => ({
      tenant_id: tid, name: b.name, code: b.code, address: b.address, city: b.city, state: b.state, zip: b.zip,
      phone: b.phone, email: b.email, parts_buyer_email: b.parts_buyer_email, purchasing_email: b.purchasing_email,
      accounting_email: b.accounting_email, default_area_code: b.default_area_code, default_starting_float: b.default_starting_float,
      next_invoice_number: b.next_invoice_number, is_active: true,
    })), "id,name");
    created.forEach((b) => (bmap[b.name] = b.id));
  }
  const mcAllenId = bmap["01 McAllen"];

  // 3. settings
  try { await sbDelete("company_settings", tid); } catch (e) {}
  await sbInsert("company_settings", [{
    tenant_id: tid, header_style: "navy", demo_mode_enabled: true, demo_branch_id: mcAllenId,
    fraud_alert_emails: ["manny@rentalworld.com"], fraud_alert_phones: ["+19565550001"],
    geofence_alert_emails: ["manny@rentalworld.com"], geofence_alert_phones: ["+19565550001"],
    late_fees_enabled: true, late_fee_per_day: 25, late_fee_grace_period: 1, late_fee_max_cap: 500,
    sms_reminders_enabled: true, store_mode: "both", invoice_number_prefix: "MCL", invoice_number_start: 1001,
    auto_assign_invoice_numbers: true, invoice_terms: "Net 30", certifications: ["TX Rental Dealer License", "DOT 2189300"],
  }], "id");
  try { await sbDelete("payment_settings", tid); } catch (e) {}
  await sbInsert("payment_settings", [{ tenant_id: tid, active_processor: "stripe", auto_capture: false, send_receipt_email: true }], "id");

  // 4. profile upgrade (admin + branch) so all management modules are reachable
  const profs = await sbGet("profiles", "id,full_name", `&tenant_id=eq.${tid}`);
  for (const p of profs) {
    try { await sbPatch("profiles", `id=eq.${p.id}`, { role: "admin", home_branch_id: mcAllenId, current_branch_id: mcAllenId }); } catch (e) {}
  }

  // 5. gps provider
  const gp = await sbInsert("gps_providers", [{
    tenant_id: tid, branch_id: mcAllenId, name: "Samsara — McAllen Fleet", provider_type: "samsara",
    api_key: "[demo-samsara-key]", is_active: true, geofence_radius_miles: 1, poll_interval_minutes: 15,
    last_tested_at: TS(-1, 18, 0), last_test_result: "ok", last_test_message: "Connected — 12 vehicles reporting.",
  }], "id");
  const gpId = gp[0].id;

  // 6. customers
  const custRows = CUSTOMERS.map((c) => ({
    tenant_id: tid, full_name: c.fullName, company_name: c.companyName, account_type: c.accountType, phone: c.phone,
    email: c.email, address: c.address, city: c.city, state: c.state, zip: c.zip, payment_terms: c.paymentTerms,
    credit_hold: !!c.creditHold, credit_hold_reason: c.creditHoldReason || null, blacklisted: !!c.blacklisted,
    blacklist_reason: c.blacklistReason || null, tax_exempt: !!c.taxExempt, tax_exempt_cert_number: c.taxExemptCert || null,
    id_verified: !!c.idVerified, phone_verified: !!c.phoneVerified, loyalty_discount_enabled: !!c.loyalty,
    loyalty_discount_percent: c.loyalty ? 15 : null, loyalty_discount_note: c.loyalty ? "Repeat client — 15% standing loyalty" : null,
    total_rentals: c.totalRentals, total_spend: c.totalSpend, last_rental_date: c.lastRentalDate, preferred_branch_id: mcAllenId, source: "manual",
  }));
  const custCreated = await sbInsert("customers", custRows, "id,full_name");
  const cmap = {}; custCreated.forEach((c) => (cmap[c.full_name] = c.id));

  // 7. equipment
  const eqRows = EQUIPMENT.map((e) => ({
    tenant_id: tid, home_branch_id: bmap[e.home], current_branch_id: bmap[e.home], name: e.name, category: e.category,
    daily_rate: e.dailyRate, weekly_rate: e.weeklyRate, monthly_rate: e.monthlyRate, deposit_required: e.deposit,
    unit_status: e.status, condition: e.condition, asset_number: e.asset, serial_number: e.serial, serialized: e.serialized,
    bulk_quantity: e.bulk, status_note: e.statusNote || null, status_updated_at: TS(0, 16, 0), taxable: true,
    rent_to_own_eligible: e.name === "Pressure Washer 4000PSI", rent_to_own_price: e.name === "Pressure Washer 4000PSI" ? 1500 : null,
    rent_to_own_credit_percent: 50, rent_to_own_term_months: 6,
  }));
  const eqCreated = await sbInsert("equipment", eqRows, "id,name");
  const emap = {}; eqCreated.forEach((e) => (emap[e.name] = e.id));

  // 8. promo codes
  await sbInsert("promo_codes", [
    { tenant_id: tid, code: "SUMMER10", description: "Summer — 10% off any rental", discount_type: "percent", discount_value: 10, active: true, expires_at: "2026-09-30", applies_to: "all" },
    { tenant_id: tid, code: "WELCOME15", description: "15% off first rental for new customers", discount_type: "percent", discount_value: 15, active: true, expires_at: "2026-12-31", applies_to: "all" },
  ], "id");

  // 9. rentals
  const rentalRows = RENTALS.map((r) => {
    const days = Math.max(1, Math.round((new Date(r.end) - new Date(r.start)) / 86400000));
    const taxRate = r.taxExempt ? 0 : 0.0825;
    const basePlusExtra = (r.baseAmount || 0) + (r.deliveryFee || 0);
    const taxAmount = r.taxExempt ? 0 : Math.round(basePlusExtra * taxRate * 100) / 100;
    const cust = CUSTOMERS.find((c) => c.fullName === r.cust);
    return {
      tenant_id: tid, branch_id: bmap[r.branch], source_branch_id: r.cross ? bmap[r.sourceBranch] : null,
      is_cross_branch: !!r.cross, transfer_out_completed: !!r.transferOutCompleted, transfer_back_completed: !!r.transferBackCompleted,
      customer_id: cmap[r.cust], customer_name: r.cust, customer_phone: cust.phone, customer_email: cust.email,
      customer_address: cust.address, customer_city: cust.city, customer_state: cust.state, customer_zip: cust.zip,
      equipment_id: emap[r.equip], equipment_name: r.equip, start_date: r.start, end_date: r.end, total_days: days,
      status: r.status, delivery_method: r.deliveryMethod, return_method: r.deliveryMethod === "company_delivery" ? "company_pickup" : "customer_return",
      base_amount: r.baseAmount, delivery_fee: r.deliveryFee || 0, deposit: r.deposit || 0, tax_rate: taxRate, tax_amount: taxAmount,
      amount_paid: r.amountPaid || 0, invoice_number: r.invoice, is_late: !!r.isLate, days_late: r.daysLate || 0,
      late_fee_per_day: r.lateFeePerDay || 0, late_fee_total: r.lateFeeTotal || 0, late_fees_enabled: true,
      is_major_job: ["R1", "R3", "R9"].includes(r.key), major_job_name: ["R1", "R3", "R9"].includes(r.key) ? `${r.cust} — ${r.equip}` : null,
      worksite_address: r.worksiteAddress || null, worksite_city: r.worksiteCity || null, worksite_state: r.worksiteState || null, worksite_zip: r.worksiteZip || null,
      is_rent_to_own: !!r.rto, purchase_price: r.purchasePrice || null, rent_to_own_credit_percent: r.rto ? 50 : 0,
      amount_credited: r.amountCredited || 0, balance_remaining: r.balanceRemaining || null, notes: r.notes || null,
      status_history: [{ status: r.status, changedAt: TS(-1, 18, 0), changedBy: "system@rentalworld.com" }],
    };
  });
  const rentalCreated = await sbInsert("rentals", rentalRows, "id,invoice_number");
  const rmap = {}; rentalCreated.forEach((r) => (rmap[r.invoice_number] = r.id));

  // 10. deliveries
  const delRows = DELIVERIES.map((d) => {
    const r = RENTALS.find((x) => x.key === d.rkey);
    const cust = CUSTOMERS.find((c) => c.fullName === r.cust);
    return {
      tenant_id: tid, branch_id: bmap[d.branch], rental_id: rmap[r.invoice], customer_id: cmap[r.cust], customer_name: r.cust,
      customer_phone: cust.phone, customer_address: r.worksiteAddress || cust.address, customer_city: r.worksiteCity || cust.city,
      customer_state: r.worksiteState || cust.state, customer_zip: r.worksiteZip || cust.zip,
      driver_id: d.driverId, driver_name: d.driver, assigned_at: TS(-1, 18, 0), assigned_by: "ana@rentalworld.com",
      status: d.status, is_cross_transfer: !!d.crossTransfer, destination_branch_id: d.crossTransfer ? bmap[d.destBranch] : null,
      recommended_crew: 2, recommended_vehicles: 1, recommended_delivery_fee: r.deliveryFee || 0, items: d.items,
      scheduled_date: d.date, scheduled_time: d.time, schedule_changed_at: d.scheduleChangedAt || null, schedule_changed_by: d.scheduleChangedBy || null,
      previous_scheduled_date: d.prevDate || null, previous_scheduled_time: d.prevTime || null, departed_at: d.departedAt || null,
      arrived_at: d.arrivedAt || null, notes: null,
    };
  });
  await sbInsert("deliveries", delRows, "id");

  // 11. recoveries
  const recRows = RECOVERIES.map((rc) => {
    const r = RENTALS.find((x) => x.key === rc.rkey);
    return {
      tenant_id: tid, branch_id: bmap[rc.branch], rental_id: rmap[r.invoice], customer_id: cmap[r.cust], customer_name: r.cust,
      driver_id: rc.driverId, driver_name: rc.driver, status: rc.status, return_route: "company_pickup",
      items: [{ equipmentName: r.equip, quantity: 1 }], scheduled_date: rc.date, route: rc.route, departed_at: rc.departedAt || null, notes: rc.notes,
    };
  });
  await sbInsert("recoveries", recRows, "id");

  // 12. cash drawers
  const cdRows = CASH_DRAWERS.map((c) => ({
    tenant_id: tid, branch_id: bmap[c.branch], shift_date: c.date, shift_label: c.label, opened_by: c.openedBy, opened_at: c.openedAt,
    starting_float: c.float, attendant_log: c.attendantLog, closed_by: c.closedBy, closed_at: c.closedAt, status: c.status,
    cash_collected: c.cashCollected, card_collected: c.cardCollected, check_collected: c.checkCollected, other_collected: 0,
    counted_cash: c.countedCash, expected_cash: c.expectedCash, variance: c.variance, closing_notes: c.closingNotes,
    reconciled_by: c.reconciledBy, reconciled_at: c.reconciledAt, reconciled_notes: c.reconciledNotes,
  }));
  await sbInsert("cash_drawers", cdRows, "id");

  // 13. audit logs
  const alRows = AUDIT_LOGS.map((a) => ({
    tenant_id: tid, branch_id: a.branch ? bmap[a.branch] : null, action: a.action, entity_name: a.entity, entity_label: a.label,
    performed_by: a.performedBy, performed_at: a.performedAt, reason: a.reason, changes: a.changes || null,
  }));
  await sbInsert("audit_logs", alRows, "id");

  // 14. gps links
  const gpsRows = GPS_LINKS.map((g) => ({
    tenant_id: tid, equipment_id: emap[g.equip], equipment_name: g.equip, provider_id: gpId, provider_type: "samsara",
    device_id: g.device, device_label: g.label, last_known_lat: g.lat, last_known_lng: g.lng, last_known_address: g.address,
    last_known_speed: g.speed, ignition_on: g.ignition, last_seen_at: g.lastSeen, geofence_breached: !!g.breached,
    geofence_breached_at: g.breachedAt, speed_anomaly_detected: !!g.speedAnomaly, speed_anomaly_at: g.speedAnomalyAt,
    night_movement_detected: !!g.nightMove, night_movement_at: g.nightMoveAt, is_active: true,
  }));
  await sbInsert("equipment_gps_links", gpsRows, "id");

  // 15. driver locations
  const dlRows = DRIVER_LOCS.map((d) => ({
    tenant_id: tid, branch_id: bmap[d.branch], driver_email: d.email, driver_name: d.name, latitude: d.lat, longitude: d.lng,
    updated_at: d.updatedAt, current_status: d.status,
  }));
  await sbInsert("driver_locations", dlRows, "id");

  // 16. rto payments
  await sbInsert("rto_payments", [
    { tenant_id: tid, branch_id: bmap["03 Harlingen"], rental_id: rmap["HAR-3009"], customer_name: "David Martinez", customer_email: "dmartinez@email.com", equipment_name: "Pressure Washer 4000PSI", payment_number: 3, total_payments: 6, due_date: D(0), amount_due: 250, amount_paid: 0, status: "pending", purchase_price: 1500, credit_percent: 50 },
    { tenant_id: tid, branch_id: bmap["03 Harlingen"], rental_id: rmap["HAR-3009"], customer_name: "David Martinez", customer_email: "dmartinez@email.com", equipment_name: "Pressure Washer 4000PSI", payment_number: 4, total_payments: 6, due_date: D(7), amount_due: 250, amount_paid: 0, status: "pending", purchase_price: 1500, credit_percent: 50 },
  ], "id");

  return {
    tenant: tid, branches: Object.keys(bmap).length, customers: custRows.length, equipment: eqRows.length,
    rentals: rentalRows.length, deliveries: delRows.length, recoveries: recRows.length, cashDrawers: cdRows.length,
    auditLogs: alRows.length, gpsLinks: gpsRows.length, driverLocs: dlRows.length, rtoPayments: 2, promos: 2, profilesUpgraded: profs.length,
  };
}

Deno.serve(async (req) => {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return Response.json({ error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY secrets not set" }, { status: 500 });
    }
    const summary = [];
    for (const tid of TENANT_IDS) {
      summary.push(await seedTenant(tid));
    }
    return Response.json({ seeded: true, today: D(0), summary });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});