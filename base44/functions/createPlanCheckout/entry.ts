import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { planId, customerEmail, appUrl } = body;

    if (!planId) {
      return Response.json({ error: 'planId is required' }, { status: 400 });
    }

    const origin = (appUrl && appUrl.startsWith('http')) ? appUrl : 'https://app.base44.com';

    console.log('[createPlanCheckout] planId:', planId, 'origin:', origin);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: customerEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'AIREvents Plan — Unlock',
              description: 'Save, print, and collaborate on your event layout plan.',
            },
            unit_amount: 2000,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/event-planner/${planId}?unlocked=1`,
      cancel_url: `${origin}/event-planner/${planId}`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        planId,
      },
    });

    console.log('[createPlanCheckout] session created:', session.id);
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('[createPlanCheckout] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});