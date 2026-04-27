import { getBranchInfo } from '@/lib/branchInfo';

function fmt(n) { return (n || 0).toFixed(2); }

export default function PrintableInvoice({ order }) {
  const { customer, lines, discount, taxRate, createdAt, id } = order;
  const branch = getBranchInfo(customer.branch);

  const rentalSubtotal = lines.reduce((s, l) => s + (l.baseAmount || 0), 0);
  const depositTotal = lines.reduce((s, l) => s + (l.deposit || 0) * (l.quantity || 1), 0);
  const discountAmount = Math.min(Math.max(parseFloat(discount) || 0, 0), rentalSubtotal);
  const taxableBase = lines.reduce((s, l) => s + (l.taxable ? (l.baseAmount || 0) : 0), 0);
  const taxRateDecimal = (parseFloat(taxRate) || 8.25) / 100;
  const taxAmount = Math.round((taxableBase - discountAmount) * taxRateDecimal * 100) / 100;
  const grandTotal = rentalSubtotal - discountAmount + taxAmount + depositTotal;

  const dateStr = createdAt ? new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <div className="font-body text-sm text-gray-900 bg-white p-8 max-w-3xl mx-auto print:p-4 print:max-w-none">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="text-2xl font-bold text-indigo-900 font-label">{branch.name}</div>
          {branch.address && <div className="text-gray-600 mt-1">{branch.address}</div>}
          {branch.phone && <div className="text-gray-600">{branch.phone}</div>}
          {branch.email && <div className="text-gray-600">{branch.email}</div>}
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-gray-300 font-label">INVOICE</div>
          {id && <div className="text-xs text-gray-500 mt-1">#{id.slice(-8).toUpperCase()}</div>}
          {dateStr && <div className="text-xs text-gray-500">{dateStr}</div>}
        </div>
      </div>

      {/* Bill To */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Bill To</div>
        <div className="font-semibold text-gray-900">{customer.name}</div>
        {customer.phone && <div className="text-gray-600">{customer.phone}</div>}
        {customer.email && <div className="text-gray-600">{customer.email}</div>}
        {customer.notes && <div className="text-gray-500 text-xs mt-2 italic">{customer.notes}</div>}
      </div>

      {/* Line Items Table */}
      <table className="w-full mb-6">
        <thead>
          <tr className="border-b-2 border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <th className="text-left pb-2">Item</th>
            <th className="text-center pb-2 w-16">Qty</th>
            <th className="text-center pb-2 w-28">Dates</th>
            <th className="text-right pb-2 w-20">Rate/Day</th>
            <th className="text-right pb-2 w-24">Rental</th>
            <th className="text-right pb-2 w-20">Tax</th>
            <th className="text-right pb-2 w-20">Deposit</th>
            <th className="text-right pb-2 w-24">Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.filter(l => l.equipmentId).map((l, i) => {
            const tax = l.taxable ? Math.round((l.baseAmount || 0) * taxRateDecimal * 100) / 100 : 0;
            const total = (l.baseAmount || 0) + tax + (l.deposit || 0) * (l.quantity || 1);
            return (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2 pr-2 font-medium">{l.equipmentName}</td>
                <td className="py-2 text-center text-gray-600">{l.quantity}</td>
                <td className="py-2 text-center text-xs text-gray-600">
                  {l.startDate && l.endDate ? `${l.startDate} – ${l.endDate}` : '—'}
                </td>
                <td className="py-2 text-right text-gray-600">${fmt(l.rate)}</td>
                <td className="py-2 text-right">${fmt(l.baseAmount)}</td>
                <td className="py-2 text-right text-gray-600">{l.taxable ? `$${fmt(tax)}` : '—'}</td>
                <td className="py-2 text-right text-gray-600">{l.deposit > 0 ? `$${fmt((l.deposit || 0) * (l.quantity || 1))}` : '—'}</td>
                <td className="py-2 text-right font-semibold">${fmt(total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-60 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Rental Subtotal</span><span>${fmt(rentalSubtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Discount</span><span>−${fmt(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>Sales Tax ({(taxRateDecimal * 100).toFixed(2)}%)</span><span>${fmt(taxAmount)}</span>
          </div>
          {depositTotal > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Deposits</span><span>${fmt(depositTotal)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
            <span>Total Due</span><span className="text-indigo-700">${fmt(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t pt-4 text-xs text-gray-400 text-center">
        Thank you for your business! Questions? Contact us at {branch.email || branch.phone || 'your local branch'}.
      </div>
    </div>
  );
}