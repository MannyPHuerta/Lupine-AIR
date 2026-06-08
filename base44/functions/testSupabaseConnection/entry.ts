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

    // Test 1: Basic connectivity — list tables in public schema
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(50);

    // Test 2: Try a raw RPC ping (works even with no tables)
    const { data: pingData, error: pingError } = await supabase.rpc('version');

    // Fallback: try selecting from pg_tables via rpc if direct query fails
    let tableList = [];
    let tableError = null;

    if (tablesError) {
      // Try alternate approach
      const { data: altTables, error: altError } = await supabase
        .rpc('get_table_names')
        .select('*');
      tableError = altError?.message || tablesError.message;
    } else {
      tableList = (tables || []).map(t => t.table_name);
    }

    return Response.json({
      success: true,
      connected: true,
      supabaseUrl: supabaseUrl.replace(/https?:\/\//, '').split('.')[0] + '.supabase.co',
      tableCount: tableList.length,
      tables: tableList,
      tableError,
      ping: pingError ? null : pingData,
      pingError: pingError?.message || null,
    });

  } catch (error) {
    return Response.json({ success: false, connected: false, error: error.message }, { status: 500 });
  }
});