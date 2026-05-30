import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@16.0.0';

// Creates a $1 authorization hold to validate the card, then creates a Rental record.
// The $1 hold is intentionally NOT captured — it's released within 7 days automatically.
// Staff can optionally charge the full amount later from the counter.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Public endpoint — no auth required for store customers

    const { paymentMethodId, equipment, startDate, endDate, days, totalAmount, delivery, customerName, customerEmail, customerPhone } = await req.json();

    // Load Stripe keys from PaymentSettings
    const settings = await base44.asServiceRole.entities.PaymentSettings.list();
    const stripeConfigured = settings.length > 0 && settings[0].stripeApiKey;

    // If no payment method provided (payment not yet configured), create reservation without charge
    if (!paymentMethodId) {
      const rental = await base44.asServiceRole.entities.Rental.create({
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        startDate, endDate, totalDays: days, baseAmount: totalAmount,
        customerName, customerEmail, customerPhone: customerPhone || '',
        deliveryMethod: delivery === 'delivery' ? 'company_delivery' : 'customer_pickup',
        status: 'reservation',
        notes: 'Online reservation (payment pending — Stripe not yet configured).',
        amountPaid: 0,
      });
      // Send HTML confirmation + notify staff
      await base44.asServiceRole.functions.invoke('sendRentalConfirmation', {
        rentalIds: [rental.id],
        customerEmail,
        customerPhone: customerPhone || '',
        invoiceNumber: rental.invoiceNumber || `RES-${rental.id.slice(-6).toUpperCase()}`,
        autoSendCommunications: true,
      });
      const companyList2 = await base44.asServiceRole.entities.CompanySettings.list();
      const branchList2 = await base44.asServiceRole.entities.BranchSettings.list();
      const staffEmail2 = branchList2[0]?.email || companyList2[0]?.geofenceAlertEmails?.[0];
      if (staffEmail2) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: staffEmail2,
          subject: `🛒 New Online Reservation — ${equipment.name}`,
          body: `A new reservation was submitted through the online store.\n\nCustomer: ${customerName}\nEmail: ${customerEmail}\nPhone: ${customerPhone || 'not provided'}\nEquipment: ${equipment.name}\nDates: ${startDate} → ${endDate} (${days} day${days !== 1 ? 's' : ''})\nDelivery: ${delivery === 'delivery' ? 'Delivery requested' : 'Customer pickup'}\nEstimated total: $${totalAmount.toFixed(2)}\n\nReservation ID: ${rental.id}\n\nLog in to review: https://lupine.rental/availability`,
        });
      }
      return Response.json({ success: true, rentalId: rental.id });
    }

    if (!stripeConfigured) {
      return Response.json({ error: 'Payment not configured. Please contact us to complete your reservation.' }, { status: 400 });
    }

    const stripe = new Stripe(settings[0].stripeApiKey);

    // Create or retrieve Stripe customer
    let stripeCustomerId;
    const existingCustomers = await stripe.customers.list({ email: customerEmail, limit: 1 });
    if (existingCustomers.data.length > 0) {
      stripeCustomerId = existingCustomers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
        phone: customerPhone || undefined,
      });
      stripeCustomerId = customer.id;
    }

    // Attach the payment method to the customer
    await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });

    // Create a $1.00 authorization-only PaymentIntent (NOT captured)
    const intent = await stripe.paymentIntents.create({
      amount: 100, // $1.00 in cents
      currency: 'usd',
      customer: stripeCustomerId,
      payment_method: paymentMethodId,
      confirm: true,
      capture_method: 'manual',   // auth-only, no capture
      return_url: 'https://lupine.rental/store',
      description: `Card verification for ${equipment.name} reservation`,
      metadata: {
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        startDate,
        endDate,
        totalAmount: String(totalAmount),
      },
    });

    if (intent.status !== 'requires_capture' && intent.status !== 'succeeded') {
      return Response.json({ error: `Card authorization failed (${intent.status}). Please check your card and try again.` }, { status: 402 });
    }

    // Create the Rental record
    const rental = await base44.asServiceRole.entities.Rental.create({
      equipmentId: equipment.id,
      equipmentName: equipment.name,
      startDate,
      endDate,
      totalDays: days,
      baseAmount: totalAmount,
      customerName,
      customerEmail,
      customerPhone: customerPhone || '',
      deliveryMethod: delivery === 'delivery' ? 'company_delivery' : 'customer_pickup',
      status: 'reservation',
      notes: `Online reservation. Stripe auth: ${intent.id}. Card verified $1 hold (not captured).`,
      amountPaid: 0,
    });

    // Send HTML confirmation email + SMS via sendRentalConfirmation
    await base44.asServiceRole.functions.invoke('sendRentalConfirmation', {
      rentalIds: [rental.id],
      customerEmail,
      customerPhone: customerPhone || '',
      invoiceNumber: rental.invoiceNumber || `RES-${rental.id.slice(-6).toUpperCase()}`,
      autoSendCommunications: true,
    });

    // Notify staff of new online reservation
    const companyList = await base44.asServiceRole.entities.CompanySettings.list();
    const branchList = await base44.asServiceRole.entities.BranchSettings.list();
    const staffNotifyEmail = branchList[0]?.email || companyList[0]?.geofenceAlertEmails?.[0];
    if (staffNotifyEmail) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: staffNotifyEmail,
        subject: `🛒 New Online Reservation — ${equipment.name}`,
        body: `A new reservation was submitted through the online store.\n\nCustomer: ${customerName}\nEmail: ${customerEmail}\nPhone: ${customerPhone || 'not provided'}\nEquipment: ${equipment.name}\nDates: ${startDate} → ${endDate} (${days} day${days !== 1 ? 's' : ''})\nDelivery: ${delivery === 'delivery' ? 'Delivery requested' : 'Customer pickup'}\nEstimated total: $${totalAmount.toFixed(2)}\n\nReservation ID: ${rental.id}\n\nLog in to review and confirm: https://lupine.rental/availability`,
      });
    }

    return Response.json({
      success: true,
      rentalId: rental.id,
      paymentIntentId: intent.id,
    });

  } catch (error) {
    console.error('[storeCreateReservation]', error);
    // Surface Stripe card errors nicely
    if (error.type === 'StripeCardError') {
      return Response.json({ error: error.message }, { status: 402 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});