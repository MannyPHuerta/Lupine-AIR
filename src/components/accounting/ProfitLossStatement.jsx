import { useMemo } from 'react';
import { calculateDepreciation } from '@/lib/depreciation';

function fmt(n) {
  const abs = Math.abs(n || 0);
  const str = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `($${str})` : `$${str}`;
}

function PLRow({ label, value, indent = false, bold = false, highlight = false, negative = false, borderTop = false, subtext = '' }) {
  const isNeg = value < 0 || negative;
  return (
    <div className={`flex justify-between items-baseline py-1.5 text-sm ${borderTop ? 'border-t border-gray-200 mt-1 pt-2.5' : 'border-b border-gray-50'} ${highlight ? 'bg-emerald-50 -mx-4 px-4 rounded' : ''}`}>
      <span className={`${indent ? 'pl-6 text-gray-600' : bold ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
        {label}
        {subtext && <span className="text-xs text-gray-400 ml-2">{subtext}</span>}
      </span>
      <span className={`font-mono ${bold ? 'font-bold text-base' : 'text-sm'} ${highlight ? (isNeg ? 'text-red-600' : 'text-emerald-700') : isNeg ? 'text-red-600' : 'text-gray-900'}`}>
        {fmt(value)}
      </span>
    </div>
  );
}

function SectionHeader({ label }) {
  return (
    <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-5 mb-1 pb-1 border-b border-gray-200">
      {label}
    </div>
  );
}

export default function ProfitLossStatement({ rentals, expenses, equipment, period, dateFrom, dateTo, branch, capitalizationThreshold }) {
  const pl = useMemo(() => {
    // ── Revenue ──────────────────────────────────────────────────────────────
    const completed = rentals.filter(r => ['completed', 'returned', 'out', 'contract'].includes(r.status));
    const rentalRevenue = completed.reduce((s, r) => s + (r.baseAmount || 0), 0);
    const deliveryRevenue = completed.reduce((s, r) => s + (r.deliveryFee || 0) + (r.returnFee || 0), 0);
    const lateFeeRevenue = completed.reduce((s, r) => s + (r.lateFeeTotal || 0), 0);
    const extraShiftRevenue = completed.reduce((s, r) => s + (r.extraShiftTotal || 0), 0);
    const hourMeterRevenue = completed.reduce((s, r) => s + (r.hourMeterCharges || 0), 0);
    const subrentMarkupRevenue = completed.reduce((s, r) => s + (r.subrentMarkup || 0), 0);
    const grossRevenue = rentalRevenue + deliveryRevenue + lateFeeRevenue + extraShiftRevenue + hourMeterRevenue + subrentMarkupRevenue;

    // ── Operating Expenses ────────────────────────────────────────────────────
    // Only non-capitalized expenses count as operating expenses
    const opExpenses = expenses.filter(e => !e.isCapitalized);
    const expByCategory = {};
    opExpenses.forEach(e => {
      expByCategory[e.category] = (expByCategory[e.category] || 0) + (e.amount || 0);
    });
    const totalOpExpenses = opExpenses.reduce((s, e) => s + (e.amount || 0), 0);

    const operatingIncome = grossRevenue - totalOpExpenses;

    // ── Depreciation ─────────────────────────────────────────────────────────
    // Annualize then prorate to the selected period
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    const periodDays = Math.max(1, (toDate - fromDate) / (1000 * 60 * 60 * 24));
    const periodYears = periodDays / 365;

    let totalDepreciation = 0;
    const depreciableEquipment = equipment.filter(e =>
      e.purchaseCost && e.usefulLifeYears && e.purchaseDate &&
      e.unitStatus !== 'retired' &&
      (e.purchaseCost || 0) >= capitalizationThreshold
    );

    depreciableEquipment.forEach(eq => {
      const result = calculateDepreciation(eq, toDate);
      if (result) {
        // Annual depreciation prorated to period
        const annualDepr = (eq.purchaseCost - (eq.salvageValue || 0)) / eq.usefulLifeYears;
        totalDepreciation += annualDepr * periodYears;
      }
    });

    const netIncome = operatingIncome - totalDepreciation;

    return {
      rentalRevenue, deliveryRevenue, lateFeeRevenue, extraShiftRevenue, hourMeterRevenue, subrentMarkupRevenue, grossRevenue,
      expByCategory, totalOpExpenses,
      operatingIncome,
      totalDepreciation, depreciableCount: depreciableEquipment.length,
      netIncome,
    };
  }, [rentals, expenses, equipment, dateFrom, dateTo, capitalizationThreshold]);

  const categories = [
    'Fuel', 'Repairs / Parts', 'Labor', 'Shop Supplies', 'Insurance',
    'Rent / Lease', 'Utilities', 'Vehicle', 'Subcontractors', 'Equipment Purchase', 'Other'
  ];

  return (
    <div className="bg-white border rounded-lg shadow-sm p-6">
      {/* Title */}
      <div className="text-center mb-6">
        <div className="text-lg font-bold text-gray-900">Profit & Loss Statement</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {branch !== 'All Branches' ? branch : 'All Branches'} · {dateFrom} → {dateTo}
        </div>
      </div>

      {/* ── REVENUE ── */}
      <SectionHeader label="Revenue" />
      <PLRow label="Rental Revenue" value={pl.rentalRevenue} indent />
      <PLRow label="Delivery Revenue" value={pl.deliveryRevenue} indent />
      {pl.lateFeeRevenue > 0 && <PLRow label="Late Fee Revenue" value={pl.lateFeeRevenue} indent />}
      {pl.extraShiftRevenue > 0 && <PLRow label="Extra Shift Revenue" value={pl.extraShiftRevenue} indent />}
      {pl.hourMeterRevenue > 0 && <PLRow label="Hour Meter Charges" value={pl.hourMeterRevenue} indent />}
      {pl.subrentMarkupRevenue > 0 && <PLRow label="Subrent Markup" value={pl.subrentMarkupRevenue} indent />}
      <PLRow label="Gross Revenue" value={pl.grossRevenue} bold borderTop highlight />

      {/* ── OPERATING EXPENSES ── */}
      <SectionHeader label="Operating Expenses" />
      {categories.map(cat => {
        const val = pl.expByCategory[cat];
        if (!val) return null;
        return <PLRow key={cat} label={cat} value={val} indent negative />;
      })}
      {pl.totalOpExpenses === 0 && (
        <div className="text-xs text-gray-400 pl-6 py-2 italic">No operating expenses logged for this period</div>
      )}
      <PLRow label="Total Operating Expenses" value={-pl.totalOpExpenses} bold borderTop negative />

      {/* ── OPERATING INCOME ── */}
      <PLRow
        label="Operating Income"
        value={pl.operatingIncome}
        bold
        borderTop
        highlight
        subtext="(before depreciation)"
      />

      {/* ── DEPRECIATION BLOCK ── */}
      <SectionHeader label="Net Income (after Depreciation)" />
      <PLRow
        label={`Depreciation`}
        value={-pl.totalDepreciation}
        indent
        negative
        subtext={`${pl.depreciableCount} assets ≥ $${capitalizationThreshold.toLocaleString()}, prorated`}
      />
      <PLRow
        label="Net Income"
        value={pl.netIncome}
        bold
        borderTop
        highlight
      />
    </div>
  );
}