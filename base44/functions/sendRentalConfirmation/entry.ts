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

    const lineRows = lineItems.map(l => `
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:8px;text-align:left">${l.equipmentName}</td>
        <td style="padding:8px;text-align:center">1</td>
        <td style="padding:8px;text-align:center;font-size:11px">${l.startDate} – ${l.endDate}</td>
        <td style="padding:8px;text-align:right">$${fmt(l.rate)}</td>
        <td style="padding:8px;text-align:right">$${fmt(l.baseAmount)}</td>
        <td style="padding:8px;text-align:right">${l.taxable ? '$' + fmt(l.baseAmount * taxRateDecimal) : '—'}</td>
        <td style="padding:8px;text-align:right">${l.deposit > 0 ? '$' + fmt(l.deposit) : '—'}</td>
      </tr>
    `).join('');

    const invoiceHtml = `
    <html>
    <head><meta charset="utf-8" /></head>
    <body style="font-family:sans-serif;font-size:13px;color:#333;margin:0;padding:20px">
      <div style="max-width:600px;margin:0 auto">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
          <div>
            <div style="font-size:20px;font-weight:700;color:#1e1b4b">${invoiceOrder.companyInfo.companyName}</div>
            ${invoiceOrder.branchInfo.address ? `<div style="color:#666;margin-top:4px">${invoiceOrder.branchInfo.address}</div>` : ''}
            ${invoiceOrder.branchInfo.phone ? `<div style="color:#666">${invoiceOrder.branchInfo.phone}</div>` : ''}
          </div>
          <div style="text-align:right">
            <div style="font-size:28px;font-weight:700;color:#d1d5db">INVOICE</div>
            ${invoiceNumber ? `<div style="font-size:14px;font-weight:600;color:#3730a3">${invoiceNumber}</div>` : ''}
          </div>
        </div>

        <div style="background:#f9fafb;border-radius:8px;padding:12px;margin-bottom:20px">
          <div style="font-weight:600;margin-bottom:4px">${invoiceOrder.customer.name}</div>
          ${invoiceOrder.customer.email ? `<div style="color:#666">${invoiceOrder.customer.email}</div>` : ''}
          ${invoiceOrder.customer.phone ? `<div style="color:#666">${invoiceOrder.customer.phone}</div>` : ''}
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <thead>
            <tr style="border-bottom:2px solid #e5e7eb">
              <th style="padding:8px;text-align:left;font-size:11px;color:#888;font-weight:600">Item</th>
              <th style="padding:8px;text-align:center;font-size:11px;color:#888;font-weight:600">Qty</th>
              <th style="padding:8px;text-align:center;font-size:11px;color:#888;font-weight:600">Dates</th>
              <th style="padding:8px;text-align:right;font-size:11px;color:#888;font-weight:600">Rate/Day</th>
              <th style="padding:8px;text-align:right;font-size:11px;color:#888;font-weight:600">Rental</th>
              <th style="padding:8px;text-align:right;font-size:11px;color:#888;font-weight:600">Tax</th>
              <th style="padding:8px;text-align:right;font-size:11px;color:#888;font-weight:600">Deposit</th>
            </tr>
          </thead>
          <tbody>${lineRows}</tbody>
        </table>

        <div style="display:flex;justify-content:flex-end;margin-bottom:24px">
          <div style="width:240px;font-size:13px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Rental Subtotal</span><span>$${fmt(rentalSubtotal)}</span></div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Sales Tax (${(taxRateDecimal * 100).toFixed(2)}%)</span><span>$${fmt(taxAmount)}</span></div>
            ${depositTotal > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Deposits</span><span>$${fmt(depositTotal)}</span></div>` : ''}
            <div style="display:flex;justify-content:space-between;font-weight:700;font-size:15px;border-top:2px solid #e5e7eb;padding-top:8px;margin-top:8px"><span>Total Due</span><span style="color:#3730a3">$${fmt(grandTotal)}</span></div>
          </div>
        </div>

        ${rental.signatureDataUrl ? `
        <div style="border-top:2px solid #1e1b4b;padding-top:16px;margin-top:16px">
          <img src="${rental.signatureDataUrl}" style="width:220px;height:60px;border-bottom:1px solid #111" />
          <div style="margin-top:4px;font-weight:600">Customer Signature</div>
        </div>
        ` : ''}

        <div style="border-top:1px solid #e5e7eb;padding-top:12px;margin-top:20px;font-size:11px;color:#666;text-align:center">
          Thank you for your business!
        </div>
      </div>
    </body>
    </html>
    `;

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