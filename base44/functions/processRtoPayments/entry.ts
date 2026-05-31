import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Get all pending/late RTO payments
    const payments = await base44.asServiceRole.entities.RtoPayment.filter({ status: 'pending' });
    const latePayments = await base44.asServiceRole.entities.RtoPayment.filter({ status: 'late' });
    const allDue = [...payments, ...latePayments];

    // Get company settings for default action
    const settings = await base44.asServiceRole.entities.CompanySettings.list();
    const config = settings[0] || {};
    const defaultAction = config.rtoDefaultAction || 'flag_account';
    const graceDays = config.rtoGracePeriodDays || 3;

    let reminded = 0;
    let flagged = 0;
    let cancelled = 0;

    for (const payment of allDue) {
      if (!payment.dueDate || payment.dueDate > today) continue;

      const dueDate = new Date(payment.dueDate + 'T12:00:00');
      const daysLate = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Mark as late if past due
      if (payment.status === 'pending' && daysLate > 0) {
        await base44.asServiceRole.entities.RtoPayment.update(payment.id, { status: 'late' });
      }

      // Send reminder email if not sent today and customer has email
      if (payment.customerEmail && (!payment.reminderSentAt || payment.reminderSentAt.split('T')[0] !== today)) {
        const monthlyAmount = payment.amountDue.toFixed(2);
        const subject = daysLate > 0
          ? `[OVERDUE] Rent-to-Own Payment #${payment.paymentNumber} — $${monthlyAmount} due`
          : `Rent-to-Own Payment #${payment.paymentNumber} Due — $${monthlyAmount}`;

        const body = `
Dear ${payment.customerName},

${daysLate > 0 ? `Your Rent-to-Own payment is ${daysLate} day(s) overdue.` : 'Your Rent-to-Own payment is due.'}

Equipment: ${payment.equipmentName}
Payment: ${payment.paymentNumber} of ${payment.totalPayments}
Amount Due: $${monthlyAmount}
Due Date: ${payment.dueDate}

Please contact us to arrange payment and keep your Rent-to-Own contract active.

Thank you,
The Team
        `.trim();

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: payment.customerEmail,
          subject,
          body,
        });

        await base44.asServiceRole.entities.RtoPayment.update(payment.id, {
          reminderSentAt: new Date().toISOString(),
        });
        reminded++;
      }

      // Apply default action based on management setting
      if (daysLate > graceDays) {
        if (defaultAction === 'cancel_contract') {
          await base44.asServiceRole.entities.RtoPayment.update(payment.id, { status: 'cancelled' });
          // Also cancel all future payments on this rental
          const futurePayments = await base44.asServiceRole.entities.RtoPayment.filter({
            rentalId: payment.rentalId,
            status: 'pending',
          });
          for (const fp of futurePayments) {
            await base44.asServiceRole.entities.RtoPayment.update(fp.id, { status: 'cancelled' });
          }
          cancelled++;
        } else if (defaultAction === 'flag_account') {
          // Flag is implicit — late status + no action needed beyond reminder
          flagged++;
        }
        // 'send_reminders' — already handled above
      }
    }

    return Response.json({ success: true, reminded, flagged, cancelled, processed: allDue.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});