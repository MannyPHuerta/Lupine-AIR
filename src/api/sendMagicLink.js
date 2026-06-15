/* eslint-disable no-undef */
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
    res.status(200).end();
    return;
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { email } = req.body;
    
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'Invalid email address' });
      return;
    }

    console.log('[sendMagicLink] Processing request for:', email);
    
    // Call the Base44 backend function
    const baseUrl = process.env.BASE44_BASE_URL || 'https://dev.base44.com';
    const appId = process.env.VITE_BASE44_APP_ID;
    
    if (!appId) {
      console.error('[sendMagicLink] Missing VITE_BASE44_APP_ID');
      res.status(500).json({ error: 'Configuration error: missing app ID' });
      return;
    }
    
    const targetUrl = `${baseUrl}/api/apps/${appId}/functions/sendMagicLink`;
    console.log('[sendMagicLink] Calling:', targetUrl);
    
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    let result;
    try {
      result = await response.json();
    } catch {
      result = { text: await response.text() };
    }
    
    console.log('[sendMagicLink] Response status:', response.status);
    console.log('[sendMagicLink] Response:', result);
    
    if (!response.ok) {
      throw new Error(result.error || `Failed with status ${response.status}`);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('[sendMagicLink] Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}