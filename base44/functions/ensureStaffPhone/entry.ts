import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { email, phone } = await req.json();
    
    if (!email || !phone) {
      return Response.json({ error: 'Email and phone required' }, { status: 400 });
    }

    // Format phone as +1XXXXXXXXXX
    const formattedPhone = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`;

    // Check if exists
    const existing = await base44.entities.StaffPhone.filter({ email });
    
    if (existing.length > 0) {
      // Update
      await base44.entities.StaffPhone.update(existing[0].id, { phone: formattedPhone });
      return Response.json({ success: true, action: 'updated', email, phone: formattedPhone });
    } else {
      // Create
      await base44.entities.StaffPhone.create({ email, phone: formattedPhone });
      return Response.json({ success: true, action: 'created', email, phone: formattedPhone });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});