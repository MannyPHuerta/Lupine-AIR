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

    // Fetch rental details using service role — fetch each individually
    console.log('[sendRentalConfirmation] Fetching rentals:', rentalIds);
    const rentals = (await Promise.all(
      rentalIds.map(id => base44.asServiceRole.entities.Rental.filter({ id }).catch(() => []))
    )).flat();
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

    // Build line items for invoice
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

    // Build invoice HTML
    const fmt = (n) => (n || 0).toFixed(2);
    const taxRateDecimal = (invoiceOrder.taxRate || 8.25) / 100;
    const rentalSubtotal = lineItems.reduce((s, l) => s + (l.baseAmount || 0), 0);
    const depositTotal = lineItems.reduce((s, l) => s + (l.deposit || 0), 0);
    const deliveryFee = rental.deliveryFee || 0;
    const returnFee = rental.returnFee || 0;
    const taxableBase = lineItems.reduce((s, l) => s + (l.taxable !== false ? (l.baseAmount || 0) : 0), 0);
    const taxAmount = Math.round(taxableBase * taxRateDecimal * 100) / 100;
    const grandTotal = rentalSubtotal + taxAmount + depositTotal + deliveryFee + returnFee;

    const lineRows = lineItems.map(l => {
      const itemTax = l.taxable ? Math.round(l.baseAmount * taxRateDecimal * 100) / 100 : 0;
      return `<tr><td>${l.equipmentName}</td><td>${l.startDate} – ${l.endDate}</td><td>$${fmt(l.baseAmount)}</td><td>$${fmt(itemTax)}</td><td>$${fmt(l.deposit)}</td></tr>`;
    }).join('');

    const invoiceHtml = `<!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8">
    <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; color: #2c3e50; line-height: 1.6; margin: 0; padding: 0; }
    .container { max-width: 650px; margin: 0 auto; background: #fff; }
    .header { background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 40px 30px; text-align: center; }
    .logo { max-height: 60px; margin-bottom: 15px; }
    .company-name { font-size: 28px; font-weight: bold; margin: 0 0 10px 0; }
    .invoice-label { font-size: 12px; opacity: 0.9; letter-spacing: 1px; }
    .content { padding: 30px; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 12px; font-weight: bold; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .info-block { }
    .info-label { font-size: 11px; color: #7f8c8d; text-transform: uppercase; margin-bottom: 5px; font-weight: 600; }
    .info-value { font-size: 14px; color: #2c3e50; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #ecf0f1; padding: 12px; text-align: left; font-weight: 600; font-size: 12px; color: #2c3e50; border-bottom: 2px solid #bdc3c7; }
    td { padding: 12px; border-bottom: 1px solid #ecf0f1; }
    .totals { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
    .total-row.grand { border-top: 2px solid #1e3c72; padding-top: 12px; font-weight: bold; font-size: 16px; color: #1e3c72; margin-top: 12px; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #7f8c8d; border-top: 1px solid #ecf0f1; }
    .signature-note { color: #27ae60; font-size: 12px; font-weight: 600; margin: 20px 0; }
    .thank-you { font-size: 14px; color: #2c3e50; font-weight: 500; margin: 20px 0; }
    </style>
    </head>
    <body>
    <div class="container">
    <div class="header">
    ${invoiceOrder.companyInfo.logoUrl ? `<img src="${invoiceOrder.companyInfo.logoUrl}" alt="Company Logo" class="logo" />` : ''}
    <div class="company-name">${invoiceOrder.companyInfo.companyName || 'Rental World LLC'}</div>
    <div class="invoice-label">RENTAL INVOICE</div>
    </div>

    <div class="content">
    <div style="text-align: right; margin-bottom: 20px; font-size: 20px; font-weight: bold; color: #1e3c72;">
     ${invoiceNumber}
    </div>

    <div class="info-grid">
     <div class="info-block">
       <div class="section-title">From</div>
       <div class="info-value"><strong>${invoiceOrder.branchInfo.name}</strong></div>
       <div class="info-value">${invoiceOrder.branchInfo.address || ''}</div>
       <div class="info-value">${invoiceOrder.branchInfo.phone || ''}</div>
     </div>
     <div class="info-block">
       <div class="section-title">Bill To</div>
       <div class="info-value"><strong>${invoiceOrder.customer.name}</strong></div>
       <div class="info-value">${invoiceOrder.customer.email || ''}</div>
       <div class="info-value">${invoiceOrder.customer.phone || ''}</div>
     </div>
    </div>

    <div class="section">
     <table>
       <thead>
         <tr>
           <th style="text-align: left;">Equipment</th>
           <th style="text-align: center;">Rental Period</th>
           <th style="text-align: right;">Rental</th>
           <th style="text-align: right;">Tax</th>
           <th style="text-align: right;">Deposit</th>
         </tr>
       </thead>
       <tbody>
         ${lineRows}
       </tbody>
     </table>
    </div>

    <div class="totals">
     <div class="total-row"><span>Subtotal:</span><span>$${fmt(rentalSubtotal)}</span></div>
     <div class="total-row"><span>Tax (${(taxRateDecimal * 100).toFixed(2)}%):</span><span>$${fmt(taxAmount)}</span></div>
     ${depositTotal > 0 ? `<div class="total-row"><span>Deposits:</span><span>$${fmt(depositTotal)}</span></div>` : ''}
     ${deliveryFee > 0 ? `<div class="total-row"><span>🚚 Delivery Fee:</span><span>$${fmt(deliveryFee)}</span></div>` : ''}
     ${returnFee > 0 ? `<div class="total-row"><span>🚚 Return/Pickup Fee:</span><span>$${fmt(returnFee)}</span></div>` : ''}
     <div class="total-row grand"><span>TOTAL DUE:</span><span>$${fmt(grandTotal)}</span></div>
    </div>

    ${rental.signatureDataUrl ? `<div class="signature-note">✓ Signature captured at rental confirmation</div>` : ''}

    <div class="thank-you">Thank you for choosing ${invoiceOrder.companyInfo.companyName || 'Rental World LLC'}! We appreciate your business.</div>
    </div>

    <div class="footer">
    <p style="margin: 0;">This is an automated rental confirmation. Please contact us if you have any questions.</p>
    </div>
    </div>
    </body>
    </html>`;

    // Send email via Resend (requires verified domain at resend.com/domains)
    console.log('[sendRentalConfirmation] Sending email via Resend to:', customerEmail);
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.error('[sendRentalConfirmation] RESEND_API_KEY not set');
      return Response.json({ error: 'RESEND_API_KEY not configured', emailSent: false }, { status: 500 });
    }

    const fromDomain = Deno.env.get('RESEND_FROM_DOMAIN') || 'lupine.rental';
    const fromAddress = `${invoiceOrder.companyInfo.companyName || 'Rental World LLC'} <rentals@${fromDomain}>`;

    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [customerEmail],
          subject: `Rental Invoice ${invoiceNumber || 'Confirmation'}`,
          html: invoiceHtml,
        }),
      });
      const resendData = await resendRes.json();
      if (!resendRes.ok) {
        console.error('[sendRentalConfirmation] Resend error:', resendData);
        // Fall back to Base44 SendEmail
        console.log('[sendRentalConfirmation] Falling back to Base44 SendEmail');
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: customerEmail,
          subject: `Rental Invoice ${invoiceNumber || 'Confirmation'}`,
          body: invoiceHtml,
          from_name: invoiceOrder.companyInfo.companyName || 'Rental World LLC',
        });
        console.log('[sendRentalConfirmation] Email sent via Base44 fallback');
      } else {
        console.log('[sendRentalConfirmation] Email sent via Resend, id:', resendData.id);
      }
    } catch (emailErr) {
      console.error('[sendRentalConfirmation] Email error:', emailErr.message);
      return Response.json({ error: `Email error: ${emailErr.message}`, emailSent: false }, { status: 500 });
    }

    // Also send SMS via Twilio if phone available
    let smsSent = false;
    if (customerPhone) {
      try {
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

        if (accountSid && authToken && twilioPhone) {
          const smsBody = `Rental confirmed! Invoice ${invoiceNumber}. Equipment rentals for ${rental.customerName}. Total: $${fmt(grandTotal)}. Thank you!`;

          const smsRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
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
          smsSent = smsRes.ok;
          console.log('[sendRentalConfirmation] SMS sent:', smsSent);
        }
      } catch (smsErr) {
        console.log('[sendRentalConfirmation] SMS error:', smsErr.message);
      }
    }

    return Response.json({ success: true, emailSent: true, smsSent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});