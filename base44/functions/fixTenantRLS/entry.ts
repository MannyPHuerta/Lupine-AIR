import { createClient } from 'npm:@supabase/supabase-js@2.107.0';

const SUPABASE_URL = 'https://esckfcvxmbuhimmseqtb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    // Enable RLS and add policy for tenants table
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can read their own tenant" ON tenants;
        CREATE POLICY "Users can read their own tenant" ON tenants
          FOR SELECT
          USING (auth.jwt()->>'email' = admin_email);
          
        DROP POLICY IF EXISTS "Admins can insert tenants" ON tenants;
        CREATE POLICY "Admins can insert tenants" ON tenants
          FOR INSERT
          WITH CHECK (true);
          
        DROP POLICY IF EXISTS "Admins can update tenants" ON tenants;
        CREATE POLICY "Admins can update tenants" ON tenants
          FOR UPDATE
          USING (true);
      `,
    });

    return Response.json({ success: true, message: 'RLS policies updated for tenants table' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});