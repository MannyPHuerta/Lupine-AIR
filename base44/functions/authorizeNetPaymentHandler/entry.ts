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
    if (!settings.length || settings[0].activeProcessor !== 'authorize_net' || !settings[0].authorizeNetApiKey) {
      return Response.json({ error: 'Authorize.Net not configured' }, { status: 400 });
    }

    const anSettings = settings[0];

    switch (action) {
      case 'createTransaction':
        return handleCreateTransaction(anSettings, payload);
      case 'priorAuthCapture':
        return handlePriorAuthCapture(anSettings, payload);
      case 'refund':
        return handleRefund(anSettings, payload);
      case 'getStatus':
        return handleGetStatus(anSettings, payload);
      case 'createCustomerProfile':
        return handleCreateCustomerProfile(anSettings, payload);
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[authorizeNetPaymentHandler]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleCreateTransaction(anSettings, payload) {
  const { amount, currency, customerId, description } = payload;

  return Response.json({
    transactionId: `${Date.now()}`,
    status: 'pending',
    amount,
  });
}

async function handlePriorAuthCapture(anSettings, payload) {
  const { transactionId } = payload;

  return Response.json({
    transactionId,
    status: 'captured',
  });
}

async function handleRefund(anSettings, payload) {
  const { transactionId, amount } = payload;

  return Response.json({
    transactionId: `refund-${Date.now()}`,
    status: 'completed',
  });
}

async function handleGetStatus(anSettings, payload) {
  const { transactionId } = payload;

  return Response.json({
    transactionId,
    status: 'unknown',
  });
}

async function handleCreateCustomerProfile(anSettings, payload) {
  const { email, name, phone } = payload;

  return Response.json({
    customerProfileId: `${Date.now()}`,
  });
}