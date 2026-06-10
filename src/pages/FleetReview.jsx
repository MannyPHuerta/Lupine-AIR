import { useState, useEffect, useMemo } from 'react';
import { supabaseData } from '@/lib/supabaseData';
import { Pencil, CheckCircle, ChevronLeft, ChevronRight, Send, Printer, Loader2, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppPageHeader from '@/components/AppPageHeader';
import FleetCardEditPanel from '@/components/fleet/FleetCardEditPanel';
import FleetDispatchModal from '@/components/fleet/FleetDispatchModal';

const BRANCHES = ['All Branches', '01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus', '98 Shop', '99 Warehouse'];
const ACTIONS = ['All Actions', 'Sell', 'Repair', 'Discard/Part out', 'Need Quote for Customer'];
const ITEM_TYPES = [
  'All Types', 'Air Compressor', 'Backhoe', 'Boom Lift', 'Bulldozer', 'Chair',
  'Chipper/Shredder', 'Compactor', 'Concrete Grinder', 'Concrete Mixer',
  'Concrete Saw', 'Dance Floor', 'Dump Truck', 'Excavator', 'Floor Sander',
  'Forklift', 'Generator', 'Grader', 'Inflatable', 'Light Tower', 'Loader',
  'Other', 'Pallet Jack', 'Paving Equipment', 'Plate Compactor',
  'Pressure Washer', 'Sandblaster', 'Scissor Lift', 'Skid Steer', 'Staging',
  'Stump Grinder', 'Table', 'Telehandler', 'Tent', 'Tile Stripper', 'Trailer',
  'Trench Roller', 'Trencher', 'Truck/Van', 'Water Pump', 'Welder', 'Zero Turn Mower'
];

const ACTION_COLORS = {
  'Sell': 'bg-green-100 text-green-700',
  'Repair': 'bg-blue-100 text-blue-700',
  'Discard/Part out': 'bg-red-100 text-red-700',
  'Need Quote for Customer': 'bg-amber-100 text-amber-700',
};

function Lightbox({ photos, startIdx, onClose }) {
  const [idx, setIdx] = useState(startIdx);
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIdx(i => (i - 1 + photos.length) % photos.length);
      if (e.key === 'ArrowRight') setIdx(i => (i + 1) % photos.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [photos, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white hover:text-gray-300" onClick={onClose}>
        <X className="w-8 h-8" />
      </button>
      <img
        src={photos[idx]}
        alt="full view"
        className="max-h-[90vh] max-w-[90vw] object-contain"
        onClick={e => e.stopPropagation()}
      />
      {photos.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + photos.length) % photos.length); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 text-white rounded-full p-2 hover:bg-white/40"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % photos.length); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 text-white rounded-full p-2 hover:bg-white/40"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {idx + 1} / {photos.length}
          </div>
        </>
      )}
    </div>
  );
}

function PhotoCarousel({ photos }) {
  const [idx, setIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState(null);

  if (!photos?.length) {
    return (
      <div className="w-full h-48 bg-gray-100 flex items-center justify-center rounded-t-xl text-gray-400 text-sm">
        No Photos
      </div>
    );
  }
  return (
    <>
      <div className="relative w-full h-48 bg-black rounded-t-xl overflow-hidden cursor-zoom-in" onClick={() => setLightboxIdx(idx)}>
        <img src={photos[idx]} alt="asset" className="w-full h-full object-cover" />
        {photos.length > 1 && (
          <>
            <button
              onClick={e => { e.stopPropagation(); setIdx(i => (i - 1 + photos.length) % photos.length); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1 hover:bg-black/60"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); setIdx(i => (i + 1) % photos.length); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1 hover:bg-black/60"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {photos.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === idx ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          </>
        )}
      </div>
      {lightboxIdx !== null && (
        <Lightbox photos={photos} startIdx={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </>
  );
}

function VehicleCard({ report, onUpdate, onDispatch, user }) {
  const [editing, setEditing] = useState(false);
  const [togglingReview, setTogglingReview] = useState(false);
  const isReviewed = !!report.reviewedAt;

  const handleReviewToggle = async () => {
    setTogglingReview(true);
    const update = isReviewed
      ? { reviewedAt: null, reviewedBy: null }
      : { reviewedAt: new Date().toISOString(), reviewedBy: user?.email || '' };
    await supabaseData.Report.update(report.id, update);
    onUpdate({ ...report, ...update });
    setTogglingReview(false);
  };

  const handleSaved = (updated) => {
    setEditing(false);
    onUpdate(updated);
    onDispatch([updated]);
  };

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden relative print:break-inside-avoid ${isReviewed ? 'border-green-400' : 'border-gray-200'}`}>
      {isReviewed && (
        <div className="absolute top-3 right-3 z-10 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Reviewed
        </div>
      )}

      <PhotoCarousel photos={report.photoPaths} />

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-gray-900 text-sm leading-tight">{report.itemName}</div>
          {report.action && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${ACTION_COLORS[report.action] || 'bg-gray-100 text-gray-600'}`}>
              {report.action}
            </span>
          )}
        </div>

        {report.itemType && <div className="text-xs text-indigo-600 font-medium">{report.itemType}</div>}
        {report.model && <div className="text-xs text-gray-500">{report.model}</div>}

        <div className="text-xs text-gray-400 space-y-0.5">
          {report.serialNumber && <div>S/N: {report.serialNumber}</div>}
          {report.assetNumber && <div>Asset #: {report.assetNumber}</div>}
          {report.branch && <div>Branch: {report.branch}</div>}
          {report.askingPrice && <div className="font-medium text-gray-700">${report.askingPrice.toLocaleString()}</div>}
        </div>

        {report.comments && (
          <p className="text-xs text-gray-600 border-t pt-2">{report.comments}</p>
        )}

        {report.meetingNote && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 text-xs text-amber-800">
            📝 {report.meetingNote}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={() => setEditing(e => !e)}
          >
            <Pencil className="w-3 h-3" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`flex-1 gap-1.5 text-xs ${isReviewed ? 'border-green-400 text-green-700 hover:bg-green-50' : ''}`}
            onClick={handleReviewToggle}
            disabled={togglingReview}
          >
            {togglingReview ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
            {isReviewed ? 'Unmark' : 'Mark Reviewed'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs px-2"
            onClick={() => onDispatch([report])}
          >
            <Send className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {editing && (
        <FleetCardEditPanel report={report} onSaved={handleSaved} />
      )}
    </div>
  );
}

export default function FleetReview() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('All Branches');
  const [action, setAction] = useState('All Actions');
  const [itemType, setItemType] = useState('All Types');
  const [unreviewedOnly, setUnreviewedOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dispatchReports, setDispatchReports] = useState(null);

  const loadReports = async () => {
    try {
      const rpts = await supabaseData.Report.list('-created_at', 500);
      setReports(rpts.filter(r => !r.isDeleted));
    } catch (err) {
      console.error('[FleetReview] Failed to load reports:', err);
    }
  };

  useEffect(() => {
    loadReports();
    setLoading(false);
  }, []);

  const filtered = useMemo(() => reports.filter(r => {
    const branchMatch = branch === 'All Branches' || r.branch === branch;
    const actionMatch = action === 'All Actions' || r.action === action;
    const typeMatch = itemType === 'All Types' || r.itemType === itemType;
    const date = r.created_date?.split('T')[0] || '';
    const dateMatch = (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
    const reviewedMatch = !unreviewedOnly || !r.reviewedAt;
    const q = search.toLowerCase();
    const searchMatch = !search || (r.itemName || '').toLowerCase().includes(q) ||
      (r.assetNumber || '').toLowerCase().includes(q) ||
      (r.serialNumber || '').toLowerCase().includes(q) ||
      (r.model || '').toLowerCase().includes(q);
    return branchMatch && actionMatch && typeMatch && dateMatch && reviewedMatch && searchMatch;
  }), [reports, branch, action, itemType, dateFrom, dateTo, unreviewedOnly, search]);

  const reviewedCount = filtered.filter(r => r.reviewedAt).length;
  const reviewedReports = filtered.filter(r => r.reviewedAt);
  const progressPct = filtered.length > 0 ? Math.round((reviewedCount / filtered.length) * 100) : 0;

  const handleUpdate = (updated) => {
    setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      <AppPageHeader
        title="Fleet Review"
        subtitle={`${filtered.length} item${filtered.length !== 1 ? 's' : ''} · ${reviewedCount} reviewed`}
        backTo="/pending"
        action={
          <div className="flex items-center gap-2 flex-wrap no-print">
            <select value={branch} onChange={e => setBranch(e.target.value)} className="h-8 border-0 rounded px-2 bg-white/10 text-white text-xs">
              {BRANCHES.map(b => <option key={b} value={b} className="text-black">{b}</option>)}
            </select>
            <select value={action} onChange={e => setAction(e.target.value)} className="h-8 border-0 rounded px-2 bg-white/10 text-white text-xs">
              {ACTIONS.map(a => <option key={a} value={a} className="text-black">{a}</option>)}
            </select>
            <select value={itemType} onChange={e => setItemType(e.target.value)} className="h-8 border-0 rounded px-2 bg-white/10 text-white text-xs">
              {ITEM_TYPES.map(t => <option key={t} value={t} className="text-black">{t}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 border-0 rounded px-2 bg-white/10 text-white text-xs" />
            <span className="text-white/60 text-xs">→</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 border-0 rounded px-2 bg-white/10 text-white text-xs" />
            <button onClick={() => window.print()} className="p-1.5 rounded-lg hover:bg-white/10 text-white">
              <Printer className="w-4 h-4" />
            </button>
            {reviewedCount > 0 && (
              <Button
                size="sm"
                className="gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs"
                onClick={() => setDispatchReports(reviewedReports)}
              >
                <Send className="w-3 h-3" /> Send All Reviewed ({reviewedCount})
              </Button>
            )}
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 py-4 no-print space-y-3">
        {/* Search + Unreviewed toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, asset #, serial, model..."
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <button
            onClick={() => setUnreviewedOnly(v => !v)}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              unreviewedOnly ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Unreviewed Only
          </button>
        </div>

        {/* Progress bar */}
        {filtered.length > 0 && (
          <div className="bg-white rounded-lg border px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-600">Review Progress</span>
              <span className="text-xs font-bold text-gray-800">{reviewedCount} / {filtered.length} ({progressPct}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-20 text-sm">
            No records match your filters.<br />
            <span className="text-xs">Submit reports via the Report Form to see items here.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(report => (
              <VehicleCard
                key={report.id}
                report={report}
                onUpdate={handleUpdate}
                onDispatch={(rpts) => setDispatchReports(rpts)}
                user={user}
              />
            ))}
          </div>
        )}
      </div>

      {dispatchReports && (
        <FleetDispatchModal
          reports={dispatchReports}
          onClose={() => setDispatchReports(null)}
          onSent={() => {
            setDispatchReports(null);
            loadReports();
          }}
        />
      )}
    </div>
  );
}