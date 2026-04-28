import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@16.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, payload } = await req.json();

    // Fetch payment settings
    const settings = await base44.asServiceRole.entities.PaymentSettings.list();
    if (!settings.length || settings[0].activeProcessor !== 'stripe' || !settings[0].stripeApiKey) {
      return Response.json({ error: 'Stripe not configured' }, { status: 400 });
    }

    const stripe = new Stripe(settings[0].stripeApiKey);

    // Handle different actions
    switch (action) {
      case 'createPaymentIntent':
        return handleCreatePaymentIntent(stripe, payload);
      case 'confirmPayment':
        return handleConfirmPayment(stripe, payload);
      case 'refundPayment':
        return handleRefundPayment(stripe, payload);
      case 'getPaymentStatus':
        return handleGetPaymentStatus(stripe, payload);
      case 'createCustomer':
        return handleCreateCustomer(stripe, payload);
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[stripePaymentHandler]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleCreatePaymentIntent(stripe, payload) {
  const { amount, currency = 'usd', customerId, description, metadata = {} } = payload;
  
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency,
    customer: customerId,
    description,
    metadata,
  });

  return Response.json({
    id: intent.id,
    client_secret: intent.client_secret,
    status: intent.status,
  });
}

async function handleConfirmPayment(stripe, payload) {
  const { paymentIntentId, paymentMethod } = payload;
  
  const intent = await stripe.paymentIntents.confirm(paymentIntentId, {
    payment_method: paymentMethod,
  });

  return Response.json({
    id: intent.id,
    status: intent.status,
  });
}

async function handleRefundPayment(stripe, payload) {
  const { paymentIntentId, amount } = payload;
  
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amount ? Math.round(amount * 100) : undefined,
  });

  return Response.json({
    id: refund.id,
    status: refund.status,
  });
}

async function handleGetPaymentStatus(stripe, payload) {
  const { paymentIntentId } = payload;
  
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

  return Response.json({
    id: intent.id,
    status: intent.status,
    amount: intent.amount / 100,
    currency: intent.currency,
  });
}

async function handleCreateCustomer(stripe, payload) {
  const { email, name, phone } = payload;
  
  const customer = await stripe.customers.create({
    email,
    name,
    phone,
  });

  return Response.json({ id: customer.id });
}