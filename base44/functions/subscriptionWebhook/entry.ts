import Stripe from 'npm:stripe@14';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

  const base44 = createClientFromRequest(req);

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.mode !== 'subscription') return Response.json({ ok: true });

      const userId = session.metadata?.base44_user_id;
      const tier = session.metadata?.tier;
      const subscriptionId = session.subscription;

      if (userId && tier) {
        await base44.asServiceRole.entities.User.update(userId, {
          subscriptionTier: tier,
          subscriptionStatus: 'active',
          stripeSubscriptionId: subscriptionId,
        });
        console.log(`[subscriptionWebhook] Activated ${tier} for user ${userId}`);
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object;
      const userId = sub.metadata?.base44_user_id;
      if (userId) {
        const status = sub.status; // active, past_due, cancelled, etc.
        await base44.asServiceRole.entities.User.update(userId, {
          subscriptionStatus: status,
          ...(status === 'canceled' ? { subscriptionTier: 'core' } : {}),
        });
        console.log(`[subscriptionWebhook] Updated subscription status to ${status} for user ${userId}`);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const userId = sub.metadata?.base44_user_id;
      if (userId) {
        await base44.asServiceRole.entities.User.update(userId, {
          subscriptionTier: 'core',
          subscriptionStatus: 'cancelled',
          stripeSubscriptionId: null,
        });
        console.log(`[subscriptionWebhook] Downgraded user ${userId} to core`);
      }
    }

  } catch (err) {
    console.error('[subscriptionWebhook] processing error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }

  return Response.json({ ok: true });
});