import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const planId = body.planId;
    const customerEmail = body.customerEmail;
    const appUrl = body.appUrl;

    if (!planId) {
      return Response.json({ error: 'planId is required' }, { status: 400 });
    }

    const origin = String('https://app.base44.com');
    const successUrl = String(origin + '/event-planner/' + String(planId) + '?unlocked=1');
    const cancelUrl = String(origin + '/event-planner/' + String(planId));
    console.log('[checkout] typeof successUrl:', typeof successUrl, 'value:', successUrl);

    console.log('[checkout] planId:', planId, 'successUrl:', successUrl);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: customerEmail || undefined,
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

    console.log('[checkout] session:', session.id);
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('[checkout] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});