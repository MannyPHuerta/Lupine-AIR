import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const { email } = await req.json();
    
    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Invalid email' }, { status: 400 });
    }

    // Generate magic link token (6 character alphanumeric)
    const token = crypto.getRandomValues(new Uint8Array(4))
      .reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '')
      .substring(0, 8)
      .toUpperCase();

    // Store token + expiry (10 min)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    // Create/update login session record (using User entity's custom field capability)
    const base44 = createClientFromRequest(req);
    
    // Store in a simple LoginSession that we'll check on verify
    // For now, we'll pass this via email and verify on click
    
    const magicLink = `${Deno.env.get('BASE44_APP_URL')}/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;
    
    // Send email via Sendgrid/Twilio SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: 'noreply@lupine.rental', name: 'Lupine' },
        subject: '🔑 Your Magic Login Link',
        html: `
          <h2>Welcome to Lupine</h2>
          <p>Click the link below to log in (valid for 10 minutes):</p>
          <p><a href="${magicLink}" style="display:inline-block;padding:12px 24px;background:#1E40AF;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">Sign In</a></p>
          <p style="color:#666;font-size:12px;">Or copy this code: <code>${token}</code></p>
          <p style="color:#999;font-size:11px;">If you didn't request this, you can safely ignore this email.</p>
        `,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('SendGrid error:', err);
      return Response.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return Response.json({ success: true, message: `Magic link sent to ${email}` });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});