import React from 'react';
import { X, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function POPrintView({ po, onClose }) {
  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
        {/* Toolbar - hidden on print */}
        <div className="flex items-center justify-between px-6 py-4 border-b print:hidden">
          <span className="font-semibold text-gray-800">Print / Save PO</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={handlePrint} className="gap-1.5"><Printer className="w-4 h-4" /> Print</Button>
            <Button size="sm" variant="outline" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Printable content */}
        <div className="p-8 print:p-0 font-sans text-sm text-gray-900" id="po-print">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PURCHASE ORDER</h1>
              <div className="text-lg font-semibold text-indigo-600 mt-1">{po.poNumber || `PO-${po.id.slice(-6).toUpperCase()}`}</div>
            </div>
            <div className="text-right text-xs text-gray-500">
              <div className="font-semibold text-gray-800 text-sm">{po.branch}</div>
              <div>Date: {new Date(po.created_date).toLocaleDateString()}</div>
              {po.expectedDeliveryDate && <div>Expected Delivery: {po.expectedDeliveryDate}</div>}
              {po.isUrgent && <div className="text-red-600 font-bold mt-1">⚠️ URGENT / RUSH ORDER</div>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="border rounded-lg p-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Vendor</div>
              <div className="font-semibold">{po.vendorName}</div>
              {po.vendorEmail && <div className="text-xs text-gray-500">{po.vendorEmail}</div>}
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Ordered By</div>
              <div className="font-semibold">{po.requestedBy || '—'}</div>
              {po.approvedBy && <div className="text-xs text-gray-500">Approved by: {po.approvedBy}</div>}
            </div>
          </div>

          <table className="w-full border-collapse mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-3 py-2 text-left text-xs font-semibold">Item</th>
                <th className="border px-3 py-2 text-center text-xs font-semibold">Qty</th>
                <th className="border px-3 py-2 text-center text-xs font-semibold">Unit</th>
                <th className="border px-3 py-2 text-right text-xs font-semibold">Unit Price</th>
                <th className="border px-3 py-2 text-right text-xs font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {(po.lineItems || []).map((line, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border px-3 py-2">{line.itemName}{line.notes ? <span className="text-xs text-gray-400 ml-2">({line.notes})</span> : ''}</td>
                  <td className="border px-3 py-2 text-center">{line.qtyRequested}</td>
                  <td className="border px-3 py-2 text-center">{line.unit}</td>
                  <td className="border px-3 py-2 text-right">{line.unitPrice ? `$${Number(line.unitPrice).toFixed(2)}` : 'TBD'}</td>
                  <td className="border px-3 py-2 text-right">{line.lineTotal ? `$${Number(line.lineTotal).toFixed(2)}` : 'TBD'}</td>
                </tr>
              ))}
            </tbody>
            {po.totalAmount > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={4} className="border px-3 py-2 text-right font-bold">Order Total</td>
                  <td className="border px-3 py-2 text-right font-bold">${po.totalAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>

          {po.notes && (
            <div className="border rounded-lg p-3 mb-6">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes / Special Instructions</div>
              <div className="text-sm">{po.notes}</div>
            </div>
          )}

          <div className="border-t pt-4 mt-4 grid grid-cols-2 gap-8 text-xs text-gray-400">
            <div>
              <div className="font-semibold text-gray-600 mb-4">Authorized Signature</div>
              <div className="border-b border-gray-400 mb-1" style={{ height: 32 }} />
              <div>Signature / Date</div>
            </div>
            <div>
              <div className="font-semibold text-gray-600 mb-4">Vendor Acknowledgment</div>
              <div className="border-b border-gray-400 mb-1" style={{ height: 32 }} />
              <div>Signature / Date</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}