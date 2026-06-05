import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PriceHistoryModal({ item, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.PurchaseOrder.list('-created_date', 500).then(orders => {
      const entries = [];
      orders.forEach(po => {
        (po.lineItems || []).forEach(line => {
          if (line.supplyItemId === item.id && line.unitPrice) {
            entries.push({
              date: new Date(po.created_date).toLocaleDateString(),
              rawDate: po.created_date,
              price: line.unitPrice,
              po: po.poNumber || `PO-${po.id.slice(-6).toUpperCase()}`,
              vendor: po.vendorName,
            });
          }
        });
      });
      entries.sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));
      setHistory(entries);
      setLoading(false);
    });
  }, [item.id]);

  const latest = history[history.length - 1];
  const previous = history[history.length - 2];
  const change = latest && previous ? ((latest.price - previous.price) / previous.price * 100) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <div className="font-semibold text-gray-900">{item.name}</div>
            <div className="text-xs text-gray-500">Price History</div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading...</div>
          ) : history.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm">No price history found in past purchase orders.</div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500">Current Price</div>
                  <div className="font-bold text-gray-900">${latest.price.toFixed(2)}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500">Orders Tracked</div>
                  <div className="font-bold text-gray-900">{history.length}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500">vs. Last Order</div>
                  <div className={`font-bold flex items-center justify-center gap-1 ${change === null ? 'text-gray-500' : change > 0 ? 'text-red-600' : change < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                    {change === null ? <><Minus className="w-3 h-3" /> —</> : change > 0 ? <><TrendingUp className="w-3 h-3" /> +{change.toFixed(1)}%</> : change < 0 ? <><TrendingDown className="w-3 h-3" /> {change.toFixed(1)}%</> : <><Minus className="w-3 h-3" /> 0%</>}
                  </div>
                </div>
              </div>

              {/* Chart */}
              {history.length > 1 && (
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
                    <Tooltip formatter={v => [`$${Number(v).toFixed(2)}`, 'Unit Price']} />
                    <Line type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {/* Table */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b">
                    <th className="text-left py-1">Date</th>
                    <th className="text-left py-1">PO #</th>
                    <th className="text-left py-1">Vendor</th>
                    <th className="text-right py-1">Unit Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...history].reverse().map((h, i) => (
                    <tr key={i}>
                      <td className="py-1.5">{h.date}</td>
                      <td className="py-1.5 text-indigo-600">{h.po}</td>
                      <td className="py-1.5 text-gray-600">{h.vendor}</td>
                      <td className="py-1.5 text-right font-medium">${h.price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}