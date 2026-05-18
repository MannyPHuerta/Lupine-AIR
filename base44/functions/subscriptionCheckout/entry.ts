import Stripe from 'npm:stripe@14';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const APP_DOMAIN = 'https://lupine-one.base44.app';

const PLANS = {
  pro: {
    name: 'AIR Pro',
    description: 'Fraud Intelligence tab, Benford\'s Law analysis, weekly fraud digest emails.',
    amount: 4900, // $49/mo
    features: ['Fraud Intel tab (Benford\'s Law, threshold clustering)', 'Weekly Fraud Digest email to all admins', 'Employee void & discount rate monitoring'],
  },
  security_plus: {
    name: 'AIR Security+',
    description: 'Everything in Pro plus GPS tracking integration, geofence alerts, theft intelligence, and boundary vigilance.',
    amount: 9900, // $99/mo
    features: ['Everything in Pro', 'GPS provider integrations (Samsara, Geotab, etc.)', 'Real-time geofence breach SMS & email alerts', 'Night movement & speed anomaly detection', 'Theft Intelligence & Boundary Vigilance panels', 'ThreatWatch with DL verification'],
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