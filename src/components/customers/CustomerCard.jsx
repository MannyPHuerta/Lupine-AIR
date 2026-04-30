import { AlertTriangle, Ban, ShieldCheck, Building2, User, Phone, Mail, Users, Clock } from 'lucide-react';

const ACCOUNT_TYPE_LABELS = {
  individual: 'Individual',
  business:   'Business',
  municipal:  'Municipal',
  nonprofit:  'Nonprofit',
};

const PAYMENT_TERMS_SHORT = {
  due_on_receipt: 'COD',
  net_15: 'Net 15',
  net_30: 'Net 30',
  net_60: 'Net 60',
};

const ACCOUNT_COLORS = {
  individual: 'bg-indigo-100 text-indigo-600',
  business:   'bg-blue-100 text-blue-600',
  municipal:  'bg-purple-100 text-purple-600',
  nonprofit:  'bg-teal-100 text-teal-600',
};

export default function CustomerCard({ customer, rentals = [], onClick }) {
  const totalSpend = rentals.reduce((s, r) => s + (r.baseAmount || 0) + (r.taxAmount || 0), 0);
  const lastRental = rentals.length > 0
    ? [...rentals].sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))[0]
    : null;
  const isCompany = customer.accountType !== 'individual';
  const authorizedContacts = (customer.linkedContacts || []).filter(c => c.authorizedToRent !== false);
  const iconColorClass = ACCOUNT_COLORS[customer.accountType] || ACCOUNT_COLORS.individual;

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border shadow-sm p-4 text-left hover:shadow-md hover:border-indigo-300 transition w-full"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${iconColorClass}`}>
            {isCompany ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate">{customer.fullName}</div>
            {customer.companyName && (
              <div className="text-xs text-gray-500 truncate font-medium">{customer.companyName}</div>
            )}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0 mt-0.5">
          {customer.blacklisted && <Ban className="w-4 h-4 text-red-500" title="Blacklisted" />}
          {customer.creditHold && <AlertTriangle className="w-4 h-4 text-amber-500" title="Credit Hold" />}
          {customer.taxExempt && <ShieldCheck className="w-4 h-4 text-green-500" title="Tax Exempt" />}
        </div>
      </div>

      {/* Contact info */}
      <div className="space-y-0.5 mb-2">
        {customer.phone && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Phone className="w-3 h-3 flex-shrink-0" /> {customer.phone}
          </div>
        )}
        {customer.email && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Mail className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{customer.email}</span>
          </div>
        )}
      </div>

      {/* Authorized contacts for company accounts */}
      {isCompany && authorizedContacts.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-indigo-600 mb-2">
          <Users className="w-3 h-3" />
          {authorizedContacts.length} authorized contact{authorizedContacts.length !== 1 ? 's' : ''}
          {authorizedContacts.slice(0, 2).map((c, i) => (
            <span key={i} className="text-gray-500">· {c.name.split(' ')[0]}</span>
          ))}
          {authorizedContacts.length > 2 && <span className="text-gray-400">+{authorizedContacts.length - 2}</span>}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${iconColorClass}`}>
            {ACCOUNT_TYPE_LABELS[customer.accountType] || 'Individual'}
          </span>
          {customer.paymentTerms && customer.paymentTerms !== 'due_on_receipt' && (
            <span className="flex items-center gap-0.5 text-blue-600 font-medium">
              <Clock className="w-3 h-3" />
              {PAYMENT_TERMS_SHORT[customer.paymentTerms]}
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="font-medium text-gray-800">{rentals.length} rental{rentals.length !== 1 ? 's' : ''}</span>
          {totalSpend > 0 && (
            <span className="ml-2 text-indigo-600 font-semibold">
              ${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}