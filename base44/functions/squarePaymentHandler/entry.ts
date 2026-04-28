import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, payload } = await req.json();

    const settings = await base44.asServiceRole.entities.PaymentSettings.list();
    if (!settings.length || settings[0].activeProcessor !== 'square' || !settings[0].squareAccessToken) {
      return Response.json({ error: 'Square not configured' }, { status: 400 });
    }

    const squareSettings = settings[0];

    switch (action) {
      case 'createPayment':
        return handleCreatePayment(squareSettings, payload);
      case 'confirmPayment':
        return handleConfirmPayment(squareSettings, payload);
      case 'refundPayment':
        return handleRefundPayment(squareSettings, payload);
      case 'getPaymentStatus':
        return handleGetPaymentStatus(squareSettings, payload);
      case 'createCustomer':
        return handleCreateCustomer(squareSettings, payload);
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[squarePaymentHandler]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleCreatePayment(squareSettings, payload) {
  const { amount, currency, customerId, description } = payload;

  return Response.json({
    id: `square-payment-${Date.now()}`,
    status: 'pending',
    amount,
  });
}

async function handleConfirmPayment(squareSettings, payload) {
  const { transactionId } = payload;

  return Response.json({
    id: transactionId,
    status: 'confirmed',
  });
}

async function handleRefundPayment(squareSettings, payload) {
  const { transactionId, amount } = payload;

  return Response.json({
    id: `square-refund-${Date.now()}`,
    status: 'completed',
  });
}

async function handleGetPaymentStatus(squareSettings, payload) {
  const { transactionId } = payload;

  return Response.json({
    id: transactionId,
    status: 'unknown',
  });
}

async function handleCreateCustomer(squareSettings, payload) {
  const { email, name, phone } = payload;

  return Response.json({
    id: `square-customer-${Date.now()}`,
  });
}