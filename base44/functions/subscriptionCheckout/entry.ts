import Stripe from 'npm:stripe@14';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { tier, returnPath } = body;

    if (!PLANS[tier]) {
      return Response.json({ error: 'Invalid tier. Must be pro or security_plus.' }, { status: 400 });
    }

    const plan = PLANS[tier];
    const successUrl = `${APP_DOMAIN}${returnPath || '/aireports'}?subscribed=${tier}`;
    const cancelUrl = `${APP_DOMAIN}${returnPath || '/aireports'}`;

    // Create or reuse Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: { base44_user_id: user.id, base44_app_id: Deno.env.get('BASE44_APP_ID') },
      });
      customerId = customer.id;
      await base44.auth.updateMe({ stripeCustomerId: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: plan.name,
            description: plan.description,
          },
          unit_amount: plan.amount,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        base44_user_id: user.id,
        tier,
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          base44_user_id: user.id,
          tier,
        },
      },
    });

    console.log(`[subscriptionCheckout] Created ${tier} session ${session.id} for ${user.email}`);
    return Response.json({ url: session.url });

  } catch (error) {
    console.error('[subscriptionCheckout] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});