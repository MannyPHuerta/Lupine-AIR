import { createClient } from 'npm:@supabase/supabase-js@2';
import { Resend } from 'npm:resend@2.0.0';

Deno.serve(async (req) => {
  try {
    const { entryId, adminEmail } = await req.json();
    
    const sb = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );
    
    // Get waitlist entry
    const { data: entry, error: entryErr } = await sb
      .from('waitlist_entries')
      .select('*')
      .eq('id', entryId)
      .single();
    
    if (entryErr || !entry) {
      return Response.json({ error: 'Entry not found' }, { status: 404 });
    }
    
    // Generate Supabase magic link with demo flag
    const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
      type: 'magiclink',
      email: entry.email,
      options: { redirectTo: 'https://theprojectair.com/onboarding?demo=true' },
    });
    
    const demoLink = linkData?.properties?.action_link || 'https://theprojectair.com/signin';
    if (linkErr) console.warn('[grantDemoAccess] generateLink failed:', linkErr.message);
    
    // Send demo access email via Resend
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }
    
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: 'AIR by Lupine <info@theprojectair.com>',
      to: [entry.email],
      subject: `🎬 Your AIR Demo is Ready — Start Exploring`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#f1f5f9;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:32px;text-align:center">
            <h1 style="margin:0;font-size:28px;font-weight:900;color:#fff">Your Demo is Ready! 🎬</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:16px">Explore AIR with pre-loaded demo data</p>
          </div>
          <div style="padding:32px">
            <p style="color:#94a3b8;line-height:1.7">Hi ${entry.name || 'there'},</p>
            <p style="color:#cbd5e1;line-height:1.7">
              Your interactive demo of <strong style="color:#0ea5e9">AIR by Lupine</strong> is ready. 
              We've pre-loaded sample equipment, customers, and rentals so you can explore immediately.
            </p>
            <div style="text-align:center;margin:28px 0">
              <a href="${demoLink}"
                 style="background:#0ea5e9;color:#000;font-weight:900;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;display:inline-block">
                Start Your Demo →
              </a>
              <p style="color:#475569;font-size:12px;margin-top:10px">No credit card required. Demo lasts 24 hours.</p>
            </div>
            <div style="background:#1e293b;border-radius:10px;padding:20px;margin:20px 0">
              <strong style="color:#f1f5f9;display:block;margin-bottom:12px">What you can explore:</strong>
              <ul style="color:#94a3b8;margin:0;padding-left:20px;line-height:1.8">
                <li>Counter operations & rental creation</li>
                <li>Equipment availability calendar</li>
                <li>Event planning canvas</li>
                <li>AI-powered reports & insights</li>
                <li>Delivery dispatch board</li>
              </ul>
            </div>
            <p style="color:#475569;font-size:12px;margin-top:24px;text-align:center">
              Questions? Reply to this email — we're here.<br/>
              <a href="https://theprojectair.com" style="color:#0ea5e9">theprojectair.com</a>
            </p>
          </div>
        </div>
      `,
    });
    
    console.log(`[grantDemoAccess] Demo link sent to ${entry.email}`);
    
    return Response.json({ success: true, demoLink });
    
  } catch (error) {
    console.error('[grantDemoAccess] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});