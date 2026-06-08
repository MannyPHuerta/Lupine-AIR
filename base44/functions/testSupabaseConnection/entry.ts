import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY secrets' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use the Supabase REST API directly to list tables via pg_catalog
    // (information_schema queries via .from() are blocked by RLS)
    const tablesRes = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_tables`,
      { method: 'POST', headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' }, body: '{}' }
    );

    // Fallback: try a known table (equipment) to confirm schema exists
    const { data: equipmentSample, error: equipmentError } = await supabase
      .from('equipment')
      .select('id, name')
      .limit(1);

    const { data: customerSample, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .limit(1);

    const { data: rentalSample, error: rentalError } = await supabase
      .from('rentals')
      .select('id')
      .limit(1);

    // Build table status list by probing known tables
    const knownTables = [
      'equipment', 'customers', 'rentals', 'deliveries', 'work_orders',
      'maintenance_logs', 'expenses', 'event_plans', 'profiles', 'audit_logs',
      'timesheets', 'gps_providers', 'recurring_rentals', 'rto_payments',
      'reports', 'rfq_records', 'branch_settings', 'company_settings',
    ];

    const tableChecks = await Promise.all(
      knownTables.map(async (t) => {
        const { error } = await supabase.from(t).select('id').limit(1);
        // "no rows" is fine — only flag if table doesn't exist
        const exists = !error || error.code !== '42P01';
        return { table: t, exists, error: exists ? null : error?.message };
      })
    );

    const foundTables = tableChecks.filter(t => t.exists).map(t => t.table);
    const missingTables = tableChecks.filter(t => !t.exists).map(t => t.table);

    return Response.json({
      success: true,
      connected: true,
      supabaseUrl: supabaseUrl.replace(/https?:\/\//, '').split('.')[0] + '.supabase.co',
      tableCount: foundTables.length,
      tables: foundTables,
      missingTables,
    });

  } catch (error) {
    return Response.json({ success: false, connected: false, error: error.message }, { status: 500 });
  }
});