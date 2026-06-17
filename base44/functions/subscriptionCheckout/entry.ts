import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const APP_DOMAIN = 'https://theprojectair.com';

const PLANS = {
  core: {
    name: 'AIR Core',
    description: 'Essential rental operations with AI included. 1 branch, unlimited users.',
    amount: 29900, // $299/mo
  },
  pro: {
    name: 'AIR Pro',
    description: 'Multi-location operations with shop management, GPS tracking, and advanced analytics. Up to 3 branches.',
    amount: 79900, // $799/mo
  },
  custom: {
    name: 'AIR Custom',
    description: 'Regional operations with government bidding, advanced load planning, and dedicated support. Up to 10 branches.',
    amount: 149900, // $1,499/mo
  },
};

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Auth via Bearer token from Supabase session
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    let userId, userEmail;

    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      userId = user.id;
      userEmail = user.email;
    } else {
      // Fallback: accept from body (called from frontend via base44 functions.invoke)
      const body = await req.json();
      userId = body.supabaseUserId;
      userEmail = body.email;
      if (!userId || !userEmail) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = token ? await req.json() : undefined;
    const { tier, successUrl, cancelUrl } = body || {};

    if (!PLANS[tier]) {
      return Response.json({ error: 'Invalid tier. Must be core, pro, or custom.' }, { status: 400 });
    }

    const plan = PLANS[tier];
    const resolvedSuccessUrl = successUrl || `${APP_DOMAIN}/ops?checkout=success`;
    const resolvedCancelUrl  = cancelUrl  || `${APP_DOMAIN}/ops?checkout=cancelled`;

    // Look up or create Stripe customer keyed to Supabase user
    const { data: trial } = await supabase
      .from('subscriber_trials')
      .select('stripe_customer_id')
      .eq('email', userEmail)
      .maybeSingle();

    let customerId = trial?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
      await supabase
        .from('subscriber_trials')
        .update({ stripe_customer_id: customerId })
        .eq('email', userEmail);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: plan.name, description: plan.description },
          unit_amount: plan.amount,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      success_url: resolvedSuccessUrl,
      cancel_url: resolvedCancelUrl,
      client_reference_id: userId,
      customer_email: customerId ? undefined : userEmail,
      metadata: {
        supabase_user_id: userId,
        tier,
      },
      subscription_data: {
        metadata: { supabase_user_id: userId, tier },
      },
    });

    console.log(`[subscriptionCheckout] Created ${tier} session ${session.id} for ${userEmail}`);
    return Response.json({ url: session.url });

  } catch (error) {
    console.error('[subscriptionCheckout] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});