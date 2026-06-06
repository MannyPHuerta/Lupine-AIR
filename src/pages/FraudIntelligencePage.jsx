import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ShieldAlert, RefreshCw, Loader2 } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';
import FraudIntelTab from '@/components/reports/FraudIntelTab';

export default function FraudIntelligencePage() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const rent = await base44.entities.Rental.list('-created_date', 2000);
    setRentals(rent);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      <AppPageHeader
        title="Fraud Intelligence"
        icon={ShieldAlert}
        action={
          <button onClick={load} disabled={loading} className="p-1.5 rounded-lg hover:bg-white/10 text-white">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-white/40">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading transaction data…</span>
          </div>
        ) : (
          <FraudIntelTab rentals={rentals} />
        )}
      </div>
    </div>
  );
}