import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import AppPageHeader from '@/components/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Wallet, Plus, X, Lock, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Receipt } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import VarianceAnalysisPanel from '@/components/cash/VarianceAnalysisPanel';

const PETTY_CASH_CATEGORIES = [
  'Office Supplies', 'Fuel', 'Cleaning', 'Food/Drinks', 'Small Parts',
  'Postage', 'Emergency Purchase', 'Other'
];

const STATUS_BADGE = {
  open: 'bg-green-100 text-green-800',
  closed: 'bg-yellow-100 text-yellow-800',
  reconciled: 'bg-gray-100 text-gray-600',
};

function VarianceBadge({ variance }) {
  if (variance === undefined || variance === null) return null;
  const abs = Math.abs(variance).toFixed(2);
  if (variance === 0) return <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">✓ Balanced</span>;
  if (variance < 0) return <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">⚠ Short ${abs}</span>;
  return <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">↑ Over ${abs}</span>;
}

function OpenDrawerModal({ branches, branchSettingsMap, user, onCreated, onClose }) {
  const [branch, setBranch] = useState(branches[0] || '');
  const [shiftLabel, setShiftLabel] = useState('Full Day');
  const [startingFloat, setStartingFloat] = useState(() => {
    const bs = branchSettingsMap[branches[0]] ;
    return bs?.defaultStartingFloat != null ? String(bs.defaultStartingFloat) : '';
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleBranchChange = (b) => {
    setBranch(b);
    const bs = branchSettingsMap[b];
    if (bs?.defaultStartingFloat != null) setStartingFloat(String(bs.defaultStartingFloat));
    else setStartingFloat('');
  };

  const handleOpen = async () => {
    if (!branch) return;
    setSaving(true);
    const floatAmt = parseFloat(startingFloat) || 0;
    // Save as new default for this branch if it changed
    const bs = branchSettingsMap[branch];
    if (bs && bs.defaultStartingFloat !== floatAmt) {
      await base44.entities.BranchSettings.update(bs.id, { defaultStartingFloat: floatAmt });
    }
    const drawer = await base44.entities.CashDrawer.create({
      branch,
      shiftDate: new Date().toISOString().slice(0, 10),
      shiftLabel,
      startingFloat: floatAmt,
      openedBy: user?.email || '',
      openedAt: new Date().toISOString(),
      status: 'open',
      cashCollected: 0,
      cardCollected: 0,
      checkCollected: 0,
      otherCollected: 0,
      pettyCashTransactions: [],
    });
    setSaving(false);
    toast({ title: 'Drawer opened', description: `${branch} — ${shiftLabel}` });
    onCreated(drawer);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-gray-900">Open Cash Drawer</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Branch</label>
          <select value={branch} onChange={e => handleBranchChange(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
            {branches.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Shift</label>
          <select value={shiftLabel} onChange={e => setShiftLabel(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
            {['Morning', 'Afternoon', 'Evening', 'Full Day'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Starting Float (cash in drawer)</label>
          <Input type="number" placeholder="e.g. 200.00" value={startingFloat} onChange={e => setStartingFloat(e.target.value)} />
          {branchSettingsMap[branch]?.defaultStartingFloat != null && (
            <div className="text-xs text-gray-400 mt-1">💾 Pre-filled from last saved float for this branch</div>
          )}
        </div>
        <Button onClick={handleOpen} disabled={saving} className="w-full bg-green-600 hover:bg-green-700">
          {saving ? 'Opening…' : 'Open Drawer'}
        </Button>
      </div>
    </div>
  );
}

function PettyCashModal({ drawer, user, onClose, onSaved }) {
  const [type, setType] = useState('out');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Office Supplies');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amt || !description) return;
    setSaving(true);
    const txn = {
      id: Date.now().toString(),
      type,
      amount: amt,
      category,
      description,
      authorizedBy: user?.email || '',
      recordedAt: new Date().toISOString(),
    };
    const updated = [...(drawer.pettyCashTransactions || []), txn];
    await base44.entities.CashDrawer.update(drawer.id, { pettyCashTransactions: updated });
    toast({ title: `Petty cash ${type} recorded`, description: `$${amt.toFixed(2)} — ${description}` });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-gray-900">Petty Cash Transaction</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="flex gap-2">
          {['out', 'in'].map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition ${type === t ? (t === 'out' ? 'bg-red-600 text-white border-red-600' : 'bg-green-600 text-white border-green-600') : 'bg-white text-gray-600 border-gray-300'}`}>
              {t === 'out' ? '↑ Cash Out' : '↓ Cash In'}
            </button>
          ))}
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Amount</label>
          <Input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
            {PETTY_CASH_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Description / Memo</label>
          <Input placeholder="What was this for?" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving…' : 'Record Transaction'}
        </Button>
      </div>
    </div>
  );
}

function CloseDrawerModal({ drawer, user, onClose, onSaved }) {
  const [cashCollected, setCashCollected] = useState(String(drawer.cashCollected || ''));
  const [cardCollected, setCardCollected] = useState(String(drawer.cardCollected || ''));
  const [checkCollected, setCheckCollected] = useState(String(drawer.checkCollected || ''));
  const [otherCollected, setOtherCollected] = useState(String(drawer.otherCollected || ''));
  const [countedCash, setCountedCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const pettyCashOut = (drawer.pettyCashTransactions || []).filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0);
  const pettyCashIn = (drawer.pettyCashTransactions || []).filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0);
  const expectedCash = (drawer.startingFloat || 0) + parseFloat(cashCollected || 0) - pettyCashOut + pettyCashIn;
  const variance = countedCash !== '' ? parseFloat(countedCash) - expectedCash : null;

  const handleClose = async () => {
    setSaving(true);
    await base44.entities.CashDrawer.update(drawer.id, {
      cashCollected: parseFloat(cashCollected) || 0,
      cardCollected: parseFloat(cardCollected) || 0,
      checkCollected: parseFloat(checkCollected) || 0,
      otherCollected: parseFloat(otherCollected) || 0,
      countedCash: parseFloat(countedCash) || 0,
      expectedCash: Math.round(expectedCash * 100) / 100,
      variance: variance !== null ? Math.round(variance * 100) / 100 : 0,
      closingNotes,
      closedBy: user?.email || '',
      closedAt: new Date().toISOString(),
      status: 'closed',
    });
    toast({ title: 'Drawer closed', description: variance !== null && variance !== 0 ? `Variance: $${Math.abs(variance).toFixed(2)} ${variance < 0 ? 'short' : 'over'}` : 'Balanced ✓' });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 my-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-gray-900">Close Drawer — {drawer.branch}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
          <div className="flex justify-between"><span>Starting Float</span><span className="font-medium">${(drawer.startingFloat || 0).toFixed(2)}</span></div>
          <div className="flex justify-between text-red-600"><span>Petty Cash Out</span><span>−${pettyCashOut.toFixed(2)}</span></div>
          {pettyCashIn > 0 && <div className="flex justify-between text-green-600"><span>Petty Cash In</span><span>+${pettyCashIn.toFixed(2)}</span></div>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[['Cash Collected', cashCollected, setCashCollected], ['Card Collected', cardCollected, setCardCollected],
            ['Check Collected', checkCollected, setCheckCollected], ['Other Collected', otherCollected, setOtherCollected]].map(([label, val, setter]) => (
            <div key={label}>
              <label className="text-xs font-semibold text-gray-600 block mb-1">{label}</label>
              <Input type="number" placeholder="0.00" value={val} onChange={e => setter(e.target.value)} />
            </div>
          ))}
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Actual Cash Counted in Drawer</label>
          <Input type="number" placeholder="Count the bills and coins…" value={countedCash} onChange={e => setCountedCash(e.target.value)} />
        </div>

        {countedCash !== '' && (
          <div className={`rounded-lg p-3 text-sm font-semibold flex justify-between ${variance === 0 ? 'bg-green-50 text-green-700' : variance < 0 ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
            <span>Expected: ${expectedCash.toFixed(2)}</span>
            <span>Variance: {variance >= 0 ? '+' : ''}${variance.toFixed(2)}</span>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Closing Notes</label>
          <Input placeholder="Any discrepancies or notes…" value={closingNotes} onChange={e => setClosingNotes(e.target.value)} />
        </div>

        <Button onClick={handleClose} disabled={saving || countedCash === ''} className="w-full bg-orange-600 hover:bg-orange-700">
          {saving ? 'Closing…' : 'Close & Submit Drawer'}
        </Button>
      </div>
    </div>
  );
}

function DrawerCard({ drawer, user, isAdmin, onRefresh }) {
  const [expanded, setExpanded] = useState(drawer.status === 'open');
  const [showPettyCash, setShowPettyCash] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const { toast } = useToast();

  const pettyCashOut = (drawer.pettyCashTransactions || []).filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0);
  const pettyCashIn = (drawer.pettyCashTransactions || []).filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0);
  const totalCollected = (drawer.cashCollected || 0) + (drawer.cardCollected || 0) + (drawer.checkCollected || 0) + (drawer.otherCollected || 0);

  const handleReconcile = async () => {
    const notes = prompt('Manager reconciliation notes (optional):') ?? '';
    await base44.entities.CashDrawer.update(drawer.id, {
      status: 'reconciled',
      reconciledBy: user?.email || '',
      reconciledAt: new Date().toISOString(),
      reconciledNotes: notes,
    });
    toast({ title: 'Drawer reconciled ✓' });
    onRefresh();
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(e => !e)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{drawer.branch}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-500">{drawer.shiftLabel} · {drawer.shiftDate}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[drawer.status]}`}>{drawer.status}</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">Opened by {drawer.openedBy} · Float: ${(drawer.startingFloat || 0).toFixed(2)}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold text-gray-900">${totalCollected.toFixed(2)} collected</div>
          {drawer.variance !== undefined && drawer.variance !== null && <VarianceBadge variance={drawer.variance} />}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </div>

      {expanded && (
        <div className="border-t px-5 py-4 space-y-4">
          {/* Payment summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[['💵 Cash', drawer.cashCollected], ['💳 Card', drawer.cardCollected], ['📄 Check', drawer.checkCollected], ['🔁 Other', drawer.otherCollected]].map(([label, val]) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">{label}</div>
                <div className="font-bold text-gray-800">${(val || 0).toFixed(2)}</div>
              </div>
            ))}
          </div>

          {/* Petty cash log */}
          {(drawer.pettyCashTransactions || []).length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-2 flex justify-between">
                <span>Petty Cash Log</span>
                <span className="text-red-600">−${pettyCashOut.toFixed(2)} out · <span className="text-green-600">+${pettyCashIn.toFixed(2)} in</span></span>
              </div>
              <div className="space-y-1">
                {drawer.pettyCashTransactions.map(t => (
                  <div key={t.id} className="flex justify-between text-xs bg-gray-50 rounded px-3 py-1.5">
                    <span className={t.type === 'out' ? 'text-red-600' : 'text-green-600'}>{t.type === 'out' ? '↑ Out' : '↓ In'}</span>
                    <span className="text-gray-600">{t.category} — {t.description}</span>
                    <span className="font-medium">${t.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Close summary */}
          {drawer.status !== 'open' && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600"><span>Expected Cash</span><span>${(drawer.expectedCash || 0).toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Counted Cash</span><span>${(drawer.countedCash || 0).toFixed(2)}</span></div>
              <div className={`flex justify-between font-bold border-t pt-1 mt-1 ${drawer.variance < 0 ? 'text-red-600' : drawer.variance > 0 ? 'text-blue-600' : 'text-green-600'}`}>
                <span>Variance</span><span>{drawer.variance >= 0 ? '+' : ''}${(drawer.variance || 0).toFixed(2)}</span>
              </div>
              {drawer.closingNotes && <div className="text-xs text-gray-400 italic pt-1">"{drawer.closingNotes}"</div>}
            </div>
          )}

          {drawer.status === 'reconciled' && drawer.reconciledBy && (
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-green-50 rounded-lg px-3 py-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Reconciled by {drawer.reconciledBy} on {new Date(drawer.reconciledAt).toLocaleString()}
              {drawer.reconciledNotes && <span className="italic">· "{drawer.reconciledNotes}"</span>}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {drawer.status === 'open' && (
              <>
                <Button size="sm" variant="outline" onClick={() => setShowPettyCash(true)} className="gap-1">
                  <Receipt className="w-4 h-4" /> Petty Cash
                </Button>
                <Button size="sm" onClick={() => setShowClose(true)} className="gap-1 bg-orange-600 hover:bg-orange-700">
                  <Lock className="w-4 h-4" /> Close Drawer
                </Button>
              </>
            )}
            {drawer.status === 'open' && (
              <Button size="sm" variant="outline" onClick={() => setShowPettyCash(true)} className="gap-1 border-green-300 text-green-700 hover:bg-green-50">
                <Plus className="w-4 h-4" /> Add Petty Cash
              </Button>
            )}
            {drawer.status === 'closed' && isAdmin && (
              <Button size="sm" onClick={handleReconcile} className="gap-1 bg-indigo-600 hover:bg-indigo-700">
                <CheckCircle className="w-4 h-4" /> Mark Reconciled
              </Button>
            )}
          </div>
        </div>
      )}

      {showPettyCash && <PettyCashModal drawer={drawer} user={user} onClose={() => setShowPettyCash(false)} onSaved={onRefresh} />}
      {showClose && <CloseDrawerModal drawer={drawer} user={user} onClose={() => setShowClose(false)} onSaved={onRefresh} />}
    </div>
  );
}

export default function CashDrawerReconciliation() {
  const { user } = useAuth();
  const [drawers, setDrawers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchSettingsMap, setBranchSettingsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showOpen, setShowOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('open');
  const [filterBranch, setFilterBranch] = useState('all');
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const load = async () => {
    const [drawersData, branchData] = await Promise.all([
      base44.entities.CashDrawer.list('-shiftDate', 200),
      base44.entities.BranchSettings.list(),
    ]);
    setDrawers(drawersData);
    setBranches(branchData.map(b => b.branch).filter(Boolean));
    const bsMap = {};
    branchData.forEach(b => { if (b.branch) bsMap[b.branch] = b; });
    setBranchSettingsMap(bsMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = drawers.filter(d =>
    (filterStatus === 'all' || d.status === filterStatus) &&
    (filterBranch === 'all' || d.branch === filterBranch)
  );

  const openDrawers = drawers.filter(d => d.status === 'open');
  const pendingReconcile = drawers.filter(d => d.status === 'closed');

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="Cash Drawer Reconciliation"
        subtitle="Shift open/close · Petty cash · Variance tracking"
        icon={Wallet}
        action={
          <Button onClick={() => setShowOpen(true)} className="bg-green-600 hover:bg-green-700 gap-2">
            <Plus className="w-4 h-4" /> Open Drawer
          </Button>
        }
      />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{openDrawers.length}</div>
            <div className="text-xs text-gray-500 mt-1">Drawers Open</div>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{pendingReconcile.length}</div>
            <div className="text-xs text-gray-500 mt-1">Pending Reconciliation</div>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <div className={`text-2xl font-bold ${drawers.filter(d => d.variance < 0).length > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {drawers.filter(d => d.variance !== undefined && d.variance !== null && d.variance !== 0).length}
            </div>
            <div className="text-xs text-gray-500 mt-1">Variances (Today)</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white">
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="reconciled">Reconciled</option>
          </select>
          <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white">
            <option value="all">All Branches</option>
            {branches.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>

        {/* Admin-only AI Variance Analysis */}
        {isAdmin && !loading && drawers.length > 0 && (
          <VarianceAnalysisPanel drawers={drawers} />
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <div>No drawers found. Open one to start tracking.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(d => (
              <DrawerCard key={d.id} drawer={d} user={user} isAdmin={isAdmin} onRefresh={load} />
            ))}
          </div>
        )}
      </div>

      {showOpen && <OpenDrawerModal branches={branches} branchSettingsMap={branchSettingsMap} user={user} onCreated={() => { load(); setShowOpen(false); }} onClose={() => setShowOpen(false)} />}
    </div>
  );
}