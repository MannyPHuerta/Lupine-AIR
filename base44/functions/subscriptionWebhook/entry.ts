import Stripe from 'npm:stripe@14';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const body = await req.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error('[subscriptionWebhook] signature error:', err.message);
    return new Response('Webhook signature invalid', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.mode !== 'subscription') return Response.json({ ok: true });

      const userId    = session.metadata?.supabase_user_id || session.client_reference_id;
      const tier      = session.metadata?.tier;
      const subId     = session.subscription;
      const custId    = session.customer;

      if (!userId) {
        console.error('[subscriptionWebhook] No supabase_user_id in session metadata');
        return Response.json({ ok: true });
      }

      // Get the user's email from Supabase auth
      const { data: { user } } = await supabase.auth.admin.getUserById(userId);
      if (!user) {
        console.error('[subscriptionWebhook] User not found:', userId);
        return Response.json({ ok: true });
      }

      // Update subscriber_trials to active
      await supabase
        .from('subscriber_trials')
        .update({
          status: 'active',
          plan_tier: tier || 'pro',
          stripe_customer_id: custId,
          stripe_subscription_id: subId,
        })
        .eq('email', user.email);

      console.log(`[subscriptionWebhook] Activated ${tier} for ${user.email} (user ${userId})`);

      // TODO: Kick off Vercel provisioning here when ready
      // await triggerVercelProvision(userId, user.email, tier);
    }

    if (event.type === 'customer.subscription.updated') {
      const sub    = event.data.object;
      const userId = sub.metadata?.supabase_user_id;
      if (!userId) return Response.json({ ok: true });

      const { data: { user } } = await supabase.auth.admin.getUserById(userId);
      if (!user) return Response.json({ ok: true });

      const status = sub.status; // active, past_due, canceled, etc.
      await supabase
        .from('subscriber_trials')
        .update({
          status: status === 'active' ? 'active' : status === 'past_due' ? 'suspended' : status,
          plan_tier: status === 'canceled' ? 'core' : undefined,
        })
        .eq('email', user.email);

      console.log(`[subscriptionWebhook] Updated sub status to ${status} for ${user.email}`);
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub    = event.data.object;
      const userId = sub.metadata?.supabase_user_id;
      if (!userId) return Response.json({ ok: true });

      const { data: { user } } = await supabase.auth.admin.getUserById(userId);
      if (!user) return Response.json({ ok: true });

      await supabase
        .from('subscriber_trials')
        .update({
          status: 'cancelled',
          plan_tier: 'core',
          stripe_subscription_id: null,
        })
        .eq('email', user.email);

      console.log(`[subscriptionWebhook] Cancelled subscription for ${user.email}`);
    }

  } catch (err) {
    console.error('[subscriptionWebhook] processing error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }

  return Response.json({ ok: true });
});