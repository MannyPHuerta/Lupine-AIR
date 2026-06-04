import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Pencil, CheckCircle, ChevronLeft, ChevronRight, Send, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppPageHeader from '@/components/AppPageHeader';
import FleetCardEditPanel from '@/components/fleet/FleetCardEditPanel';
import FleetDispatchModal from '@/components/fleet/FleetDispatchModal';

const BRANCHES = ['All Branches', '01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus', '98 Shop', '99 Warehouse'];
const ACTIONS = ['All Actions', 'Sell', 'Repair', 'Discard/Part out', 'Need Quote for Customer'];

const ACTION_COLORS = {
  'Sell': 'bg-green-100 text-green-700',
  'Repair': 'bg-blue-100 text-blue-700',
  'Discard/Part out': 'bg-red-100 text-red-700',
  'Need Quote for Customer': 'bg-amber-100 text-amber-700',
};

function PhotoCarousel({ photos }) {
  const [idx, setIdx] = useState(0);
  if (!photos?.length) {
    return (
      <div className="w-full h-48 bg-gray-100 flex items-center justify-center rounded-t-xl text-gray-400 text-sm">
        No Photos
      </div>
    );
  }
  return (
    <div className="relative w-full h-48 bg-black rounded-t-xl overflow-hidden">
      <img src={photos[idx]} alt="vehicle" className="w-full h-full object-cover" />
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
    const updated = await base44.entities.Report.update(report.id, update);
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
            {togglingReview
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <CheckCircle className="w-3 h-3" />
            }
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
  const [branch, setBranch] = useState('All Branches');
  const [action, setAction] = useState('All Actions');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dispatchReports, setDispatchReports] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Report.list('-created_date', 500),
      base44.auth.me(),
    ]).then(([rpts, me]) => {
      setReports(rpts.filter(r => r.itemType === 'Truck/Van' && !r.isDeleted));
      setUser(me);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => reports.filter(r => {
    const branchMatch = branch === 'All Branches' || r.branch === branch;
    const actionMatch = action === 'All Actions' || r.action === action;
    const date = r.created_date?.split('T')[0] || '';
    const dateMatch = (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
    return branchMatch && actionMatch && dateMatch;
  }), [reports, branch, action, dateFrom, dateTo]);

  const reviewedCount = filtered.filter(r => r.reviewedAt).length;
  const reviewedReports = filtered.filter(r => r.reviewedAt);

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
        subtitle={`${filtered.length} vehicle${filtered.length !== 1 ? 's' : ''} · ${reviewedCount} reviewed`}
        backTo="/pending"
        action={
          <div className="flex items-center gap-2 flex-wrap no-print">
            <select value={branch} onChange={e => setBranch(e.target.value)} className="h-8 border-0 rounded px-2 bg-white/10 text-white text-xs">
              {BRANCHES.map(b => <option key={b} value={b} className="text-black">{b}</option>)}
            </select>
            <select value={action} onChange={e => setAction(e.target.value)} className="h-8 border-0 rounded px-2 bg-white/10 text-white text-xs">
              {ACTIONS.map(a => <option key={a} value={a} className="text-black">{a}</option>)}
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

      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-20 text-sm">
            No truck/van records match your filters.<br />
            <span className="text-xs">Create reports using itemType "Truck/Van" to see them here.</span>
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
            // Refresh sent status
            base44.entities.Report.list('-created_date', 500).then(rpts => {
              setReports(rpts.filter(r => r.itemType === 'Truck/Van' && !r.isDeleted));
            });
          }}
        />
      )}
    </div>
  );
}