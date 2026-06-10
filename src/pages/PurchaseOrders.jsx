import { useState, useEffect, useMemo } from 'react';
import { supabaseData } from '@/lib/supabaseData';
import { Plus, Send, CheckCircle, Package, AlertTriangle, ChevronDown, ChevronUp, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppPageHeader from '@/components/AppPageHeader';
import { Link } from 'react-router-dom';
import POPrintView from '@/components/procurement/POPrintView';
import ReceiveModal from '@/components/procurement/ReceiveModal';

const BRANCHES = ['01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus', '98 Shop', '99 Warehouse'];

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  pending_purchasing: 'bg-yellow-100 text-yellow-700',
  pending_approval: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  submitted: 'bg-indigo-100 text-indigo-700',
  ordered: 'bg-purple-100 text-purple-700',
  partially_received: 'bg-orange-100 text-orange-700',
  received: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-600',
};

const STATUS_LABELS = {
  draft: 'Draft',
  pending_purchasing: 'Pending Purchasing',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  submitted: 'Sent to Vendor',
  ordered: 'Ordered',
  partially_received: 'Partially Received',
  received: 'Received',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

function POCard({ po, user, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [acting, setActing] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showReceive, setShowReceive] = useState(false);

  const act = async (updates) => {
    setActing(true);
    const updated = await supabaseData.PurchaseOrder.update(po.id, updates);
    onUpdate(updated);
    setActing(false);
  };

  const handleSendToPurchasing = async () => {
    setActing(true);
    const updated = await supabaseData.PurchaseOrder.update(po.id, { status: 'pending_purchasing' });
    await fetch('/api/functions/notifyPurchasing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poId: po.id }),
    });
    onUpdate(updated);
    setActing(false);
  };

  const handleApproveAndSend = async () => {
    setActing(true);
    await fetch('/api/functions/sendPurchaseOrder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poId: po.id }),
    });
    const updated = await supabaseData.PurchaseOrder.update(po.id, {
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      approvedBy: user?.email,
      approvedAt: new Date().toISOString(),
    });
    onUpdate(updated);
    setActing(false);
  };



  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 text-sm">{po.poNumber || `PO-${po.id.slice(-6).toUpperCase()}`}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[po.status] || 'bg-gray-100 text-gray-600'}`}>{STATUS_LABELS[po.status] || po.status}</span>
              {po.isUrgent && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">🚨 Urgent</span>}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {po.vendorName} · {po.branch} · {new Date(po.created_date).toLocaleDateString()}
            </div>
            {po.totalAmount > 0 && <div className="mt-1 text-sm font-semibold text-gray-800">${po.totalAmount.toFixed(2)}</div>}
          </div>
          <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-gray-600 p-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {po.status === 'draft' && (
            <Button size="sm" variant="outline" className="text-xs gap-1 border-yellow-400 text-yellow-700 hover:bg-yellow-50" onClick={handleSendToPurchasing} disabled={acting}>
              {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Submit to Purchasing
            </Button>
          )}
          {(po.status === 'pending_purchasing' || po.status === 'pending_approval') && (
            po.vendorEmail ? (
              <Button size="sm" className="text-xs gap-1 bg-indigo-600 hover:bg-indigo-700" onClick={handleApproveAndSend} disabled={acting}>
                {acting ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle className="w-3 h-3" /><Send className="w-3 h-3" /></>} Approve & Send to Vendor
              </Button>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                <AlertTriangle className="w-3 h-3" /> No vendor email — edit PO to add one
              </span>
            )
          )}
          {(po.status === 'submitted' || po.status === 'ordered' || po.status === 'partially_received') && (
            <Button size="sm" className="text-xs gap-1 bg-green-600 hover:bg-green-700" onClick={() => setShowReceive(true)} disabled={acting}>
              <Package className="w-3 h-3" /> Receive Order
            </Button>
          )}
          <Button size="sm" variant="outline" className="text-xs gap-1 ml-auto" onClick={() => setShowPrint(true)}>
            <Printer className="w-3 h-3" /> Print
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t px-4 py-3 space-y-3 bg-gray-50">
          {po.lineItems?.length > 0 && (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left py-1">Item</th>
                  <th className="text-center py-1">Ordered</th>
                  <th className="text-center py-1">Received</th>
                  <th className="text-right py-1">Unit Price</th>
                  <th className="text-right py-1">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {po.lineItems.map((line, i) => (
                  <tr key={i}>
                    <td className="py-1.5">{line.itemName}</td>
                    <td className="text-center py-1.5">{line.qtyRequested} {line.unit}</td>
                    <td className="text-center py-1.5">
                      {line.qtyReceived != null && line.qtyReceived !== line.qtyRequested
                        ? <span className="text-amber-600 font-medium">{line.qtyReceived}</span>
                        : <span className="text-gray-500">{line.qtyReceived ?? '—'}</span>}
                    </td>
                    <td className="text-right py-1.5">{line.unitPrice ? `$${Number(line.unitPrice).toFixed(2)}` : '—'}</td>
                    <td className="text-right py-1.5">{line.lineTotal ? `$${Number(line.lineTotal).toFixed(2)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {po.notes && <p className="text-xs text-gray-600"><strong>Notes:</strong> {po.notes}</p>}
          {po.receiptNotes && <p className="text-xs text-gray-600"><strong>Receipt notes:</strong> {po.receiptNotes}</p>}
        </div>
      )}

      {showPrint && <POPrintView po={po} onClose={() => setShowPrint(false)} />}
      {showReceive && <ReceiveModal po={po} user={user} onClose={() => setShowReceive(false)} onReceived={onUpdate} />}
    </div>
  );
}

export default function PurchaseOrders() {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterBranch, setFilterBranch] = useState('All Branches');
  const [sortDate, setSortDate] = useState('desc');

  useEffect(() => {
    Promise.all([
      supabaseData.PurchaseOrder.list('-created_at', 300),
      Promise.resolve(null), // Skip auth.me() - not needed for this page
    ]).then(([orders, me]) => { setPos(orders); setUser(me); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let result = pos.filter(po => {
      const branchMatch = filterBranch === 'All Branches' || po.branch === filterBranch;
      const activeStatuses = ['draft', 'pending_purchasing', 'pending_approval', 'approved', 'submitted', 'ordered', 'partially_received'];
      const statusMatch = filterStatus === 'all' || (filterStatus === 'active' ? activeStatuses.includes(po.status) : po.status === filterStatus);
      return branchMatch && statusMatch;
    });
    result.sort((a, b) => {
      const aDate = new Date(a.created_date).getTime();
      const bDate = new Date(b.created_date).getTime();
      return sortDate === 'desc' ? bDate - aDate : aDate - bDate;
    });
    return result;
  }, [pos, filterStatus, filterBranch, sortDate]);

  const handleUpdate = (updated) => setPos(prev => prev.map(p => p.id === updated.id ? updated : p));

  const pendingApproval = pos.filter(p => p.status === 'pending_purchasing' || p.status === 'pending_approval').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="Purchase Orders"
        subtitle={`${filtered.length} orders${pendingApproval > 0 ? ` · ⚠️ ${pendingApproval} awaiting approval` : ''}`}
        action={
          <Link to="/purchase-order-new">
            <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> New PO</Button>
          </Link>
        }
      />
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-8 border rounded-lg px-3 text-sm bg-white">
            <option value="active">Active Orders</option>
            <option value="all">All Orders</option>
            <option value="draft">Draft</option>
            <option value="pending_purchasing">Pending Purchasing</option>
            <option value="submitted">Sent to Vendor</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className="h-8 border rounded-lg px-3 text-sm bg-white">
            <option>All Branches</option>
            {BRANCHES.map(b => <option key={b}>{b}</option>)}
          </select>
          <select value={sortDate} onChange={e => setSortDate(e.target.value)} className="h-8 border rounded-lg px-3 text-sm bg-white">
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-20 text-sm">No purchase orders match your filters.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(po => <POCard key={po.id} po={po} user={user} onUpdate={handleUpdate} />)}
          </div>
        )}
      </div>
    </div>
  );
}