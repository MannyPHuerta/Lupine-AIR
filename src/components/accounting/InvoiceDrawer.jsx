import { X, FileText, User, MapPin, Calendar, DollarSign, CreditCard, Copy, Check } from 'lucide-react';
import { useState } from 'react';

const QB_ACCOUNTS = {
  rentalIncome: 'Rental Income',
  deliveryIncome: 'Delivery Income',
  salesTaxPayable: 'Sales Tax Payable',
  customerDeposits: 'Customer Deposits',
  accountsReceivable: 'Accounts Receivable',
  unappliedCash: 'Undeposited Funds',
};

function fmt(n) {
  return `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function generateSingleIIF(r) {
  if (!r) return '';
  const lines = [];
  lines.push('!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO');
  lines.push('!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO');
  lines.push('!ENDTRNS');

  const date = r.startDate || '';
  const base = r.baseAmount || 0;
  const tax = r.taxAmount || 0;
  const delivery = (r.deliveryFee || 0) + (r.returnFee || 0);
  const total = base + tax + delivery;
  const paid = r.amountPaid || 0;
  const deposit = r.deposit || 0;

  lines.push(`TRNS\tINVOICE\t${date}\t${QB_ACCOUNTS.accountsReceivable}\t${r.customerName}\t${total.toFixed(2)}\t${r.invoiceNumber}\t`);
  if (base > 0) lines.push(`SPL\tINVOICE\t${date}\t${QB_ACCOUNTS.rentalIncome}\t${r.customerName}\t-${base.toFixed(2)}\tRental`);
  if (delivery > 0) lines.push(`SPL\tINVOICE\t${date}\t${QB_ACCOUNTS.deliveryIncome}\t${r.customerName}\t-${delivery.toFixed(2)}\tDelivery`);
  if (tax > 0) lines.push(`SPL\tINVOICE\t${date}\t${QB_ACCOUNTS.salesTaxPayable}\t${r.customerName}\t-${tax.toFixed(2)}\tSales Tax`);
  lines.push('ENDTRNS');

  if (deposit > 0) {
    lines.push(`TRNS\tRECEIPT\t${date}\t${QB_ACCOUNTS.unappliedCash}\t${r.customerName}\t${deposit.toFixed(2)}\t${r.invoiceNumber}-DEP\tSecurity Deposit`);
    lines.push(`SPL\tRECEIPT\t${date}\t${QB_ACCOUNTS.customerDeposits}\t${r.customerName}\t-${deposit.toFixed(2)}\tDeposit`);
    lines.push('ENDTRNS');
  }

  if (paid > 0) {
    lines.push(`TRNS\tRECEIPT\t${date}\t${QB_ACCOUNTS.unappliedCash}\t${r.customerName}\t${paid.toFixed(2)}\t${r.invoiceNumber}-PMT\tPayment`);
    lines.push(`SPL\tRECEIPT\t${date}\t${QB_ACCOUNTS.accountsReceivable}\t${r.customerName}\t-${paid.toFixed(2)}\tPayment`);
    lines.push('ENDTRNS');
  }

  return lines.join('\n');
}

function Row({ label, value, valueClass = 'text-gray-900' }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}

export default function InvoiceDrawer({ rental, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!rental) return null;

  const base = rental.baseAmount || 0;
  const tax = rental.taxAmount || 0;
  const delivery = (rental.deliveryFee || 0) + (rental.returnFee || 0);
  const deposit = rental.deposit || 0;
  const total = base + tax + delivery;
  const paid = rental.amountPaid || 0;
  const balance = total - paid;

  const iif = generateSingleIIF(rental);

  const handleCopyIIF = () => {
    navigator.clipboard.writeText(iif).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const statusColors = {
    completed: 'bg-green-100 text-green-700',
    out: 'bg-blue-100 text-blue-700',
    returned: 'bg-purple-100 text-purple-700',
    contract: 'bg-indigo-100 text-indigo-700',
    reservation: 'bg-amber-100 text-amber-700',
    quote: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-600',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-900 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="font-bold text-lg font-mono">{rental.invoiceNumber || 'No Invoice #'}</div>
            <div className="text-emerald-300 text-xs mt-0.5">{rental.customerName}</div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[rental.status] || 'bg-gray-100 text-gray-600'}`}>
              {rental.status}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-emerald-800 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Customer Info */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              <User className="w-3.5 h-3.5" /> Customer
            </div>
            <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
              <div className="font-semibold text-gray-900">{rental.customerName}</div>
              {rental.customerEmail && <div className="text-gray-500">{rental.customerEmail}</div>}
              {rental.customerPhone && <div className="text-gray-500">{rental.customerPhone}</div>}
              {rental.customerAddress && (
                <div className="text-gray-500 text-xs mt-2">
                  {rental.customerAddress}{rental.customerCity ? `, ${rental.customerCity}` : ''}
                  {rental.customerState ? `, ${rental.customerState}` : ''}
                  {rental.customerZip ? ` ${rental.customerZip}` : ''}
                </div>
              )}
            </div>
          </div>

          {/* Rental Dates */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              <Calendar className="w-3.5 h-3.5" /> Rental Period
            </div>
            <div className="bg-gray-50 rounded-lg p-4 flex gap-6 text-sm">
              <div>
                <div className="text-gray-400 text-xs mb-0.5">Start</div>
                <div className="font-semibold text-gray-900">{rental.startDate || '—'}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-0.5">End</div>
                <div className="font-semibold text-gray-900">{rental.endDate || '—'}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-0.5">Days</div>
                <div className="font-semibold text-gray-900">{rental.totalDays || '—'}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-0.5">Branch</div>
                <div className="font-semibold text-gray-900">{rental.branch || '—'}</div>
              </div>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              <DollarSign className="w-3.5 h-3.5" /> Financial Breakdown
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-2">
              <Row label="Rental (base)" value={fmt(base)} />
              {delivery > 0 && <Row label="Delivery / Return" value={fmt(delivery)} valueClass="text-blue-700" />}
              <Row label="Sales Tax" value={fmt(tax)} valueClass="text-amber-700" />
              <Row label="Invoice Total" value={fmt(total)} valueClass="text-gray-900 font-bold" />
              {deposit > 0 && <Row label="Security Deposit" value={fmt(deposit)} valueClass="text-purple-700" />}
              <Row label="Amount Paid" value={fmt(paid)} valueClass="text-green-700" />
              <Row
                label="Balance Due"
                value={fmt(balance)}
                valueClass={balance > 0 ? 'text-red-600 font-bold' : 'text-gray-400'}
              />
            </div>
          </div>

          {/* QB Mapping Preview */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              <FileText className="w-3.5 h-3.5" /> QuickBooks IIF Entry
            </div>
            <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre leading-relaxed max-h-64 overflow-y-auto">
              {iif}
            </pre>
            <button
              onClick={handleCopyIIF}
              className="mt-2 w-full flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium py-2 rounded-lg transition"
            >
              {copied ? <><Check className="w-3.5 h-3.5 text-green-600" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy IIF to clipboard</>}
            </button>
          </div>

          {/* Notes */}
          {rental.notes && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-sm text-gray-700">{rental.notes}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}