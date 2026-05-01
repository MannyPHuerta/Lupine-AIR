import { useState } from 'react';
import { Tag, Check, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function PromoCodeInput({ onApply, onRemove, appliedPromo }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');

    const allCodes = await base44.entities.PromoCode.filter({ active: true });
    const match = allCodes.find(p => p.code.toUpperCase() === code.trim().toUpperCase());

    if (!match) {
      setError('Code not found or inactive.');
      setLoading(false);
      return;
    }

    // Check expiry
    if (match.expiresAt && new Date(match.expiresAt) < new Date()) {
      setError('This promo code has expired.');
      setLoading(false);
      return;
    }

    // Check usage limit
    if (match.usageLimit && match.usageCount >= match.usageLimit) {
      setError('This code has reached its usage limit.');
      setLoading(false);
      return;
    }

    onApply(match);
    setCode('');
    setLoading(false);
  };

  if (appliedPromo) {
    return (
      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        <div className="flex items-center gap-2 text-sm text-green-800">
          <Tag className="w-3.5 h-3.5" />
          <span className="font-semibold">{appliedPromo.code}</span>
          <span className="text-green-600">
            — {appliedPromo.discountType === 'percent'
              ? `${appliedPromo.discountValue}% off`
              : `$${appliedPromo.discountValue} off`}
          </span>
        </div>
        <button onClick={onRemove} className="text-green-500 hover:text-red-500 transition">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleApply()}
            placeholder="Promo code"
            className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 uppercase"
          />
        </div>
        <button
          onClick={handleApply}
          disabled={!code.trim() || loading}
          className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Apply
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}