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
    if (!settings.length || settings[0].activeProcessor !== 'amazon_pay' || !settings[0].amazonPayMerchantId) {
      return Response.json({ error: 'Amazon Pay not configured' }, { status: 400 });
    }

    const apSettings = settings[0];

    switch (action) {
      case 'createCharge':
        return handleCreateCharge(apSettings, payload);
      case 'confirmCharge':
        return handleConfirmCharge(apSettings, payload);
      case 'refund':
        return handleRefund(apSettings, payload);
      case 'getStatus':
        return handleGetStatus(apSettings, payload);
      case 'createBuyer':
        return handleCreateBuyer(apSettings, payload);
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[amazonPayPaymentHandler]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleCreateCharge(apSettings, payload) {
  const { amount, currency, customerId, description } = payload;

  return Response.json({
    chargeId: `ap-charge-${Date.now()}`,
    status: 'pending',
    amount,
  });
}

async function handleConfirmCharge(apSettings, payload) {
  const { chargeId } = payload;

  return Response.json({
    chargeId,
    status: 'completed',
  });
}

async function handleRefund(apSettings, payload) {
  const { chargeId, amount } = payload;

  return Response.json({
    refundId: `ap-refund-${Date.now()}`,
    status: 'completed',
  });
}

async function handleGetStatus(apSettings, payload) {
  const { chargeId } = payload;

  return Response.json({
    chargeId,
    status: 'unknown',
  });
}

async function handleCreateBuyer(apSettings, payload) {
  const { email, name, phone } = payload;

  return Response.json({
    buyerId: `ap-buyer-${Date.now()}`,
  });
}