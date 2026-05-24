import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, Plus, CheckCircle, XCircle, DollarSign, Download, Loader2, QrCode } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import QRCodeGenerator from '@/components/timesheets/QRCodeGenerator';

const BRANCHES = ['01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus'];
const JOB_TYPES = ['delivery', 'event', 'shop', 'laundry', 'general'];
const STAFF_TYPES = ['full_time', 'part_time', 'temp', 'event'];

function calcHours(clockIn, clockOut) {
  if (!clockIn || !clockOut) return 0;
  const [inH, inM] = clockIn.split(':').map(Number);
  const [outH, outM] = clockOut.split(':').map(Number);
  const mins = (outH * 60 + outM) - (inH * 60 + inM);
  return Math.max(0, Math.round(mins / 60 * 100) / 100);
}

function calcPay(hours, rate) {
  if (!hours || !rate) return { regular: 0, overtime: 0, total: 0 };
  const regular = Math.min(hours, 8);
  const overtime = Math.max(0, hours - 8);
  const regularPay = regular * rate;
  const overtimePay = overtime * (rate * 1.5);
  return { regular: regularPay, overtime: overtimePay, total: regularPay + overtimePay };
}

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  paid: 'bg-blue-100 text-blue-800',
};

function EntryModal({ entry, onSave, onClose }) {
  const [form, setForm] = useState(entry || {
    staffName: '', staffEmail: '', staffType: 'temp', branch: '',
    jobReference: '', jobType: 'general', workDate: new Date().toISOString().split('T')[0],
    clockIn: '08:00', clockOut: '17:00', hourlyRate: '', notes: '', status: 'pending',
  });

  const hours = calcHours(form.clockIn, form.clockOut);
  const pay = calcPay(hours, parseFloat(form.hourlyRate) || 0);

  const handleSave = () => {
    const rate = parseFloat(form.hourlyRate) || 0;
    const overtime = Math.max(0, hours - 8);
    onSave({
      ...form,
      hoursWorked: hours,
      overtimeHours: overtime,
      hourlyRate: rate,
      regularPay: pay.regular,
      overtimePay: pay.overtime,
      totalPay: pay.total,
      payPeriod: getPayPeriod(form.workDate),
    });
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div className="font-bold text-lg text-gray-900">{entry?.id ? 'Edit Timesheet Entry' : 'Log Hours'}</div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600">Staff Name *</label>
            <Input value={form.staffName} onChange={e => set('staffName', e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Staff Type</label>
            <select value={form.staffType} onChange={e => set('staffType', e.target.value)}
              className="w-full h-9 border rounded-md px-3 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
              {STAFF_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Branch *</label>
            <select value={form.branch} onChange={e => set('branch', e.target.value)}
              className="w-full h-9 border rounded-md px-3 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="">Select...</option>
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Work Date *</label>
            <Input type="date" value={form.workDate} onChange={e => set('workDate', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Job Type</label>
            <select value={form.jobType} onChange={e => set('jobType', e.target.value)}
              className="w-full h-9 border rounded-md px-3 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
              {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Clock In</label>
            <Input type="time" value={form.clockIn} onChange={e => set('clockIn', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Clock Out</label>
            <Input type="time" value={form.clockOut} onChange={e => set('clockOut', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Hourly Rate ($)</label>
            <Input type="number" value={form.hourlyRate} onChange={e => set('hourlyRate', e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Job / Invoice Ref</label>
            <Input value={form.jobReference} onChange={e => set('jobReference', e.target.value)} placeholder="e.g. MCL-1042" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm h-16 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Optional notes..." />
          </div>
        </div>

        {/* Pay preview */}
        {hours > 0 && (
          <div className="bg-indigo-50 rounded-lg p-3 text-sm grid grid-cols-3 gap-2 text-center">
            <div><div className="text-xs text-gray-500">Hours</div><div className="font-bold">{hours.toFixed(2)}</div></div>
            <div><div className="text-xs text-gray-500">OT Hours</div><div className="font-bold text-amber-600">{Math.max(0, hours - 8).toFixed(2)}</div></div>
            <div><div className="text-xs text-gray-500">Est. Pay</div><div className="font-bold text-green-700">${pay.total.toFixed(2)}</div></div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} className="flex-1 bg-indigo-700 hover:bg-indigo-800">Save Entry</Button>
          <Button onClick={onClose} variant="outline" className="flex-1">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function getPayPeriod(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export default function Timesheets() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterWeek, setFilterWeek] = useState('');
  const [saving, setSaving] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setAuthChecked(true); }).catch(() => setAuthChecked(true));
  }, []);

  const load = async (currentUser) => {
    setLoading(true);
    let data;
    if (currentUser?.role === 'admin') {
      data = await base44.entities.Timesheet.list('-workDate', 200);
    } else {
      // Regular users only see their own entries, matched by email
      data = await base44.entities.Timesheet.filter({ staffEmail: currentUser?.email }, '-workDate', 200);
    }
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => { if (authChecked && user) load(user); }, [authChecked, user]);

  const filtered = entries.filter(e => {
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    if (filterBranch !== 'all' && e.branch !== filterBranch) return false;
    if (filterWeek && e.payPeriod !== filterWeek) return false;
    return true;
  });

  // Summary stats
  const pendingCount = entries.filter(e => e.status === 'pending').length;
  const totalHours = filtered.reduce((s, e) => s + (e.hoursWorked || 0), 0);
  const totalPay = filtered.reduce((s, e) => s + (e.totalPay || 0), 0);
  const totalOT = filtered.reduce((s, e) => s + (e.overtimeHours || 0), 0);

  const handleSave = async (data) => {
    setSaving(true);
    if (editEntry?.id) {
      await base44.entities.Timesheet.update(editEntry.id, data);
    } else {
      await base44.entities.Timesheet.create(data);
    }
    setSaving(false);
    setShowModal(false);
    setEditEntry(null);
    load(user);
  };

  const handleApprove = async (entry) => {
    await base44.entities.Timesheet.update(entry.id, {
      status: 'approved',
      approvedAt: new Date().toISOString(),
    });
    load(user);
  };

  const handleReject = async (entry) => {
    await base44.entities.Timesheet.update(entry.id, { status: 'rejected' });
    load(user);
  };

  const handleMarkPaid = async (entry) => {
    await base44.entities.Timesheet.update(entry.id, { status: 'paid' });
    load(user);
  };

  const isAdmin = user?.role === 'admin';

  if (!authChecked) return <div className="flex justify-center items-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>;

  const handleExportCSV = () => {
    const rows = [
      ['Name', 'Type', 'Branch', 'Date', 'Job', 'Clock In', 'Clock Out', 'Hours', 'OT Hours', 'Rate', 'Regular Pay', 'OT Pay', 'Total Pay', 'Status', 'Pay Period'],
      ...filtered.map(e => [
        e.staffName, e.staffType, e.branch, e.workDate, e.jobReference || '',
        e.clockIn, e.clockOut, e.hoursWorked, e.overtimeHours, e.hourlyRate,
        e.regularPay?.toFixed(2), e.overtimePay?.toFixed(2), e.totalPay?.toFixed(2),
        e.status, e.payPeriod,
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheets-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        icon={Clock}
        title="Timesheets"
        subtitle="Staff hours tracking & payroll prep"
        action={
          <div className="flex gap-2">
            {isAdmin && (
              <>
                <Button onClick={handleExportCSV} variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10 gap-1">
                  <Download className="w-4 h-4" /> Export CSV
                </Button>
                <Button onClick={() => setShowQR(true)} variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10 gap-1">
                  <QrCode className="w-4 h-4" /> QR Code
                </Button>
              </>
            )}
            <Button onClick={() => { setEditEntry(null); setShowModal(true); }} className="gap-1 text-white hover:opacity-90" style={{ backgroundColor: '#F5A623' }}>
              <Plus className="w-4 h-4" /> Log Hours
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Personal view banner for non-admins */}
        {!isAdmin && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 text-sm text-indigo-800">
            Showing your personal timesheet entries. Your email (<strong>{user?.email}</strong>) must match the <em>Staff Email</em> field on each entry.
          </div>
        )}
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Pending Approval', value: pendingCount, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Total Hours (filtered)', value: totalHours.toFixed(1) + 'h', color: 'text-indigo-700', bg: 'bg-indigo-50' },
            { label: 'Overtime Hours', value: totalOT.toFixed(1) + 'h', color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Est. Total Pay', value: '$' + totalPay.toLocaleString(undefined, { minimumFractionDigits: 2 }), color: 'text-green-700', bg: 'bg-green-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-lg p-4`}>
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 bg-white rounded-lg border p-3">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="h-8 border rounded px-2 text-sm bg-white focus:outline-none">
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
          </select>
          <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
            className="h-8 border rounded px-2 text-sm bg-white focus:outline-none">
            <option value="all">All Branches</option>
            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <Input
            type="week"
            value={filterWeek ? filterWeek.replace('W', '') : ''}
            onChange={e => setFilterWeek(e.target.value ? e.target.value.replace('-', '-W') : '')}
            className="h-8 text-sm w-44"
            placeholder="Filter by week"
          />
          {(filterStatus !== 'all' || filterBranch !== 'all' || filterWeek) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterStatus('all'); setFilterBranch('all'); setFilterWeek(''); }}>
              Clear
            </Button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-lg border p-12 text-center text-gray-400">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <div>No timesheet entries found.</div>
            <Button onClick={() => { setEditEntry(null); setShowModal(true); }} className="mt-4 bg-indigo-700 hover:bg-indigo-800">
              <Plus className="w-4 h-4 mr-1" /> Log First Entry
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Staff', 'Branch', 'Date', 'In / Out', 'Hours', 'OT', 'Pay', 'Job', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className="border-b hover:bg-gray-50 transition">
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{e.staffName}</div>
                      <div className="text-xs text-gray-400">{e.staffType}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{e.branch}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{e.workDate}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap font-mono text-xs">{e.clockIn} – {e.clockOut}</td>
                    <td className="px-3 py-2 font-semibold">{(e.hoursWorked || 0).toFixed(2)}h</td>
                    <td className="px-3 py-2 text-amber-600 font-medium">{(e.overtimeHours || 0) > 0 ? `+${(e.overtimeHours || 0).toFixed(2)}h` : '—'}</td>
                    <td className="px-3 py-2 text-green-700 font-semibold">${(e.totalPay || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{e.jobReference || e.jobType}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[e.status] || 'bg-gray-100 text-gray-600'}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                     <div className="flex gap-1">
                       {isAdmin && e.status === 'pending' && (
                         <>
                           <button onClick={() => handleApprove(e)} title="Approve"
                             className="p-1 text-green-600 hover:bg-green-50 rounded">
                             <CheckCircle className="w-4 h-4" />
                           </button>
                           <button onClick={() => handleReject(e)} title="Reject"
                             className="p-1 text-red-500 hover:bg-red-50 rounded">
                             <XCircle className="w-4 h-4" />
                           </button>
                         </>
                       )}
                       {isAdmin && e.status === 'approved' && (
                         <button onClick={() => handleMarkPaid(e)} title="Mark Paid"
                           className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                           <DollarSign className="w-4 h-4" />
                         </button>
                       )}
                       {e.status === 'pending' && (
                         <button onClick={() => { setEditEntry(e); setShowModal(true); }}
                           className="p-1 text-gray-400 hover:bg-gray-100 rounded text-xs px-2">
                           Edit
                         </button>
                       )}
                     </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showQR && <QRCodeGenerator onClose={() => setShowQR(false)} />}

      {showModal && (
        <EntryModal
          entry={editEntry}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditEntry(null); }}
        />
      )}
    </div>
  );
}