import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all CproContact records
    const contacts = await base44.entities.CproContact.list('', 50000);
    
    if (!contacts || contacts.length === 0) {
      return Response.json({ success: true, migratedCount: 0, message: 'No CproContact records found' });
    }

    console.log(`[Migration] Starting conversion of ${contacts.length} CproContact records...`);

    // Transform contacts into customer records
    const customers = contacts.map(contact => ({
      fullName: contact.fullName || '',
      companyName: contact.companyName || '',
      phone: contact.phone || '',
      email: contact.email || '',
      address: contact.address || '',
      city: contact.city || '',
      state: contact.state || '',
      zip: contact.zipCode || '',
      notes: contact.notes || '',
      source: 'cpro_import',
      totalRentals: 0,
      totalSpend: 0,
    }));

    // Bulk create in batches of 500
    let migratedCount = 0;
    const batchSize = 500;

    for (let i = 0; i < customers.length; i += batchSize) {
      const batch = customers.slice(i, i + batchSize);
      
      try {
        await base44.entities.Customer.bulkCreate(batch);
        migratedCount += batch.length;
        console.log(`[Migration] Migrated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(customers.length / batchSize)} (${migratedCount} total)`);
        
        // Throttle between batches
        if (i + batchSize < customers.length) {
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch (err) {
        console.error(`[Migration] Batch failed: ${err.message}`);
        throw err;
      }
    }

    console.log(`[Migration] Complete! Migrated ${migratedCount} customers.`);
    return Response.json({ success: true, migratedCount, totalContacts: contacts.length });

  } catch (error) {
    console.error(`[Migration] Error: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});