import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Receipt, Trash2 } from 'lucide-react';
import FieldExpenseCapture from './FieldExpenseCapture';

const CATEGORY_COLORS = {
  'Fuel': 'bg-orange-100 text-orange-700',
  'Towing': 'bg-red-100 text-red-700',
  'Meals / Per Diem': 'bg-yellow-100 text-yellow-700',
  'Lodging': 'bg-blue-100 text-blue-700',
  'Permits': 'bg-purple-100 text-purple-700',
  'Fines / Tickets': 'bg-red-100 text-red-800',
  'Hospitality': 'bg-pink-100 text-pink-700',
  'Equipment Rental': 'bg-indigo-100 text-indigo-700',
  'Subcontractors': 'bg-teal-100 text-teal-700',
  'Miscellaneous Field': 'bg-gray-100 text-gray-700',
  'Other': 'bg-gray-100 text-gray-600',
};

export default function JobPLPanel({ rental, branch }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadExpenses = async () => {
    if (!rental?.invoiceNumber) { setLoading(false); return; }
    setLoading(true);
    const exps = await base44.entities.Expense.filter({ jobInvoiceNumber: rental.invoiceNumber });
    setExpenses(exps);
    setLoading(false);
  };

  useEffect(() => { loadExpenses(); }, [rental?.invoiceNumber]);

  const revenue = useMemo(() => {
    const base = rental?.baseAmount || 0;
    const delivery = rental?.deliveryFee || 0;
    const ret = rental?.returnFee || 0;
    return base + delivery + ret;
  }, [rental]);

  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + (e.amount || 0), 0), [expenses]);
  const grossProfit = revenue - totalExpenses;
  const margin = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : 0;

  // Group expenses by category
  const byCategory = useMemo(() => {
    const map = {};
    expenses.forEach(e => {
      if (!map[e.category]) map[e.category] = 0;
      map[e.category] += e.amount || 0;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const handleDelete = async (id) => {
    if (!confirm('Remove this expense?')) return;
    await base44.entities.Expense.delete(id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  if (!rental?.invoiceNumber) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center text-gray-400 text-sm">
        Load an event plan with an invoice number to track P&amp;L.
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-500 mb-1">Revenue</div>
          <div className="text-xl font-black text-green-700">${revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <div className="text-xs text-gray-400">Invoice {rental.invoiceNumber}</div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="text-xs text-gray-500 mb-1">Total Expenses</div>
          <div className="text-xl font-black text-red-600">${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <div className="text-xs text-gray-400">{expenses.length} line items</div>
        </div>
        <div className={`rounded-xl border p-4 ${grossProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="text-xs text-gray-500 mb-1">Gross Profit</div>
          <div className={`text-xl font-black flex items-center gap-1 ${grossProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {grossProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            ${Math.abs(grossProfit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-400">{grossProfit < 0 ? 'Loss' : 'Profit'}</div>
        </div>
        <div className={`rounded-xl border p-4 ${parseFloat(margin) >= 0 ? 'bg-indigo-50' : 'bg-red-50'}`}>
          <div className="text-xs text-gray-500 mb-1">Margin</div>
          <div className={`text-xl font-black ${parseFloat(margin) >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>{margin}%</div>
          <div className="text-xs text-gray-400">{rental.customerName}</div>
        </div>
      </div>

      {/* Add Expense button */}
      <div className="flex justify-end">
        <FieldExpenseCapture
          jobInvoiceNumber={rental.invoiceNumber}
          jobName={rental.majorJobName || rental.customerName}
          branch={branch}
          onSaved={loadExpenses}
        />
      </div>

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Expense Breakdown
          </div>
          {byCategory.map(([cat, total]) => (
            <div key={cat} className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-600'}`}>
                {cat}
              </span>
              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-red-400 rounded-full"
                  style={{ width: `${totalExpenses > 0 ? (total / totalExpenses) * 100 : 0}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-700 w-20 text-right">
                ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Expense line items */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-2">
          <Receipt className="w-3.5 h-3.5" /> All Expenses
        </div>
        {expenses.length === 0 ? (
          <div className="text-center text-gray-400 py-10 text-sm">
            No expenses logged yet. Use "Add Expense" to capture receipts in the field.
          </div>
        ) : (
          expenses.map(exp => (
            <div key={exp.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-0">
              {exp.receiptUrl && (
                <a href={exp.receiptUrl} target="_blank" rel="noopener noreferrer">
                  <img src={exp.receiptUrl} alt="receipt" className="w-8 h-8 object-cover rounded border" />
                </a>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900">{exp.vendor || '—'}</div>
                <div className="text-xs text-gray-500">
                  {exp.date} · {exp.category}
                  {exp.capturedByDriver && <span className="ml-1 text-emerald-600 font-medium">· Field capture</span>}
                </div>
                {exp.description && <div className="text-xs text-gray-400 truncate">{exp.description}</div>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-bold text-red-600 text-sm">${(exp.amount || 0).toFixed(2)}</span>
                <button onClick={() => handleDelete(exp.id)} className="text-gray-300 hover:text-red-500 transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}