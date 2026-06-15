/* eslint-disable no-undef */
export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  // Allow CORS for preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    // Call the Base44 backend function via HTTP
    const baseUrl = process.env.BASE44_BASE_URL || 'https://dev.base44.com';
    const appId = process.env.VITE_BASE44_APP_ID;
    
    console.log('[sendMagicLink] Calling Base44 function:', { baseUrl, appId, email });
    
    const response = await fetch(`${baseUrl}/api/apps/${appId}/functions/sendMagicLink`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const result = await response.json();
    console.log('[sendMagicLink] Base44 response:', result);
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send magic link');
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in sendMagicLink API:', error);
    return res.status(500).json({ error: error.message });
  }
}