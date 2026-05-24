import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function CustomerVerificationStatus({ customer }) {
  if (!customer) return null;

  const getVerificationBadge = (verified, verifiedAt, label) => {
    if (!verified) return null;
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
        <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
        <span>{label}</span>
        {verifiedAt && <span className="text-gray-500 text-[10px]">({new Date(verifiedAt).toLocaleDateString()})</span>}
      </div>
    );
  };

  return (
    <div className="space-y-1.5 text-xs">
      {customer.idVerified && (
        <div className="flex items-center gap-1.5 text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
          <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
          <span>ID Verified ({customer.idType})</span>
        </div>
      )}
      {customer.phoneVerified && (
        <div className="flex items-center gap-1.5 text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
          <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
          <span>Phone Verified</span>
        </div>
      )}
      {customer.taxExempt && (
        <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1">
          <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
          <span>Tax Exempt</span>
        </div>
      )}
      {customer.creditHold && (
        <div className="flex items-center gap-1.5 text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>Credit Hold: {customer.creditHoldReason}</span>
        </div>
      )}
      {customer.blacklisted && (
        <div className="flex items-center gap-1.5 text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>🚫 Blacklisted: {customer.blacklistReason}</span>
        </div>
      )}
    </div>
  );
}