/* global process */
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;
    
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;
    const baseUrl = process.env.BASE_URL || 'https://theprojectair.com';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: { 
        redirectTo: `${baseUrl}/auth/callback`,
        shouldSendEmail: false,
      },
    });
    
    if (linkError) {
      return res.status(500).json({ error: linkError.message });
    }
    
    const magicLink = linkData?.properties?.action_link
      || linkData?.properties?.email_otp_link
      || linkData?.action_link;
    
    if (!magicLink) {
      return res.status(500).json({ error: 'Failed to generate magic link — action_link was empty', debug: linkData });
    }
    
    // Send email via Resend
    if (resendApiKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: 'AIR by Lupine <info@theprojectair.com>',
          to: [email],
          subject: 'Your Magic Login Link',
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#f1f5f9;border-radius:12px;overflow:hidden">
              <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:32px;text-align:center">
                <h1 style="margin:0;font-size:28px;font-weight:900;color:#fff">Your Login Link</h1>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:16px">Click below to sign in</p>
              </div>
              <div style="padding:32px">
                <div style="text-align:center;margin:28px 0">
                  <a href="${magicLink}"
                     style="background:#0ea5e9;color:#000;font-weight:900;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;display:inline-block">
                    Sign In →
                  </a>
                </div>
              </div>
            </div>
          `,
        }),
      });
    }

    return res.status(200).json({ success: true, message: 'Magic link sent' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
