import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const body = await req.json();
  const planId = String(body.planId || '');
  const customerEmail = body.customerEmail || undefined;

  if (!planId) {
    return Response.json({ error: 'planId is required' }, { status: 400 });
  }

  const appDomain = 'https://lupine-one.base44.app';
  const successUrl = appDomain + '/event-planner/' + planId + '?unlocked=1';
  const cancelUrl = appDomain + '/event-planner/' + planId;

  console.log('[unlockEventPlan] creating session for planId:', planId);
  console.log('[unlockEventPlan] successUrl:', successUrl);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: customerEmail,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'AIREvents Plan Unlock',
            description: 'Save and collaborate on your event layout.',
          },
          unit_amount: 2000,
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      base44_app_id: Deno.env.get('BASE44_APP_ID'),
      planId: planId,
    },
  });

  console.log('[unlockEventPlan] session created:', session.id);
  return Response.json({ url: session.url });
});