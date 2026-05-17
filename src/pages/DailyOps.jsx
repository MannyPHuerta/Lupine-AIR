import { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import BranchMismatchBadge from '@/components/BranchMismatchBadge';
import {
  Truck, RotateCcw, AlertTriangle, RefreshCw, Phone, Plus,
  Clock, CheckCircle, Loader2, Calendar, ArrowRightLeft, ChevronLeft, ChevronRight
} from 'lucide-react';

const BRANCHES = ['All Branches', '01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus', '98 Shop', '99 Warehouse'];

function offsetDate(baseDate, days) {
  const d = new Date(baseDate + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const today = new Date().toISOString().split('T')[0];

function SectionHeader({ icon, label, count, color }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 border-b font-semibold text-sm ${color}`}>
      {icon}
      <span>{label}</span>
      <span className="ml-auto bg-white/20 rounded-full px-2 py-0.5 text-xs font-bold">{count}</span>
    </div>
  );
}

function RentalRow({ rental, badge, badgeColor, navigate }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 border-b last:border-0 transition cursor-pointer"
      onClick={() => navigate(`/availability-calendar?rentalId=${rental.id}&date=${rental.startDate || rental.endDate}`)}
    >
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 text-sm truncate">{rental.customerName}</div>
        <div className="text-xs text-gray-500 truncate">{rental.equipmentName || 'Multiple items'}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {rental.branch} · Invoice: {rental.invoiceNumber || '—'}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
        {rental.customerPhone && (
          <a href={`tel:${rental.customerPhone}`}
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition">
            <Phone className="w-3 h-3" /> {rental.customerPhone}
          </a>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-gray-400 text-sm">
      <CheckCircle className="w-4 h-4 text-green-400" />
      {message}
    </div>
  );
}

function CrossBranchRow({ rental, type, onMarkDone, equipment, deliveries, navigate }) {
  const [saving, setSaving] = useState(false);
  const field = type === 'out' ? 'transferOutCompleted' : 'transferBackCompleted';
  const done = type === 'out' ? rental.transferOutCompleted : rental.transferBackCompleted;
  const eq = equipment.find(e => e.id === rental.equipmentId);

  // Find the linked transfer Delivery record
  const transferDelivery = deliveries?.find(d => d.isCrossTransfer && d.rentalId === rental.id);

  const handleMark = async (e) => {
    e.stopPropagation();
    setSaving(true);
    await base44.entities.Rental.update(rental.id, { [field]: true });
    // When transfer-back completes, free up the equipment
    if (type === 'back' && rental.equipmentId) {
      try {
        await base44.entities.Equipment.update(rental.equipmentId, {
          unitStatus: 'available',
          statusNote: '',
          statusUpdatedAt: new Date().toISOString(),
        });
      } catch (e) { console.warn('Could not reset equipment status:', e.message); }
    }
    onMarkDone(rental.id, field);
    setSaving(false);
  };

  return (
    <div className={`flex items-start gap-3 px-4 py-3 border-b last:border-0 ${done ? 'opacity-40' : ''}`}>
      <ArrowRightLeft className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 text-sm truncate">{rental.equipmentName}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          {type === 'out'
            ? <><strong>{rental.sourceBranch}</strong> → <strong>{rental.branch}</strong> · Needed by {rental.startDate}</>
            : <><strong>{rental.branch}</strong> → <strong>{rental.sourceBranch}</strong> · Item returned — must go back to original branch</>
          }
        </div>
        <div className="text-xs text-gray-400 space-y-0.5">
          <div>{rental.customerName} · Invoice: {rental.invoiceNumber || '—'}</div>
          {eq && (
            <div className="text-gray-500 font-mono">
              {eq.assetNumber && <span>Asset: {eq.assetNumber}</span>}
              {eq.serialNumber && <span>{eq.assetNumber ? ' · ' : ''}Serial: {eq.serialNumber}</span>}
            </div>
          )}
          {/* Driver assignment status */}
          {transferDelivery && (
            <div className={`mt-0.5 flex items-center gap-1 ${transferDelivery.driverId ? 'text-green-700' : 'text-red-600'}`}>
              {transferDelivery.driverId
                ? <><span>🚚 Driver: {transferDelivery.driverName}</span>{transferDelivery.teamDrivers?.length > 1 && <span> +{transferDelivery.teamDrivers.length - 1}</span>}</>
                : <span>⚠️ No driver assigned yet</span>
              }
              <button
                onClick={e => { e.stopPropagation(); navigate('/assign-deliveries'); }}
                className="ml-1 text-indigo-500 hover:text-indigo-700 underline text-xs"
              >
                {transferDelivery.driverId ? 'Reassign' : 'Assign now →'}
              </button>
            </div>
          )}
        </div>
      </div>
      {!done && (
        <button
          onClick={handleMark}
          disabled={saving}
          className="flex-shrink-0 text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : '✓ Done'}
        </button>
      )}
      {done && <span className="text-xs text-green-600 font-medium flex-shrink-0">✓ Transferred</span>}
    </div>
  );
}

export default function DailyOps() {
  const navigate = useNavigate();
  const [rentals, setRentals] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState('All Branches');
  const [user, setUser] = useState(null);
  const [workingBranch, setWorkingBranch] = useState(null);
  const [viewDate, setViewDate] = useState(today);

  const load = async () => {
    setLoading(true);
    const [me, r, eq, dels] = await Promise.all([
      base44.auth.me(),
      base44.entities.Rental.list('-startDate', 1000),
      base44.entities.Equipment.list('name', 2000),
      base44.entities.Delivery.list('-created_date', 500),
    ]);
    setUser(me);
    setRentals(r);
    setEquipment(eq);
    setDeliveries(dels);
    const stored = localStorage.getItem('workingBranch');
    setWorkingBranch(stored);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return rentals.filter(r =>
      branch === 'All Branches' || r.branch === branch
    );
  }, [rentals, branch]);

  const nextDay = useMemo(() => offsetDate(viewDate, 1), [viewDate]);
  const isToday = viewDate === today;

  // Going out on viewDate (startDate = viewDate, status = reservation/contract)
  const goingOutToday = useMemo(() =>
    filtered.filter(r =>
      r.startDate === viewDate &&
      ['reservation', 'contract'].includes(r.status)
    ), [filtered, viewDate]);

  // Due back on viewDate (endDate = viewDate, status = out)
  const dueToday = useMemo(() =>
    filtered.filter(r =>
      r.endDate === viewDate &&
      r.status === 'out'
    ), [filtered, viewDate]);

  // Overdue (endDate < viewDate, status = out)
  const overdue = useMemo(() =>
    filtered.filter(r =>
      r.endDate < viewDate &&
      r.status === 'out'
    ).sort((a, b) => a.endDate.localeCompare(b.endDate)), [filtered, viewDate]);

  // Ending next day — re-rent candidates
  const endingTomorrow = useMemo(() =>
    filtered.filter(r =>
      r.endDate === nextDay &&
      r.status === 'out'
    ), [filtered, nextDay]);

  // Cross-branch transfers needed: items that need to move OUT to rental branch before start
  const transfersOut = useMemo(() =>
    filtered.filter(r =>
      r.isCrossBranch &&
      r.sourceBranch &&
      !r.transferOutCompleted &&
      ['reservation', 'contract', 'quote'].includes(r.status)
    ).sort((a, b) => (a.startDate || '').localeCompare(b.startDate || '')),
  [filtered]);

  // Cross-branch returns needed: item was returned by customer but needs to go BACK to source branch
  const transfersBack = useMemo(() =>
    filtered.filter(r =>
      r.isCrossBranch &&
      r.sourceBranch &&
      !r.transferBackCompleted &&
      ['returned', 'completed'].includes(r.status)
    ).sort((a, b) => (b.endDate || '').localeCompare(a.endDate || '')),
  [filtered]);

  const handleTransferDone = useCallback((rentalId, field) => {
    setRentals(prev => prev.map(r => r.id === rentalId ? { ...r, [field]: true } : r));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-4 max-w-4xl mx-auto">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-lg font-bold">
                {isToday ? `${greeting()}${user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''} 👋` : '📅 Schedule View'}
              </div>
              <div className="flex items-center gap-1 text-indigo-300 text-xs mt-0.5">
                <button onClick={() => setViewDate(d => offsetDate(d, -1))} className="p-0.5 hover:text-white rounded">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span
                  className={`cursor-pointer hover:text-white transition ${isToday ? '' : 'text-amber-300 font-semibold'}`}
                  onClick={() => setViewDate(today)}
                  title="Click to return to today"
                >
                  {new Date(viewDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  {!isToday && ' (click for today)'}
                </span>
                <button onClick={() => setViewDate(d => offsetDate(d, 1))} className="p-0.5 hover:text-white rounded">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={branch}
                onChange={e => setBranch(e.target.value)}
                className="h-9 border-0 rounded px-2 bg-indigo-800 text-white text-sm"
              >
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <button onClick={load} className="p-2 rounded-lg hover:bg-indigo-800">
                <RefreshCw className="w-4 h-4" />
              </button>
              {user?.homeBranch && workingBranch && user.homeBranch !== workingBranch && (
                <BranchMismatchBadge userHomeBranch={user.homeBranch} />
              )}
              <button
                onClick={() => navigate('/counter')}
                className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-4 py-2 rounded-lg text-sm transition"
              >
                <Plus className="w-4 h-4" /> New Rental
              </button>
            </div>
          </div>

          {/* KPI bar */}
          <div className="grid grid-cols-5 gap-3 mt-4">
            {[
              { label: 'Going Out', value: goingOutToday.length, color: 'text-cyan-300' },
              { label: 'Due Back', value: dueToday.length, color: 'text-green-300' },
              { label: 'Overdue', value: overdue.length, color: overdue.length > 0 ? 'text-red-300' : 'text-gray-400' },
              { label: 'Re-Rent?', value: endingTomorrow.length, color: 'text-amber-300' },
              { label: 'Transfers', value: transfersOut.length + transfersBack.length, color: (transfersOut.length + transfersBack.length) > 0 ? 'text-amber-300' : 'text-gray-400' },
            ].map(k => (
              <div key={k.label} className="text-center">
                <div className={`text-2xl font-black ${k.color}`}>{k.value}</div>
                <div className="text-indigo-400 text-xs">{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-5">

        {/* Quick nav */}
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'Rental History', path: '/rental-history' },
            { label: 'Dispatch', path: '/dispatch' },
            { label: 'Availability Calendar', path: '/availability-calendar' },
            { label: 'Manager Dashboard', path: '/manager' },
          ].map(l => (
            <button key={l.path} onClick={() => navigate(l.path)}
              className="text-xs border border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {l.label}
            </button>
          ))}
        </div>

        {/* Going Out Today */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <SectionHeader
            icon={<Truck className="w-4 h-4" />}
            label={isToday ? "Going Out Today" : `Going Out ${new Date(viewDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            count={goingOutToday.length}
            color="bg-cyan-600 text-white"
          />
          {goingOutToday.length === 0
            ? <EmptyState message="Nothing scheduled to go out today" />
            : goingOutToday.map(r => (
              <RentalRow key={r.id} rental={r} badge={`Starts ${r.startDate}`} badgeColor="bg-cyan-100 text-cyan-700" navigate={navigate} />
            ))}
        </div>

        {/* Cross-Branch Transfers */}
        {(transfersOut.length > 0 || transfersBack.length > 0) && (
          <div className="bg-white border border-amber-200 rounded-xl shadow-sm overflow-hidden">
            <SectionHeader
              icon={<ArrowRightLeft className="w-4 h-4" />}
              label="Cross-Branch Transfers"
              count={transfersOut.length + transfersBack.length}
              color="bg-amber-500 text-white"
            />
            {transfersOut.length > 0 && (
              <>
                <div className="px-4 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border-b">
                  📦 Needs to move TO rental branch before start date
                </div>
                {transfersOut.map(r => (
                  <CrossBranchRow key={r.id + '-out'} rental={r} type="out" onMarkDone={handleTransferDone} equipment={equipment} deliveries={deliveries} navigate={navigate} />
                ))}
              </>
            )}
            {transfersBack.length > 0 && (
              <>
                <div className="px-4 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border-b border-t">
                  🔁 Needs to return to original branch (exact unit)
                </div>
                {transfersBack.map(r => (
                  <CrossBranchRow key={r.id + '-back'} rental={r} type="back" onMarkDone={handleTransferDone} equipment={equipment} deliveries={deliveries} navigate={navigate} />
                ))}
              </>
            )}
          </div>
        )}

        {/* Due Back Today */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <SectionHeader
            icon={<RotateCcw className="w-4 h-4" />}
            label={isToday ? "Due Back Today" : `Due Back ${new Date(viewDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            count={dueToday.length}
            color="bg-green-600 text-white"
          />
          {dueToday.length === 0
            ? <EmptyState message="No returns expected today" />
            : dueToday.map(r => (
              <RentalRow key={r.id} rental={r} badge="Due today" badgeColor="bg-green-100 text-green-700" navigate={navigate} />
            ))}
        </div>

        {/* Overdue */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <SectionHeader
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Overdue — Call Now"
            count={overdue.length}
            color={overdue.length > 0 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'}
          />
          {overdue.length === 0
            ? <EmptyState message="No overdue rentals" />
            : overdue.map(r => (
              <RentalRow key={r.id} rental={r}
                badge={`Due ${r.endDate}`}
                badgeColor="bg-red-100 text-red-700"
                navigate={navigate}
              />
            ))}
        </div>

        {/* Ending Tomorrow — Re-rent candidates */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <SectionHeader
            icon={<Clock className="w-4 h-4" />}
            label={`Ending ${isToday ? 'Tomorrow' : new Date(nextDay + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — Re-Rent Conversation`}
            count={endingTomorrow.length}
            color="bg-amber-500 text-white"
          />
          {endingTomorrow.length === 0
            ? <EmptyState message="Nothing ending tomorrow" />
            : endingTomorrow.map(r => (
              <RentalRow key={r.id} rental={r}
                badge="Ends tomorrow"
                badgeColor="bg-amber-100 text-amber-700"
                navigate={navigate}
              />
            ))}
        </div>

      </div>
    </div>
  );
}