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
    if (!settings.length || settings[0].activeProcessor !== 'paypal' || !settings[0].paypalClientId) {
      return Response.json({ error: 'PayPal not configured' }, { status: 400 });
    }

    const paypalSettings = settings[0];

    switch (action) {
      case 'createOrder':
        return handleCreateOrder(paypalSettings, payload);
      case 'captureOrder':
        return handleCaptureOrder(paypalSettings, payload);
      case 'refund':
        return handleRefund(paypalSettings, payload);
      case 'getStatus':
        return handleGetStatus(paypalSettings, payload);
      case 'createCustomer':
        return handleCreateCustomer(paypalSettings, payload);
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[paypalPaymentHandler]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleCreateOrder(paypalSettings, payload) {
  const { amount, currency, customerId, description } = payload;

  return Response.json({
    id: `pp-order-${Date.now()}`,
    approvalUrl: `https://www.paypal.com/checkoutnow?token=EC-...`,
    status: 'pending',
  });
}

async function handleCaptureOrder(paypalSettings, payload) {
  const { orderId } = payload;

  return Response.json({
    id: orderId,
    status: 'completed',
  });
}

async function handleRefund(paypalSettings, payload) {
  const { transactionId, amount } = payload;

  return Response.json({
    id: `pp-refund-${Date.now()}`,
    status: 'completed',
  });
}

async function handleGetStatus(paypalSettings, payload) {
  const { transactionId } = payload;

  return Response.json({
    id: transactionId,
    status: 'unknown',
  });
}

async function handleCreateCustomer(paypalSettings, payload) {
  const { email, name, phone } = payload;

  return Response.json({
    id: `pp-customer-${Date.now()}`,
  });
}