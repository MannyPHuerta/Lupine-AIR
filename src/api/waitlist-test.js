// @ts-check
/* global process */
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action } = req.body;

  // Direct Supabase test
  if (action === 'test-insert') {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    const testEmail = `test_${Date.now()}@example.com`;
    console.log('[test] Inserting test entry:', testEmail);
    
    const { data, error } = await supabase
      .from('waitlist_entries')
      .insert({ email: testEmail, status: 'pending' })
      .select()
      .single();
    
    if (error) {
      console.error('[test] Insert failed:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
    
    console.log('[test] ✓ Inserted:', data.id);
    return res.status(200).json({ success: true, id: data.id, email: testEmail });
  }

  // Direct query test
  if (action === 'test-query') {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    const { data, error } = await supabase
      .from('waitlist_entries')
      .select('id, email, status')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('[test] Query failed:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
    
    return res.status(200).json({ success: true, count: data?.length || 0, entries: data });
  }

  return res.status(400).json({ error: 'Unknown action. Use test-insert or test-query' });
}