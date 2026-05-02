import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { deliveryId, messageType } = await req.json();

    const deliveries = await base44.entities.Delivery.list('-created_date', 200);
    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery) return Response.json({ error: 'Delivery not found' }, { status: 404 });

    const phone = delivery.customerPhone;
    if (!phone) return Response.json({ error: 'No customer phone on record' }, { status: 400 });

    const messages = {
      on_my_way: `Hi ${delivery.customerName}, your ${delivery.branch} delivery driver is on the way! They should arrive within the hour. Reply STOP to opt out.`,
      arrived: `Hi ${delivery.customerName}, your delivery driver has arrived at your location. Please come out to meet them. Reply STOP to opt out.`,
      completed: `Hi ${delivery.customerName}, your equipment delivery is complete. Thank you for choosing us! Reply STOP to opt out.`,
    };

    const body = messages[messageType];
    if (!body) return Response.json({ error: 'Invalid messageType' }, { status: 400 });

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const from = Deno.env.get('TWILIO_PHONE_NUMBER');

    const formData = new URLSearchParams();
    formData.append('To', phone);
    formData.append('From', from);
    formData.append('Body', body);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );

    const result = await response.json();
    if (!response.ok) return Response.json({ error: result.message }, { status: 500 });

    return Response.json({ success: true, sid: result.sid });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});