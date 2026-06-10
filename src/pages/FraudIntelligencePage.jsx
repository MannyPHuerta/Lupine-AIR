import { useState, useEffect } from 'react';
import { supabaseData } from '@/lib/supabaseData';
import { ShieldAlert, RefreshCw, Loader2, DollarSign } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';
import FraudIntelTab from '@/components/reports/FraudIntelTab';
import VarianceAnalysisPanel from '@/components/cash/VarianceAnalysisPanel';

export default function FraudIntelligencePage() {
  const [rentals, setRentals] = useState([]);
  const [drawers, setDrawers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [rent, drawerList] = await Promise.all([
      supabaseData.Rental.list('-created_date', 2000),
      supabaseData.CashDrawer.list('-shiftDate', 500),
    ]);
    setRentals(rent);
    setDrawers(drawerList);
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
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-white/40">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading transaction data…</span>
          </div>
        ) : (
          <>
            {/* Cash Drawer Variance Analysis */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <h2 className="text-amber-400 font-bold text-sm uppercase tracking-widest">Cash Drawer Variance Analysis</h2>
              </div>
              <VarianceAnalysisPanel drawers={drawers} />
            </div>

            {/* Divider */}
            <div className="border-t border-white/10" />

            {/* Rental Transaction Fraud Intel */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <h2 className="text-red-400 font-bold text-sm uppercase tracking-widest">Rental Transaction Analysis</h2>
              </div>
              <FraudIntelTab rentals={rentals} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}