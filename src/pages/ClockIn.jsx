import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  return {
    regular: regular * rate,
    overtime: overtime * (rate * 1.5),
    total: regular * rate + overtime * (rate * 1.5),
  };
}

function getPayPeriod(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export default function ClockIn() {
  const [params, setParams] = useState({});
  const [form, setForm] = useState({
    staffName: '',
    clockIn: '',
    clockOut: '',
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const p = {
      branch: urlParams.get('branch') || '',
      jobReference: urlParams.get('job') || '',
      jobType: urlParams.get('type') || 'general',
      staffType: urlParams.get('staffType') || 'temp',
      hourlyRate: parseFloat(urlParams.get('rate') || '0'),
    };
    setParams(p);
    // Default clock-in to now
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setForm(f => ({ ...f, clockIn: `${hh}:${mm}` }));
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const hours = calcHours(form.clockIn, form.clockOut);
  const pay = calcPay(hours, params.hourlyRate);

  const handleSubmit = async () => {
    if (!form.staffName.trim()) { setError('Please enter your name.'); return; }
    if (!form.clockIn) { setError('Please enter your clock-in time.'); return; }
    if (!form.clockOut) { setError('Please enter your clock-out time.'); return; }
    if (hours <= 0) { setError('Clock-out must be after clock-in.'); return; }
    setError('');
    setSaving(true);
    await base44.entities.Timesheet.create({
      staffName: form.staffName.trim(),
      staffType: params.staffType || 'temp',
      branch: params.branch,
      jobReference: params.jobReference,
      jobType: params.jobType,
      workDate: today,
      clockIn: form.clockIn,
      clockOut: form.clockOut,
      hoursWorked: hours,
      overtimeHours: Math.max(0, hours - 8),
      hourlyRate: params.hourlyRate || 0,
      regularPay: pay.regular,
      overtimePay: pay.overtime,
      totalPay: pay.total,
      notes: form.notes,
      status: 'pending',
      payPeriod: getPayPeriod(today),
    });
    setSaving(false);
    setSubmitted(true);
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  if (submitted) {
    return (
      <div className="min-h-screen bg-indigo-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">Hours Logged!</h2>
          <p className="text-gray-600">
            <span className="font-semibold">{form.staffName}</span> — {hours.toFixed(2)} hours logged for today.
          </p>
          {params.jobReference && (
            <p className="text-sm text-gray-500">Job: <span className="font-medium">{params.jobReference}</span></p>
          )}
          {params.branch && (
            <p className="text-sm text-gray-500">Branch: <span className="font-medium">{params.branch}</span></p>
          )}
          <p className="text-xs text-gray-400 mt-4">Your manager will review and approve your hours. You can close this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-800 px-6 py-5 text-white text-center">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-80" />
          <h1 className="text-lg font-bold">Clock In / Out</h1>
          {params.branch && <p className="text-indigo-300 text-sm mt-1">{params.branch}</p>}
          {params.jobReference && (
            <p className="text-indigo-200 text-xs mt-1">Job: {params.jobReference}</p>
          )}
          <p className="text-indigo-400 text-xs mt-1">{today}</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Full Name *</label>
            <Input
              value={form.staffName}
              onChange={e => set('staffName', e.target.value)}
              placeholder="First and last name"
              className="text-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clock In *</label>
              <Input type="time" value={form.clockIn} onChange={e => set('clockIn', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clock Out *</label>
              <Input type="time" value={form.clockOut} onChange={e => set('clockOut', e.target.value)} />
            </div>
          </div>

          {hours > 0 && (
            <div className="bg-indigo-50 rounded-lg p-3 text-center grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-gray-500">Total Hours</div>
                <div className="text-xl font-bold text-indigo-700">{hours.toFixed(2)}h</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">OT Hours</div>
                <div className="text-xl font-bold text-amber-600">{Math.max(0, hours - 8).toFixed(2)}h</div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm h-16 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Any notes about your shift..."
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-indigo-700 hover:bg-indigo-800 text-white text-base py-5"
          >
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Submit Hours'}
          </Button>

          <p className="text-xs text-gray-400 text-center">Your hours will be reviewed and approved by your manager.</p>
        </div>
      </div>
    </div>
  );
}