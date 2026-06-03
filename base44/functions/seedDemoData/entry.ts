import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const FAKE_CUSTOMERS = [
  { fullName: 'Juan Rodríguez', companyName: 'Rodríguez Construction', phone: '+19565551234', email: 'juan@rodriguezconst.com', address: '1420 Palm Blvd', city: 'McAllen', state: 'TX', zip: '78501', accountType: 'business' },
  { fullName: 'Maria Santos', companyName: 'Santos Event Planning', phone: '+19565552345', email: 'maria@santosevents.com', address: '2801 N 23rd St', city: 'McAllen', state: 'TX', zip: '78501', accountType: 'business' },
  { fullName: 'Robert Chen', phone: '+19565553456', email: 'rchen@email.com', address: '505 W Nolana Ave', city: 'McAllen', state: 'TX', 'zip': '78504', accountType: 'individual' },
  { fullName: 'Sarah Johnson', companyName: 'Johnson Weddings', phone: '+19565554567', email: 'sarah@johnsonweddings.com', address: '3300 McColl Rd', city: 'McAllen', state: 'TX', zip: '78503', accountType: 'business' },
  { fullName: 'Miguel Hernández', companyName: 'Hernández Landscaping', phone: '+19565555678', email: 'miguel@hernandezlandscape.com', address: '1015 S Shary Rd', city: 'Mission', state: 'TX', zip: '78572', accountType: 'business' },
  { fullName: 'City of Edinburg', phone: '+19565556789', email: 'procurement@edinburgtx.gov', address: '110 N 6th St', city: 'Edinburg', state: 'TX', zip: '78539', accountType: 'municipal' },
  { fullName: 'Valley Party Rentals', phone: '+19565557890', email: 'info@valleyparty.com', address: '2400 E Expressway 83', city: 'Weslaco', state: 'TX', zip: '78596', accountType: 'business' },
  { fullName: 'David Martinez', phone: '+19565558901', email: 'dmartinez@email.com', address: '701 E Trenton Rd', city: 'Edinburg', state: 'TX', zip: '78539', accountType: 'individual' },
];

const FAKE_EMPLOYEES = [
  { fullName: 'Carlos Mendoza', email: 'carlos@rentalworld.com', branch: '01 McAllen', role: 'user' },
  { fullName: 'Ana García', email: 'ana@rentalworld.com', branch: '01 McAllen', role: 'admin' },
  { fullName: 'Roberto Silva', email: 'roberto@rentalworld.com', branch: '02 Weslaco', role: 'user' },
  { fullName: 'Linda Morales', email: 'linda@rentalworld.com', branch: '03 Harlingen', role: 'user' },
  { fullName: 'James Wilson', email: 'james@rentalworld.com', branch: '01 McAllen', role: 'user' },
];

const FAKE_EQUIPMENT = [
  { name: '20x40 Frame Tent', category: 'Tent', dailyRate: 280, weeklyRate: 840, monthlyRate: 2520, depositRequired: 500, taxable: true, location: '01 McAllen', unitStatus: 'available', condition: 'Good' },
  { name: '20x20 Frame Tent', category: 'Tent', dailyRate: 180, weeklyRate: 540, monthlyRate: 1620, depositRequired: 300, taxable: true, location: '01 McAllen', unitStatus: 'available', condition: 'Good' },
  { name: 'White Folding Chair', category: 'Chair', dailyRate: 1.50, weeklyRate: 4.50, monthlyRate: 13.50, depositRequired: 0, taxable: true, location: '01 McAllen', unitStatus: 'available', condition: 'Good', bulkQuantity: 500 },
  { name: '6ft Round Table', category: 'Table', dailyRate: 8, weeklyRate: 24, monthlyRate: 72, depositRequired: 0, taxable: true, location: '01 McAllen', unitStatus: 'available', condition: 'Good', bulkQuantity: 150 },
  { name: '8ft Rectangular Table', category: 'Table', dailyRate: 10, weeklyRate: 30, monthlyRate: 90, depositRequired: 0, taxable: true, location: '01 McAllen', unitStatus: 'available', condition: 'Good', bulkQuantity: 100 },
  { name: 'Portable Generator 5000W', category: 'Generator', dailyRate: 95, weeklyRate: 285, monthlyRate: 855, depositRequired: 200, taxable: true, location: '01 McAllen', unitStatus: 'available', condition: 'Good' },
  { name: 'Portable Generator 10000W', category: 'Generator', dailyRate: 150, weeklyRate: 450, monthlyRate: 1350, depositRequired: 300, taxable: true, location: '01 McAllen', unitStatus: 'available', condition: 'Good' },
  { name: 'Dance Floor 12x12', category: 'Dance Floor', dailyRate: 120, weeklyRate: 360, monthlyRate: 1080, depositRequired: 250, taxable: true, location: '01 McAllen', unitStatus: 'available', condition: 'Good' },
  { name: 'Stage 4x8 Platform', category: 'Staging', dailyRate: 45, weeklyRate: 135, monthlyRate: 405, depositRequired: 150, taxable: true, location: '01 McAllen', unitStatus: 'available', condition: 'Good', bulkQuantity: 20 },
  { name: 'Barricade 8ft', category: 'Other', dailyRate: 12, weeklyRate: 36, monthlyRate: 108, depositRequired: 50, taxable: true, location: '01 McAllen', unitStatus: 'available', condition: 'Good', bulkQuantity: 100 },
  { name: 'Skid Steer S160', category: 'Skid Steer', dailyRate: 225, weeklyRate: 675, monthlyRate: 2025, depositRequired: 500, taxable: true, location: '01 McAllen', unitStatus: 'available', condition: 'Good' },
  { name: 'Mini Excavator U27', category: 'Excavator', dailyRate: 275, weeklyRate: 825, monthlyRate: 2475, depositRequired: 750, taxable: true, location: '01 McAllen', unitStatus: 'available', condition: 'Good' },
  { name: 'Plate Compactor', category: 'Plate Compactor', dailyRate: 65, weeklyRate: 195, monthlyRate: 585, depositRequired: 150, taxable: true, location: '01 McAllen', unitStatus: 'available', condition: 'Good' },
  { name: 'Concrete Mixer 9cuft', category: 'Concrete Mixer', dailyRate: 85, weeklyRate: 255, monthlyRate: 765, depositRequired: 200, taxable: true, location: '01 McAllen', unitStatus: 'available', condition: 'Good' },
  { name: 'Pressure Washer 4000PSI', category: 'Pressure Washer', dailyRate: 75, weeklyRate: 225, monthlyRate: 675, depositRequired: 150, taxable: true, location: '01 McAllen', unitStatus: 'available', condition: 'Good' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Step 1: Delete all real personal data
    const customers = await base44.entities.Customer.list();
    const employees = await base44.entities.UserRoster.list();
    const rentals = await base44.entities.Rental.list();
    const deliveries = await base44.entities.Delivery.list();
    const recoveries = await base44.entities.Recovery.list();

    let deletedCount = 0;

    // Delete rentals first (has FK constraints)
    for (const rental of rentals) {
      await base44.entities.Rental.delete(rental.id);
      deletedCount++;
    }

    // Delete deliveries
    for (const delivery of deliveries) {
      await base44.entities.Delivery.delete(delivery.id);
      deletedCount++;
    }

    // Delete recoveries
    for (const recovery of recoveries) {
      await base44.entities.Recovery.delete(recovery.id);
      deletedCount++;
    }

    // Delete customers
    for (const customer of customers) {
      await base44.entities.Customer.delete(customer.id);
      deletedCount++;
    }

    // Delete employees
    for (const employee of employees) {
      await base44.entities.UserRoster.delete(employee.id);
      deletedCount++;
    }

    // Step 2: Seed fake customers
    const createdCustomers = [];
    for (const cust of FAKE_CUSTOMERS) {
      const created = await base44.entities.Customer.create(cust);
      createdCustomers.push(created);
    }

    // Step 3: Seed fake employees
    for (const emp of FAKE_EMPLOYEES) {
      await base44.entities.UserRoster.create(emp);
    }

    // Step 4: Seed fake equipment (only if equipment is empty)
    const existingEquipment = await base44.entities.Equipment.list();
    if (existingEquipment.length === 0) {
      for (const equip of FAKE_EQUIPMENT) {
        await base44.entities.Equipment.create(equip);
      }
    }

    return Response.json({
      message: 'Demo data seeded successfully',
      deletedRealRecords: deletedCount,
      createdCustomers: createdCustomers.length,
      createdEmployees: FAKE_EMPLOYEES.length,
      createdEquipment: existingEquipment.length === 0 ? FAKE_EQUIPMENT.length : 0,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});