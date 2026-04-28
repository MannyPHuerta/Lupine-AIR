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
    if (!settings.length || settings[0].activeProcessor !== 'wise' || !settings[0].wiseApiToken) {
      return Response.json({ error: 'Wise not configured' }, { status: 400 });
    }

    const wiseSettings = settings[0];

    switch (action) {
      case 'createTransfer':
        return handleCreateTransfer(wiseSettings, payload);
      case 'confirmTransfer':
        return handleConfirmTransfer(wiseSettings, payload);
      case 'cancelTransfer':
        return handleCancelTransfer(wiseSettings, payload);
      case 'getStatus':
        return handleGetStatus(wiseSettings, payload);
      case 'createRecipient':
        return handleCreateRecipient(wiseSettings, payload);
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[wisePaymentHandler]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleCreateTransfer(wiseSettings, payload) {
  const { amount, currency, customerId, description } = payload;

  return Response.json({
    transferId: `wise-transfer-${Date.now()}`,
    status: 'pending',
    amount,
  });
}

async function handleConfirmTransfer(wiseSettings, payload) {
  const { transferId } = payload;

  return Response.json({
    transferId,
    status: 'processing',
  });
}

async function handleCancelTransfer(wiseSettings, payload) {
  const { transferId, amount } = payload;

  return Response.json({
    cancelId: `wise-cancel-${Date.now()}`,
    status: 'cancelled',
  });
}

async function handleGetStatus(wiseSettings, payload) {
  const { transferId } = payload;

  return Response.json({
    transferId,
    status: 'unknown',
  });
}

async function handleCreateRecipient(wiseSettings, payload) {
  const { email, name, phone } = payload;

  return Response.json({
    recipientId: `wise-recipient-${Date.now()}`,
  });
}