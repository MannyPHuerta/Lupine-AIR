import { AlertTriangle, Ban, ShieldCheck, Building2, User, Phone, Mail } from 'lucide-react';

const ACCOUNT_TYPE_LABELS = {
  individual: 'Individual',
  business: 'Business',
  municipal: 'Municipal',
  nonprofit: 'Nonprofit',
};

export default function CustomerCard({ customer, rentals = [], onClick }) {
  const totalSpend = rentals.reduce((s, r) => s + (r.baseAmount || 0) + (r.taxAmount || 0), 0);
  const lastRental = rentals.length > 0
    ? [...rentals].sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))[0]
    : null;

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border shadow-sm p-4 text-left hover:shadow-md hover:border-indigo-300 transition w-full"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            {customer.accountType !== 'individual'
              ? <Building2 className="w-4 h-4 text-indigo-600" />
              : <User className="w-4 h-4 text-indigo-600" />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate">{customer.fullName}</div>
            {customer.companyName && (
              <div className="text-xs text-gray-500 truncate">{customer.companyName}</div>
            )}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {customer.blacklisted && <Ban className="w-4 h-4 text-red-500" title="Blacklisted" />}
          {customer.creditHold && <AlertTriangle className="w-4 h-4 text-amber-500" title="Credit Hold" />}
          {customer.taxExempt && <ShieldCheck className="w-4 h-4 text-green-500" title="Tax Exempt" />}
        </div>
      </div>

      <div className="space-y-1 mb-3">
        {customer.phone && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Phone className="w-3 h-3" /> {customer.phone}
          </div>
        )}
        {customer.email && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Mail className="w-3 h-3" /> <span className="truncate">{customer.email}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
        <span>{ACCOUNT_TYPE_LABELS[customer.accountType] || 'Individual'}</span>
        <div className="text-right">
          <span className="font-medium text-gray-800">{rentals.length} rental{rentals.length !== 1 ? 's' : ''}</span>
          {totalSpend > 0 && <span className="ml-2 text-indigo-600 font-semibold">${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>}
        </div>
      </div>
    </button>
  );
}