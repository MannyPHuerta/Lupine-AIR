const fmt = (n) => (n || 0).toFixed(2);

/**
 * Builds a self-contained invoice HTML string.
 * @param {object} order - { customer, lines, taxRate, id, createdAt, branchInfo, companyInfo }
 * @param {number} amountPaid
 */
export function buildInvoiceHTML(order, amountPaid = 0) {
  // Use passed-in branch/company info, fallback to defaults
  const branch = order.branchInfo || { name: 'Rental World LLC', address: '', phone: '', email: '' };
  const company = order.companyInfo || { companyName: 'Rental World LLC', logoUrl: '', invoiceFooter: '' };
  const lines = order.lines;
  const taxRateDecimal = (parseFloat(order.taxRate) || 8.25) / 100;

  const rentalSubtotal = lines.reduce((s, l) => s + (l.baseAmount || 0), 0);
  const depositTotal = lines.reduce((s, l) => s + (l.deposit || 0) * (l.quantity || 1), 0);
  // Default taxable=true unless explicitly false
  const taxableBase = lines.reduce((s, l) => s + (l.taxable !== false ? (l.baseAmount || 0) : 0), 0);
  const taxAmount = Math.round(taxableBase * taxRateDecimal * 100) / 100;
  const grandTotal = rentalSubtotal + taxAmount + depositTotal;
  const paid = parseFloat(amountPaid) || 0;

  const dateStr = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

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

    return `
      <tr>
        <td style="padding:6px 8px 6px 0;border-bottom:1px solid #f0f0f0;">
          <div style="font-weight:500">${l.equipmentName || ''}</div>
          ${specsStr ? `<div style="font-size:10px;color:#888;margin-top:3px;line-height:1.6">${specsStr}</div>` : ''}
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

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice – ${order.customer.name}</title>
  <style>
    body { font-family: sans-serif; font-size: 13px; color: #111; margin: 0; padding: 32px; }
    @media print { body { padding: 16px; } #toolbar { display: none !important; } }
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
    ${order.customer.phone ? `<div style="color:#555">${order.customer.phone}</div>` : ''}
    ${order.customer.email ? `<div style="color:#555">${order.customer.email}</div>` : ''}
    ${order.customer.notes ? `<div style="color:#888;font-size:12px;margin-top:6px;font-style:italic">${order.customer.notes}</div>` : ''}
  </div>

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
      <div class="total-row"><span>Sales Tax (${(taxRateDecimal * 100).toFixed(2)}%)</span><span>$${fmt(taxAmount)}</span></div>
      ${depositTotal > 0 ? `<div class="total-row"><span>Deposits</span><span>$${fmt(depositTotal)}</span></div>` : ''}
      <div class="grand-row"><span>Total Due</span><span style="color:#3730a3">$${fmt(grandTotal)}</span></div>
      <div id="dynamic-paid"></div>
    </div>
  </div>

  <div style="margin-top:32px;border-top:2px solid #1e1b4b;padding-top:20px;font-size:12px">
    <div style="display:flex;justify-content:space-between;gap:40px;margin-bottom:32px">
      <div>
        <div style="border-bottom:1px solid #111;width:200px;height:40px"></div>
        <div style="margin-top:4px;font-weight:600;color:#111">Authorized Signature</div>
        <div style="font-size:10px;color:#666;margin-top:2px">Date: __________________</div>
      </div>
    </div>
    
    <div style="font-size:11px;line-height:1.6;color:#333;background:#f9fafb;padding:12px;border-radius:6px;margin-bottom:16px">
      <strong>AGREEMENT TO PAY:</strong> The undersigned agrees to pay the amount due as shown on this invoice in full according to the terms specified. Equipment must be returned by the end date listed above in good condition. Customer acknowledges acceptance of all rental terms and conditions.
    </div>
  </div>

  <div style="border-top:1px solid #e5e7eb;padding-top:16px;font-size:11px;color:#aaa;text-align:center">
    ${company.invoiceFooter || `Thank you for your business! Questions? Contact us at ${branch.email || branch.phone || 'your local branch'}.`}
  </div>

  <script>
    var GT = ${grandTotal};
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
        document.getElementById('balance-display').textContent = '';
      }
      document.getElementById('dynamic-paid').innerHTML = html;
    }
    updateTotals();
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

export function writeInvoiceToWindow(win, order, amountPaid = 0) {
  if (!win) return;
  const html = buildInvoiceHTML(order, amountPaid);
  win.document.open();
  win.document.write(html);
  win.document.close();
}

// Legacy convenience wrapper (sync-only use)
export function openInvoicePopup(order, amountPaid = 0) {
  const win = openInvoiceWindow();
  writeInvoiceToWindow(win, order, amountPaid);
}