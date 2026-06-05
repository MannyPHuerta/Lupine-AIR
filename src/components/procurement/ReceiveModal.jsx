import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Package, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReceiveModal({ po, user, onClose, onReceived }) {
  const [lines, setLines] = useState(
    (po.lineItems || []).map(l => ({ ...l, qtyReceivedInput: l.qtyRequested }))
  );
  const [receiptNotes, setReceiptNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const setQty = (idx, val) => {
    setLines(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], qtyReceivedInput: parseFloat(val) || 0 };
      return next;
    });
  };

  const hasDiscrepancies = lines.some(l => l.qtyReceivedInput !== l.qtyRequested);

  const handleReceive = async () => {
    setSaving(true);
    const updatedLines = lines.map(l => ({ ...l, qtyReceived: l.qtyReceivedInput }));

    // Update stock levels
    for (const line of updatedLines) {
      if (line.supplyItemId && line.qtyReceived > 0) {
        const item = await base44.entities.SupplyItem.get(line.supplyItemId).catch(() => null);
        if (item) {
          await base44.entities.SupplyItem.update(line.supplyItemId, {
            currentStock: (item.currentStock || 0) + line.qtyReceived,
            lastUnitPrice: line.unitPrice || item.lastUnitPrice,
          });
        }
      }
    }

    const allReceived = updatedLines.every(l => l.qtyReceived >= l.qtyRequested);
    const updated = await base44.entities.PurchaseOrder.update(po.id, {
      status: allReceived ? 'received' : 'partially_received',
      lineItems: updatedLines,
      receivedAt: new Date().toISOString(),
      receivedBy: user?.email || '',
      receiptNotes: [receiptNotes, hasDiscrepancies ? `Discrepancies: ${updatedLines.filter(l => l.qtyReceived !== l.qtyRequested).map(l => `${l.itemName} (ordered ${l.qtyRequested}, received ${l.qtyReceived})`).join('; ')}` : ''].filter(Boolean).join(' | '),
    });
    setSaving(false);
    onReceived(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <div className="font-semibold text-gray-900">Receive Order</div>
            <div className="text-xs text-gray-500">{po.poNumber} · {po.vendorName}</div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500">Enter the quantity actually received for each item. Discrepancies will be flagged automatically.</p>

          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="text-left py-1">Item</th>
                <th className="text-center py-1">Ordered</th>
                <th className="text-center py-1">Received</th>
                <th className="text-center py-1">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lines.map((line, i) => {
                const ok = line.qtyReceivedInput === line.qtyRequested;
                const short = line.qtyReceivedInput < line.qtyRequested;
                return (
                  <tr key={i}>
                    <td className="py-2 pr-2">{line.itemName}</td>
                    <td className="py-2 text-center text-gray-500">{line.qtyRequested} {line.unit}</td>
                    <td className="py-2 text-center">
                      <input
                        type="number"
                        value={line.qtyReceivedInput}
                        onChange={e => setQty(i, e.target.value)}
                        min={0}
                        max={line.qtyRequested * 2}
                        className="w-16 border rounded px-2 py-1 text-center text-xs"
                      />
                    </td>
                    <td className="py-2 text-center">
                      {ok ? (
                        <span className="text-green-600 font-medium">✓</span>
                      ) : short ? (
                        <span className="text-amber-600 flex items-center justify-center gap-0.5"><AlertTriangle className="w-3 h-3" /> Short</span>
                      ) : (
                        <span className="text-blue-600 font-medium">Over</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {hasDiscrepancies && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 flex gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Discrepancies detected — these will be logged on the PO automatically.
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-600">Additional Receipt Notes</label>
            <textarea value={receiptNotes} onChange={e => setReceiptNotes(e.target.value)} rows={2} placeholder="Damage, wrong items, delivery notes..." className="mt-1 w-full border rounded-lg px-3 py-2 text-xs resize-none" />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-1.5" onClick={handleReceive} disabled={saving}>
              <Package className="w-3.5 h-3.5" /> {saving ? 'Saving...' : `Confirm Receipt${hasDiscrepancies ? ' (with discrepancies)' : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}