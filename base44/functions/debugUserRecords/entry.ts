import { createClient } from 'npm:@supabase/supabase-js@2.107.0';

const SUPABASE_URL = 'https://esckfcvxmbuhimmseqtb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    const email = 'manny@rentalworld.com';

    // Check all related tables
    const [waitlist, trials, tenants] = await Promise.all([
      supabase
        .from('waitlist_entries')
        .select('*')
        .eq('email', email),
      supabase
        .from('subscriber_trials')
        .select('*')
        .eq('email', email),
      supabase
        .from('tenants')
        .select('*')
        .eq('admin_email', email),
    ]);

    return Response.json({
      waitlist: waitlist.data,
      trials: trials.data,
      tenants: tenants.data,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});