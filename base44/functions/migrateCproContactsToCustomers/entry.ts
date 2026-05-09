import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all CproContact records with pagination (smaller limits to avoid timeouts)
    let allContacts = [];
    let offset = 0;
    const limit = 500;  // Reduced from 1000 to 500
    let batch;
    
    do {
      batch = await base44.entities.CproContact.list('-created_date', limit, offset);
      if (batch && batch.length > 0) {
        allContacts = allContacts.concat(batch);
        offset += limit;
        console.log(`[Migration] Fetched ${allContacts.length} records so far...`);
        // Small delay between fetches to prevent overwhelming the DB
        await new Promise(r => setTimeout(r, 200));
      } else {
        break;
      }
    } while (batch && batch.length === limit);
    
    if (!allContacts || allContacts.length === 0) {
      return Response.json({ success: true, migratedCount: 0, message: 'No CproContact records found' });
    }

    console.log(`[Migration] Starting conversion of ${allContacts.length} CproContact records...`);

    // Transform contacts into customer records
    const customers = allContacts.map(contact => ({
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

    // Bulk create in very small batches with aggressive throttling
    let migratedCount = 0;
    const batchSize = 100;  // Much smaller batches

    for (let i = 0; i < customers.length; i += batchSize) {
      const batch = customers.slice(i, i + batchSize);
      
      try {
        await base44.entities.Customer.bulkCreate(batch);
        migratedCount += batch.length;
        console.log(`[Migration] Migrated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(customers.length / batchSize)} (${migratedCount} total)`);
        
        // Aggressive throttle to prevent gateway timeouts
        if (i + batchSize < customers.length) {
          await new Promise(r => setTimeout(r, 2500));
        }
      } catch (err) {
        console.error(`[Migration] Batch failed at ${migratedCount} records: ${err.message}`);
        throw err;
      }
    }

    console.log(`[Migration] Complete! Migrated ${migratedCount} customers.`);
    return Response.json({ success: true, migratedCount, totalContacts: allContacts.length });

  } catch (error) {
    console.error(`[Migration] Error: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});