import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    console.log('[sendRentalConfirmation] START');
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      console.log('[sendRentalConfirmation] Unauthorized');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rentalIds, customerEmail, customerPhone, invoiceNumber, autoSendCommunications } = await req.json();
    console.log('[sendRentalConfirmation] Payload:', { rentalIds, customerEmail, autoSendCommunications });

    if (!autoSendCommunications || !customerEmail) {
      console.log('[sendRentalConfirmation] Skipped (no auto-send or email)');
      return Response.json({ success: true, skipped: true });
    }

    if (!rentalIds || rentalIds.length === 0) {
      console.log('[sendRentalConfirmation] No rental IDs');
      return Response.json({ error: 'No rental IDs provided' }, { status: 400 });
    }

    // Fetch rental details using service role
    console.log('[sendRentalConfirmation] Fetching rentals:', rentalIds);
    const rentals = await base44.asServiceRole.entities.Rental.filter(
      { id: { $in: rentalIds } }
    );
    console.log('[sendRentalConfirmation] Fetched rentals:', rentals.length);

    if (!rentals || rentals.length === 0) {
      console.log('[sendRentalConfirmation] No rentals found');
      return Response.json({ error: 'Rentals not found' }, { status: 404 });
    }

    const rental = rentals[0];

    // Fetch company and branch settings for invoice
    const companyList = await base44.asServiceRole.entities.CompanySettings.list();
    const branchList = await base44.asServiceRole.entities.BranchSettings.filter({ branch: rental.branch });
    const equipmentList = await base44.asServiceRole.entities.Equipment.list();

    const company = companyList[0] || {};
    const branch = branchList[0] || {};

    // Build invoice HTML
    const lineItems = rentals.map(r => {
      const eq = equipmentList.find(e => e.id === r.equipmentId);
      return {
        equipmentId: r.equipmentId,
        equipmentName: r.equipmentName,
        quantity: 1,
        rate: r.baseAmount && r.totalDays ? r.baseAmount / r.totalDays : 0,
        baseAmount: r.baseAmount,
        taxable: r.taxRate !== 0,
        deposit: r.deposit || 0,
        startDate: r.startDate,
        endDate: r.endDate,
        specs: eq?.specs || {},
      };
    });

    const invoiceOrder = {
      id: invoiceNumber,
      customer: {
        name: rental.customerName,
        email: rental.customerEmail,
        phone: rental.customerPhone,
        branch: rental.branch,
        notes: rental.notes,
      },
      lines: lineItems,
      taxRate: (rental.taxRate || 0.0825) * 100,
      discount: 0,
      paymentMethod: '',
      branchInfo: {
        name: branch.branch || rental.branch,
        address: branch.address || '',
        phone: branch.phone || '',
        email: branch.email || '',
      },
      companyInfo: {
        companyName: company.companyName || 'Rental World Equipment',
        logoUrl: company.logoUrl || '',
        invoiceFooter: company.invoiceFooter || '',
      },
      createdAt: new Date().toISOString(),
    };

    // Build invoice HTML - inline styled for email
    const fmt = (n) => (n || 0).toFixed(2);
    const taxRateDecimal = (invoiceOrder.taxRate || 8.25) / 100;
    const rentalSubtotal = lineItems.reduce((s, l) => s + (l.baseAmount || 0), 0);
    const depositTotal = lineItems.reduce((s, l) => s + (l.deposit || 0), 0);
    const taxableBase = lineItems.reduce((s, l) => s + (l.taxable !== false ? (l.baseAmount || 0) : 0), 0);
    const taxAmount = Math.round(taxableBase * taxRateDecimal * 100) / 100;
    const grandTotal = rentalSubtotal + taxAmount + depositTotal;

    const lineRows = lineItems.map(l => {
      const itemTax = l.taxable ? Math.round(l.baseAmount * taxRateDecimal * 100) / 100 : 0;
      return `<tr><td>${l.equipmentName}</td><td>${l.startDate} – ${l.endDate}</td><td>$${fmt(l.baseAmount)}</td><td>$${fmt(itemTax)}</td><td>$${fmt(l.deposit)}</td></tr>`;
    }).join('');

    const invoiceHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body { font-family: Arial, sans-serif; font-size: 13px; color: #333; }
table { width: 100%; border-collapse: collapse; margin: 20px 0; }
th { background: #f5f5f5; padding: 8px; text-align: left; font-weight: bold; border-bottom: 1px solid #ddd; }
td { padding: 8px; border-bottom: 1px solid #eee; }
.header { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
.total { font-weight: bold; font-size: 16px; text-align: right; }
</style>
</head>
<body>
<div style="max-width: 600px; margin: 0 auto;">
<p class="header">INVOICE ${invoiceNumber}</p>

<p><strong>${invoiceOrder.companyInfo.companyName}</strong><br>
${invoiceOrder.branchInfo.address || ''}<br>
${invoiceOrder.branchInfo.phone || ''}</p>

<p><strong>Bill To:</strong><br>
${invoiceOrder.customer.name}<br>
${invoiceOrder.customer.email || ''}<br>
${invoiceOrder.customer.phone || ''}</p>

<table>
<thead>
<tr><th>Item</th><th>Dates</th><th>Rental</th><th>Tax</th><th>Deposit</th></tr>
</thead>
<tbody>
${lineRows}
</tbody>
</table>

<div class="total">
<p>Subtotal: $${fmt(rentalSubtotal)}</p>
<p>Tax (${(taxRateDecimal * 100).toFixed(2)}%): $${fmt(taxAmount)}</p>
${depositTotal > 0 ? `<p>Deposits: $${fmt(depositTotal)}</p>` : ''}
<p>TOTAL DUE: $${fmt(grandTotal)}</p>
</div>

${rental.signatureDataUrl ? `<p>Customer Signature Captured</p>` : ''}

<p>Thank you for your business!</p>
</div>
</body>
</html>`;

    // Send email with invoice HTML
    console.log('[sendRentalConfirmation] Sending email to:', customerEmail);
    await base44.integrations.Core.SendEmail({
      to: customerEmail,
      subject: `Rental Confirmation - Invoice ${invoiceNumber}`,
      body: invoiceHtml,
      from_name: 'Rental World Equipment',
    });
    console.log('[sendRentalConfirmation] Email sent');

    // Try to send SMS if phone number and Twilio credentials exist
    if (customerPhone) {
      try {
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

        if (accountSid && authToken && twilioPhone) {
          const smsBody = `Rental confirmed! Invoice ${invoiceNumber}. Equipment rentals for ${rental.customerName}. Total: $${fmt(grandTotal)}. Thank you!`;

          await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: twilioPhone,
              To: customerPhone,
              Body: smsBody,
            }).toString(),
          });
        }
      } catch (smsErr) {
        console.log('SMS send skipped (Twilio not configured):', smsErr.message);
      }
    }

    return Response.json({ success: true, emailSent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});