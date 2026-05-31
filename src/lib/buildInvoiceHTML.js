const fmt = (n) => (n || 0).toFixed(2);

const DELIVERY_LABELS = {
  customer_pickup: 'Customer Pickup',
  company_delivery: 'Company Delivery',
  shipped: 'Shipped',
};

const RETURN_LABELS = {
  customer_return: 'Customer Return',
  company_pickup: 'Company Pickup',
  customer_ships: 'Customer Ships',
};

/**
 * Builds a self-contained invoice HTML string.
 * @param {object} order - { customer, lines, taxRate, id, createdAt, branchInfo, companyInfo }
 * @param {number} amountPaid
 */
export function buildInvoiceHTML(order, amountPaid = 0, signatureDataUrl = null, isPractice = false) {
  // Use passed-in branch/company info, fallback to defaults
  const branch = order.branchInfo || { name: 'Rental World LLC', address: '', phone: '', email: '' };
  const company = order.companyInfo || { companyName: 'Rental World LLC', logoUrl: '', invoiceFooter: '' };
  const lines = order.lines;
  const taxRateDecimal = (parseFloat(order.taxRate) || 8.25) / 100;

  const rentalSubtotal = lines.reduce((s, l) => s + (l.baseAmount || 0), 0);
  const depositTotal = lines.reduce((s, l) => s + (l.deposit || 0) * (l.quantity || 1), 0);
  const discountAmount = Math.min(Math.max(parseFloat(order.discount) || 0, 0), rentalSubtotal);
  const autoDiscount = parseFloat(order.autoDiscount) || 0; // promo + volume + loyalty
  const totalDiscount = discountAmount + autoDiscount;
  // Default taxable=true unless explicitly false
  const taxableBase = lines.reduce((s, l) => s + (l.taxable !== false ? (l.baseAmount || 0) : 0), 0);
  const taxAmount = Math.round(Math.max(0, taxableBase - totalDiscount) * taxRateDecimal * 100) / 100;
  const deliveryFee = (order.deliveryMethod === 'company_delivery' && order.deliveryFee > 0) ? (order.deliveryFee || 0) : 0;
  const returnFee = (order.returnMethod === 'company_pickup' && order.returnFee > 0) ? (order.returnFee || 0) : 0;
  const grandTotal = rentalSubtotal - totalDiscount + taxAmount + depositTotal + deliveryFee + returnFee;
  const paid = parseFloat(amountPaid) || 0;

  const dateStr = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Build RTO addendum — auto-generated when isRentToOwn is true
  const rtoLine = order.lines?.find(l => l.isRentToOwn);
  const rtoAddendumHtml = order.isRentToOwn ? (() => {
    const purchasePrice = order.purchasePrice || 0;
    const termMonths = order.rentToOwnTermMonths || 0;
    const creditPercent = order.rentToOwnCreditPercent || 0;
    const monthlyPayment = termMonths > 0 ? (purchasePrice / termMonths).toFixed(2) : '0.00';
    const expiryDate = order.purchaseOptionExpiry ? new Date(order.purchaseOptionExpiry).toLocaleDateString('en-US') : '—';
    const equipmentName = order.lines?.map(l => l.equipmentName).filter(Boolean).join(', ') || '—';
    const today = new Date().toLocaleDateString('en-US');
    return `
  <div id="rto-addendum" style="page-break-before:always;margin-top:32px;border-top:3px solid #5b21b6;padding-top:24px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <span style="font-size:20px">🏷️</span>
      <h2 style="font-size:16px;font-weight:800;color:#5b21b6;margin:0">RENT-TO-OWN ADDENDUM</h2>
    </div>
    <div style="font-size:11px;color:#6d28d9;margin-bottom:16px;font-style:italic">
      Addendum to Equipment Rental Agreement — attached to Invoice ${order.id || ''}
    </div>

    <div style="background:#faf5ff;border:1px solid #ddd6fe;border-radius:8px;padding:16px;margin-bottom:16px;font-size:12px;line-height:1.9">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-bottom:12px">
        <div><span style="color:#888;font-size:10px;text-transform:uppercase;letter-spacing:.05em">Customer</span><br/><strong>${order.customer?.name || '—'}</strong></div>
        <div><span style="color:#888;font-size:10px;text-transform:uppercase;letter-spacing:.05em">Date</span><br/><strong>${today}</strong></div>
        <div><span style="color:#888;font-size:10px;text-transform:uppercase;letter-spacing:.05em">Equipment</span><br/><strong>${equipmentName}</strong></div>
        <div><span style="color:#888;font-size:10px;text-transform:uppercase;letter-spacing:.05em">Invoice</span><br/><strong>${order.id || '—'}</strong></div>
        <div><span style="color:#888;font-size:10px;text-transform:uppercase;letter-spacing:.05em">Purchase Price</span><br/><strong style="color:#5b21b6;font-size:14px">$${purchasePrice.toFixed(2)}</strong></div>
        <div><span style="color:#888;font-size:10px;text-transform:uppercase;letter-spacing:.05em">Monthly Payment</span><br/><strong style="color:#5b21b6;font-size:14px">$${monthlyPayment}/mo × ${termMonths} months</strong></div>
        <div><span style="color:#888;font-size:10px;text-transform:uppercase;letter-spacing:.05em">Rental Credit Applied</span><br/><strong>${creditPercent}% of each rental payment</strong></div>
        <div><span style="color:#888;font-size:10px;text-transform:uppercase;letter-spacing:.05em">Purchase Option Expires</span><br/><strong>${expiryDate}</strong></div>
      </div>
    </div>

    <div style="font-size:11px;line-height:1.9;color:#333;background:#f9fafb;border:1px solid #e5e7eb;padding:16px;border-radius:6px;font-family:Georgia,serif;margin-bottom:16px">
      <strong>1. RENT-TO-OWN AGREEMENT.</strong> This Addendum supplements the Equipment Rental Agreement entered into between the Lessor and Lessee identified on the rental invoice. Lessee agrees to make monthly payments as specified above. A portion of each payment, as specified by the credit percentage above, shall be credited toward the Purchase Price of the equipment.<br/><br/>

      <strong>2. PAYMENT SCHEDULE.</strong> Lessee shall make ${termMonths} monthly payments of $${monthlyPayment} beginning one month from the rental start date. Payments are due on the same day each month. All payments must be received by Lessor on or before their due date.<br/><br/>

      <strong>3. TITLE AND OWNERSHIP.</strong> Title to the equipment shall remain with Lessor until all payments have been received in full and Lessor has issued written confirmation of transfer of title. Lessee acquires no ownership interest until final payment is made and accepted.<br/><br/>

      <strong>4. PURCHASE OPTION EXPIRY.</strong> Lessee's right to purchase the equipment under this Addendum expires on ${expiryDate}. If Lessee has not completed all required payments by this date, Lessee forfeits all credited amounts and the equipment shall remain the property of Lessor.<br/><br/>

      <strong>5. DEFAULT.</strong> If Lessee fails to make two (2) or more consecutive payments when due, or otherwise breaches this Addendum or the underlying Rental Agreement, Lessor may immediately cancel this Rent-to-Own contract. Upon cancellation, all payments made to date are forfeited, and Lessor may retake possession of the equipment. Lessee grants Lessor the right to enter Lessee's premises for this purpose without further notice.<br/><br/>

      <strong>6. CONDITION OF EQUIPMENT.</strong> Lessee is responsible for maintaining the equipment in good working order throughout the rental and rent-to-own term. Any damage beyond normal wear and tear shall be the responsibility of the Lessee and may be charged against the credited amount.<br/><br/>

      <strong>7. ENTIRE AGREEMENT.</strong> This Addendum, together with the Equipment Rental Agreement and rental invoice, constitutes the entire agreement between the parties with respect to the rent-to-own arrangement. No modification shall be valid unless in writing and signed by both parties.
    </div>

    <div style="display:flex;justify-content:space-between;gap:40px;margin-top:24px;flex-wrap:wrap">
      <div>
        <div style="border-bottom:1px solid #111;width:240px;height:56px"></div>
        <div style="margin-top:4px;font-weight:600;color:#111;font-size:12px">Lessee Signature</div>
        <div style="font-size:10px;color:#666;margin-top:2px">Date: ___________________</div>
      </div>
      <div>
        <div style="border-bottom:1px solid #111;width:240px;height:56px"></div>
        <div style="margin-top:4px;font-weight:600;color:#111;font-size:12px">Authorized Representative (Lessor)</div>
        <div style="font-size:10px;color:#666;margin-top:2px">Date: ___________________</div>
      </div>
    </div>

    <div style="margin-top:16px;font-size:10px;color:#aaa;font-style:italic;text-align:center">
      This is a default RTO Addendum generated by the AIR platform. Replace with your attorney-reviewed bespoke language when available.
    </div>
  </div>`;
  })() : '';

  // Build rental agreement section if present
  const agreementHtml = order.agreement ? `
  <div id="agreement-section" style="page-break-before:always;margin-top:32px;border-top:2px solid #1e1b4b;padding-top:20px">
    <h2 style="font-size:16px;font-weight:700;color:#1e1b4b;margin-bottom:12px">${order.agreement.title || 'Equipment Rental Agreement'}</h2>
    <div style="font-size:12px;line-height:1.8;color:#333;background:#f9fafb;border:1px solid #e5e7eb;padding:16px;border-radius:6px;white-space:pre-wrap;font-family:Georgia,serif">
      ${order.agreement.content || ''}
    </div>
    <div style="margin-top:20px;display:flex;justify-content:space-between;gap:40px;flex-wrap:wrap">
      <div>
        ${signatureDataUrl
          ? `<img src="${signatureDataUrl}" style="width:220px;height:60px;border-bottom:1px solid #111;object-fit:contain;object-position:left bottom;display:block" />`
          : `<div style="border-bottom:1px solid #111;width:220px;height:60px"></div>`
        }
        <div style="margin-top:4px;font-weight:600;color:#111;font-size:12px">Renter Signature</div>
        <div style="font-size:10px;color:#666;margin-top:2px">Date: <span id="agreement-date">${new Date().toLocaleDateString('en-US')}</span></div>
      </div>
    </div>
  </div>` : '';

  const lineRows = lines.filter(l => l.equipmentId).map(l => {
    const taxable = l.taxable !== false;
    const tax = taxable ? Math.round((l.baseAmount || 0) * taxRateDecimal * 100) / 100 : 0;
    const total = (l.baseAmount || 0) + tax + (l.deposit || 0) * (l.quantity || 1);

    // Format specs for this line if present
    const specsStr = l.specs && typeof l.specs === 'object' && Object.keys(l.specs).length > 0
      ? Object.entries(l.specs)
          .filter(([, v]) => v && String(v).trim())
          .map(([k, v]) => {
            const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            return `<span>${label}: <strong>${v}</strong></span>`;
          })
          .join('<span style="color:#ccc;margin:0 4px">·</span>')
      : '';

    const rtoMonthly = (l.rentToOwnEligible && l.rentToOwnPrice && l.rentToOwnTermMonths)
      ? (l.rentToOwnPrice / l.rentToOwnTermMonths).toFixed(2)
      : null;

    return `
      <tr>
        <td style="padding:6px 8px 6px 0;border-bottom:1px solid #f0f0f0;">
          <div style="font-weight:500">${l.equipmentName || ''}</div>
          ${specsStr ? `<div style="font-size:10px;color:#888;margin-top:3px;line-height:1.6">${specsStr}</div>` : ''}
          ${rtoMonthly ? `<div style="margin-top:4px;background:#f5f3ff;border:1px solid #c4b5fd;border-radius:4px;padding:3px 6px;font-size:10px;color:#6d28d9;display:inline-block">🏷️ <strong>Rent-to-Own:</strong> $${rtoMonthly}/mo × ${l.rentToOwnTermMonths} months = $${l.rentToOwnPrice.toFixed(2)}</div>` : ''}
        </td>
        <td style="padding:6px;border-bottom:1px solid #f0f0f0;text-align:center;color:#666">${l.quantity || 1}</td>
        <td style="padding:6px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:11px;color:#666">${l.startDate || ''} – ${l.endDate || ''}</td>
        <td style="padding:6px;border-bottom:1px solid #f0f0f0;text-align:right;color:#666">$${fmt(l.rate)}</td>
        <td style="padding:6px;border-bottom:1px solid #f0f0f0;text-align:right">$${fmt(l.baseAmount)}</td>
        <td style="padding:6px;border-bottom:1px solid #f0f0f0;text-align:right;color:#666">${taxable ? '$' + fmt(tax) : '—'}</td>
        <td style="padding:6px;border-bottom:1px solid #f0f0f0;text-align:right;color:#666">${(l.deposit || 0) > 0 ? '$' + fmt((l.deposit || 0) * (l.quantity || 1)) : '—'}</td>
        <td style="padding:6px 0 6px 8px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">$${fmt(total)}</td>
      </tr>`;
  }).join('');

  const paidSection = paid > 0
    ? `<div style="display:flex;justify-content:space-between;color:#16a34a;font-weight:600;margin-top:6px"><span>Paid</span><span>$${fmt(paid)}</span></div>
       <div style="display:flex;justify-content:space-between;font-weight:700;font-size:15px;border-top:2px solid #e5e7eb;padding-top:8px;margin-top:4px"><span>Balance</span><span style="color:${grandTotal - paid <= 0 ? '#16a34a' : '#dc2626'}">$${fmt(grandTotal - paid)}</span></div>`
    : '';

  const practiceWatermark = isPractice ? `
    <div style="position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:9999">
      ${Array.from({ length: 20 }).map((_, i) => `
        <div style="position:absolute;white-space:nowrap;color:#ef4444;font-weight:900;opacity:0.10;font-size:48px;letter-spacing:4px;
          top:${(i % 5) * 22 - 5}%;left:${Math.floor(i / 5) * 28 - 5}%;transform:rotate(-35deg)">PRACTICE MODE</div>
      `).join('')}
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
        <div style="color:#ef4444;font-weight:900;font-size:80px;opacity:0.12;letter-spacing:6px;transform:rotate(-35deg)">PRACTICE MODE</div>
      </div>
    </div>
    <div style="background:#dc2626;color:#fff;text-align:center;font-weight:900;font-size:13px;letter-spacing:4px;padding:8px;position:relative;z-index:100">
      ⚠ PRACTICE MODE — THIS IS NOT A REAL INVOICE ⚠
    </div>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${isPractice ? '[PRACTICE] ' : ''}Invoice – ${order.customer.name}</title>
  <style>
    body { font-family: sans-serif; font-size: 13px; color: #111; margin: 0; padding: 32px; }
    @media print { 
      body { padding: 16px; } 
      #toolbar { display: none !important; }
      #agreement-section { page-break-before: always; break-before: page; }
    }
    table { width: 100%; border-collapse: collapse; }
    th { font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: .05em; padding: 4px 6px 8px; border-bottom: 2px solid #e5e7eb; }
    #toolbar { display:flex; align-items:center; gap:12px; margin-bottom:24px; padding:12px 16px; background:#f1f5f9; border-radius:8px; flex-wrap:wrap; }
    #paid-input { border:1px solid #cbd5e1; border-radius:6px; padding:6px 10px; font-size:14px; width:120px; }
    #print-btn { padding: 8px 24px; background:#3730a3; color:#fff; border:none; border-radius:6px; font-size:14px; font-weight:600; cursor:pointer; }
    #print-btn:hover { background:#312e81; }
    #balance-display { font-weight:700; font-size:15px; margin-left:auto; }
    .total-row { display:flex; justify-content:space-between; color:#555; margin-bottom:4px; }
    .grand-row { display:flex; justify-content:space-between; font-weight:700; font-size:15px; border-top:2px solid #e5e7eb; padding-top:8px; margin-top:8px; }
  </style>
</head>
<body>
  ${practiceWatermark}
  <div id="toolbar">
    <label style="font-weight:600;font-size:14px">Amount Paid: $</label>
    <input id="paid-input" type="number" min="0" step="0.01" value="${paid}" oninput="updateTotals()" />
    <button id="print-btn" onclick="window.print()">🖨 Print Invoice</button>
    <span id="balance-display"></span>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px">
    <div>
      ${company.logoUrl ? `<img src="${company.logoUrl}" style="max-width:150px;margin-bottom:8px" alt="Company Logo" />` : ''}
      <div style="font-size:20px;font-weight:700;color:#1e1b4b">${company.companyName || branch.name}</div>
      ${branch.address ? `<div style="color:#555;margin-top:4px">${branch.address}</div>` : ''}
      ${branch.phone ? `<div style="color:#555">${branch.phone}</div>` : ''}
      ${branch.email ? `<div style="color:#555">${branch.email}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div style="font-size:28px;font-weight:700;color:#d1d5db">INVOICE</div>
      ${order.id ? `<div style="font-size:14px;font-weight:600;color:#3730a3;margin-top:4px">${order.id}</div>` : ''}
      ${dateStr ? `<div style="font-size:11px;color:#888">${dateStr}</div>` : ''}
    </div>
  </div>

  <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px">
    <div style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Bill To</div>
    <div style="font-weight:600">${order.customer.name}</div>
    ${order.customer.address || order.customer.city || order.customer.state || order.customer.zip
      ? `<div style="color:#555;margin-top:2px">${[order.customer.address, order.customer.city, order.customer.state, order.customer.zip].filter(Boolean).join(', ')}</div>`
      : ''}
    ${order.customer.phone ? `<div style="color:#555">${order.customer.phone}</div>` : ''}
    ${order.customer.email ? `<div style="color:#555">${order.customer.email}</div>` : ''}
    ${order.customer.notes ? `<div style="color:#888;font-size:12px;margin-top:6px;font-style:italic">${order.customer.notes}</div>` : ''}
  </div>

  ${(order.deliveryMethod || order.returnMethod) ? `
  <div style="display:flex;gap:24px;margin-bottom:${order.worksiteAddress ? '8px' : '16px'};font-size:12px;flex-wrap:wrap;align-items:flex-start">
    ${order.deliveryMethod ? `<div><span style="color:#888;text-transform:uppercase;font-size:10px;font-weight:600;letter-spacing:.05em">Delivery</span><br/><span style="font-weight:600">${DELIVERY_LABELS[order.deliveryMethod] || order.deliveryMethod}</span></div>` : ''}
    ${order.returnMethod ? `<div><span style="color:#888;text-transform:uppercase;font-size:10px;font-weight:600;letter-spacing:.05em">Return</span><br/><span style="font-weight:600">${RETURN_LABELS[order.returnMethod] || order.returnMethod}</span></div>` : ''}
    ${order.worksiteAddress ? `<div style="margin-left:auto;text-align:right;background:#fefce8;border:1px solid #fde68a;border-radius:6px;padding:6px 10px;">
      <span style="color:#92400e;text-transform:uppercase;font-size:10px;font-weight:600;letter-spacing:.05em">📍 Delivery / Worksite Address</span><br/>
      <span style="font-weight:600;color:#78350f">${order.worksiteAddress}</span><br/>
      <span style="color:#92400e">${[order.worksiteCity, order.worksiteState, order.worksiteZip].filter(Boolean).join(', ')}</span>
    </div>` : ''}
  </div>` : ''}

  <table style="margin-bottom:24px">
    <thead>
      <tr>
        <th style="text-align:left">Item</th>
        <th style="text-align:center;width:48px">Qty</th>
        <th style="text-align:center;width:140px">Dates</th>
        <th style="text-align:right;width:72px">Rate/Day</th>
        <th style="text-align:right;width:80px">Rental</th>
        <th style="text-align:right;width:64px">Tax</th>
        <th style="text-align:right;width:72px">Deposit</th>
        <th style="text-align:right;width:80px">Total</th>
      </tr>
    </thead>
    <tbody>${lineRows}</tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;margin-bottom:32px">
    <div style="width:240px">
      <div class="total-row"><span>Rental Subtotal</span><span>$${fmt(rentalSubtotal)}</span></div>
      ${totalDiscount > 0 ? `<div class="total-row" style="color:#16a34a"><span>Discount</span><span>−$${fmt(totalDiscount)}</span></div>` : ''}
      <div class="total-row"><span>Sales Tax (${(taxRateDecimal * 100).toFixed(2)}%)</span><span>$${fmt(taxAmount)}</span></div>
      ${depositTotal > 0 ? `<div class="total-row"><span>Deposits</span><span>$${fmt(depositTotal)}</span></div>` : ''}
      ${deliveryFee > 0 ? `<div class="total-row"><span>🚚 Delivery Fee</span><span>$${fmt(deliveryFee)}</span></div>` : ''}
      ${returnFee > 0 ? `<div class="total-row"><span>🚚 Pickup Fee</span><span>$${fmt(returnFee)}</span></div>` : ''}
      <div class="grand-row"><span>Total Due</span><span style="color:#3730a3">$${fmt(grandTotal)}</span></div>
      <div id="dynamic-paid"></div>
    </div>
  </div>

  <div style="margin-top:32px;border-top:2px solid #1e1b4b;padding-top:20px;font-size:12px">
    ${!order.isCounterSale ? `
    <div style="display:flex;justify-content:space-between;gap:40px;margin-bottom:32px;flex-wrap:wrap">
      <div>
        ${signatureDataUrl
          ? `<img src="${signatureDataUrl}" style="width:220px;height:60px;border-bottom:1px solid #111;object-fit:contain;object-position:left bottom;display:block" />`
          : `<div style="border-bottom:1px solid #111;width:220px;height:60px"></div>`
        }
        <div style="margin-top:4px;font-weight:600;color:#111">Customer Signature</div>
        <div style="font-size:10px;color:#666;margin-top:2px">Date: <span id="sig-date">${new Date().toLocaleDateString('en-US')}</span></div>
      </div>
      ${order.paymentMethod ? `<div style="margin-left:auto;text-align:right">
        <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Payment Method</div>
        <div style="font-size:15px;font-weight:700;color:#1e1b4b">${order.paymentMethod}</div>
      </div>` : ''}
    </div>
    
    <div style="font-size:11px;line-height:1.6;color:#333;background:#f9fafb;padding:12px;border-radius:6px;margin-bottom:12px">
      <strong>AGREEMENT TO PAY:</strong> The undersigned agrees to pay the amount due as shown on this invoice in full according to the terms specified. Equipment must be returned by the end date listed above in good condition. Customer acknowledges acceptance of all rental terms and conditions.
    </div>` : `
    ${order.paymentMethod ? `<div style="margin-bottom:16px;text-align:right">
      <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Payment Method</div>
      <div style="font-size:15px;font-weight:700;color:#1e1b4b">${order.paymentMethod}</div>
    </div>` : ''}
    `}

    ${lines.filter(l => l.equipmentId && l.specs && Object.entries(l.specs).filter(([, v]) => v && String(v).trim()).length > 0).length > 0 ? `
    <div style="font-size:11px;line-height:1.7;color:#333;background:#f0f4ff;border:1px solid #c7d2fe;padding:12px;border-radius:6px;margin-bottom:12px">
      <strong>EQUIPMENT SPECIFICATIONS — CUSTOMER ACKNOWLEDGEMENT:</strong> Customer confirms receipt of the following equipment with the specifications listed and acknowledges that the equipment was inspected and accepted in the condition described at time of rental.
      <div style="margin-top:8px;border-top:1px solid #c7d2fe;padding-top:8px">
        ${lines.filter(l => l.equipmentId && l.specs && Object.entries(l.specs).filter(([, v]) => v && String(v).trim()).length > 0).map(l => {
          const specPairs = Object.entries(l.specs).filter(([, v]) => v && String(v).trim()).map(([k, v]) => {
            const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            return `<span style="margin-right:12px">${label}: <strong>${v}</strong></span>`;
          }).join('');
          return `<div style="margin-bottom:6px"><span style="font-weight:600">${l.equipmentName}</span> — <span style="color:#555">${specPairs}</span></div>`;
        }).join('')}
      </div>
    </div>` : ''}
  </div>

  ${agreementHtml}

  ${rtoAddendumHtml}

  ${order.clockInUrl ? `
  <div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:16px;display:flex;align-items:center;gap:16px;background:#eef2ff;border-radius:8px;padding:12px 16px;">
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(order.clockInUrl)}" style="width:80px;height:80px;flex-shrink:0" alt="Clock-in QR" />
    <div style="font-size:11px;color:#3730a3;">
      <div style="font-weight:700;font-size:12px;margin-bottom:4px">📲 Staff / Crew Clock-In</div>
      <div>Scan to log hours for this job.</div>
      ${order.id ? `<div style="margin-top:2px">Invoice: ${order.id}</div>` : ''}
      <div style="color:#6366f1;margin-top:4px;font-size:10px;word-break:break-all">${order.clockInUrl}</div>
    </div>
  </div>` : ''}

  ${lines.some(l => l.rentToOwnEligible && l.rentToOwnPrice && l.rentToOwnTermMonths) ? `
  <div style="border:2px solid #7c3aed;border-radius:10px;padding:16px 20px;margin-bottom:20px;background:linear-gradient(135deg,#faf5ff,#f3e8ff)">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <span style="font-size:20px">🏷️</span>
      <div>
        <div style="font-size:14px;font-weight:800;color:#5b21b6;letter-spacing:.01em">Own It! Rent-to-Own Program</div>
        <div style="font-size:11px;color:#7c3aed;margin-top:1px">Turn your rental into ownership — no large upfront cost</div>
      </div>
    </div>
    <div style="font-size:11px;color:#4c1d95;line-height:1.7;margin-bottom:10px">
      One or more items on this rental are eligible for our <strong>Rent-to-Own program</strong>. A portion of your rental payments can be credited toward the purchase price. When you've completed your payments, the equipment is <strong>yours to keep</strong>.
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead>
        <tr style="background:#ede9fe">
          <th style="text-align:left;padding:5px 8px;color:#5b21b6;font-weight:700;border-radius:4px 0 0 4px">Equipment</th>
          <th style="text-align:right;padding:5px 8px;color:#5b21b6;font-weight:700">Purchase Price</th>
          <th style="text-align:right;padding:5px 8px;color:#5b21b6;font-weight:700">Term</th>
          <th style="text-align:right;padding:5px 8px;color:#5b21b6;font-weight:700;border-radius:0 4px 4px 0">Est. Monthly</th>
        </tr>
      </thead>
      <tbody>
        ${lines.filter(l => l.rentToOwnEligible && l.rentToOwnPrice && l.rentToOwnTermMonths).map(l => `
        <tr>
          <td style="padding:5px 8px;border-bottom:1px solid #ddd6fe;font-weight:600;color:#1e1b4b">${l.equipmentName}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #ddd6fe;text-align:right;color:#333">$${l.rentToOwnPrice.toFixed(2)}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #ddd6fe;text-align:right;color:#333">${l.rentToOwnTermMonths} months</td>
          <td style="padding:5px 8px;border-bottom:1px solid #ddd6fe;text-align:right;font-weight:700;color:#5b21b6">$${(l.rentToOwnPrice / l.rentToOwnTermMonths).toFixed(2)}/mo</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div style="margin-top:10px;font-size:10px;color:#7c3aed;font-style:italic">Ask our staff about enrollment details, credit percentages, and how your payments apply toward ownership. Terms and conditions apply.</div>
  </div>` : ''}

  <div style="border-top:1px solid #e5e7eb;padding-top:16px;font-size:11px;color:#aaa;text-align:center">
    ${company.invoiceFooter || `Thank you for your business! Questions? Contact us at ${branch.email || branch.phone || 'your local branch'}.`}
  </div>

  <script>
    var GT = ${Math.max(0, grandTotal)};
    function updateTotals() {
      var paidVal = parseFloat(document.getElementById('paid-input').value) || 0;
      var balance = GT - paidVal;
      var html = '';
      if (paidVal > 0) {
        html += '<div style="display:flex;justify-content:space-between;color:#16a34a;font-weight:600;margin-top:6px"><span>Paid</span><span>$' + paidVal.toFixed(2) + '</span></div>';
        html += '<div style="display:flex;justify-content:space-between;font-weight:700;font-size:15px;border-top:2px solid #e5e7eb;padding-top:8px;margin-top:4px"><span>Balance</span><span style="color:' + (balance <= 0 ? '#16a34a' : '#dc2626') + '">$' + balance.toFixed(2) + '</span></div>';
        document.getElementById('balance-display').textContent = 'Balance: $' + balance.toFixed(2);
        document.getElementById('balance-display').style.color = balance <= 0 ? '#16a34a' : '#dc2626';
      } else {
        document.getElementById('balance-display').textContent = 'Total Due: $' + GT.toFixed(2);
        document.getElementById('balance-display').style.color = '#3730a3';
        document.getElementById('balance-display').style.fontWeight = '700';
      }
      document.getElementById('dynamic-paid').innerHTML = html;
    }
    updateTotals();
    // Also show total due in toolbar on load
    document.getElementById('balance-display').textContent = 'Total Due: $' + GT.toFixed(2);
    document.getElementById('balance-display').style.color = '#3730a3';
    document.getElementById('balance-display').style.fontWeight = '700';
    // Focus print button on load
    document.getElementById('print-btn').focus();
  </script>
</body>
</html>`;
}

/**
 * Opens the invoice in a new tab.
 * Pass the window reference obtained synchronously BEFORE any async work,
 * so the browser does not block it as an async-triggered popup.
 * Usage:
 *   const win = openInvoiceWindow(); // call this synchronously
 *   await doSomeAsyncWork();
 *   writeInvoice(win, order, amountPaid); // then write
 */
export function openInvoiceWindow() {
  const win = window.open('about:blank', '_blank');
  if (!win) { alert('Please allow popups for this site to print invoices.'); return null; }
  return win;
}

export function writeInvoiceToWindow(win, order, amountPaid = 0, signatureDataUrl = null, isPractice = false) {
  if (!win) return;
  const html = buildInvoiceHTML(order, amountPaid, signatureDataUrl, isPractice);
  win.document.open();
  win.document.write(html);
  win.document.close();
}

// Legacy convenience wrapper (sync-only use)
export function openInvoicePopup(order, amountPaid = 0, signatureDataUrl = null) {
  const win = openInvoiceWindow();
  writeInvoiceToWindow(win, order, amountPaid, signatureDataUrl);
}