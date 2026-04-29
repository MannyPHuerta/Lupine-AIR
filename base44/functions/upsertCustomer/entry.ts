import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Upsert a Customer record from rental form data.
 * Matches by email (preferred) or full name.
 * Creates new record if not found; updates contact info if found.
 * Returns { customerId, created }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fullName, email, phone, address, city, state, zip, branch } = await req.json();

    if (!fullName) {
      return Response.json({ error: 'fullName is required' }, { status: 400 });
    }

    // Try to find existing customer by email first, then by name
    let existing = null;

    if (email) {
      const byEmail = await base44.asServiceRole.entities.Customer.filter({ email });
      if (byEmail.length > 0) existing = byEmail[0];
    }

    if (!existing) {
      const byName = await base44.asServiceRole.entities.Customer.filter({ fullName });
      if (byName.length > 0) existing = byName[0];
    }

    if (existing) {
      // Update contact info if any fields are missing on the record
      const updates = {};
      if (!existing.phone && phone) updates.phone = phone;
      if (!existing.email && email) updates.email = email;
      if (!existing.address && address) updates.address = address;
      if (!existing.city && city) updates.city = city;
      if (!existing.state && state) updates.state = state;
      if (!existing.zip && zip) updates.zip = zip;
      if (!existing.preferredBranch && branch) updates.preferredBranch = branch;

      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.Customer.update(existing.id, updates);
      }

      return Response.json({ customerId: existing.id, created: false });
    }

    // Create new customer
    const newCustomer = await base44.asServiceRole.entities.Customer.create({
      fullName,
      email: email || '',
      phone: phone || '',
      address: address || '',
      city: city || '',
      state: state || '',
      zip: zip || '',
      preferredBranch: branch || '',
      accountType: 'individual',
      paymentTerms: 'due_on_receipt',
      source: 'rental_form',
    });

    return Response.json({ customerId: newCustomer.id, created: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});