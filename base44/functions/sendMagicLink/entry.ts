import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { Resend } from 'npm:resend@2.0.0';

Deno.serve(async (req) => {
  try {
    const { email } = await req.json();
    
    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Invalid email' }, { status: 400 });
    }

    // Generate Supabase magic link
    const base44 = createClientFromRequest(req);
    const supabase = createClientFromRequest(req).asServiceRole;
    
    const redirectUrl = Deno.env.get('BASE_URL') || 'https://theprojectair.com';
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: { redirectTo: `${redirectUrl}/auth/callback` },
    });
    
    const magicLink = linkData?.properties?.action_link || `${redirectUrl}/signin`;
    if (linkErr) console.warn('[sendMagicLink] generateLink failed:', linkErr.message);
    
    // Send email via Resend
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }
    
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: 'AIR by Lupine <info@theprojectair.com>',
      to: [email],
      subject: '🔑 Your Magic Login Link',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#f1f5f9;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:32px;text-align:center">
            <h1 style="margin:0;font-size:28px;font-weight:900;color:#fff">Your Login Link</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:16px">Click below to sign in — no password needed</p>
          </div>
          <div style="padding:32px">
            <div style="text-align:center;margin:28px 0">
              <a href="${magicLink}"
                 style="background:#0ea5e9;color:#000;font-weight:900;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;display:inline-block">
                Sign In →
              </a>
              <p style="color:#475569;font-size:12px;margin-top:10px">Link expires in 24 hours.</p>
            </div>
            <p style="color:#475569;font-size:12px;text-align:center">
              If you didn't request this, you can safely ignore this email.
            </p>
          </div>
        </div>
      `,
    });

    return Response.json({ success: true, message: `Magic link sent to ${email}` });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});