import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, CheckCircle, Loader2, AlertCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function calcHours(startMins, endMins) {
  if (startMins === null || endMins === null) return 0;
  const diff = Math.max(0, endMins - startMins);
  return Math.round(diff / 60 * 100) / 100;
}

function getPayPeriod(dateStr) {
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export default function ClockIn() {
  const params = new URLSearchParams(window.location.search);
  const branch = params.get('branch') || '';
  const jobRef = params.get('job') || '';
  const jobType = params.get('jobType') || 'general';

  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem('clockInSession');
    return saved ? JSON.parse(saved) : null;
  });
  const [form, setForm] = useState({
    staffName: '',
    staffEmail: '',
    staffType: 'temp',
    hourlyRate: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) {
      localStorage.setItem('clockInSession', JSON.stringify(session));
    } else {
      localStorage.removeItem('clockInSession');
    }
  }, [session]);

  const handleClockIn = (e) => {
    e?.preventDefault?.();
    if (!form.staffName.trim()) { setError('Name required'); return; }
    if (!form.hourlyRate) { setError('Hourly rate required'); return; }

    const now = new Date();
    const clockInTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newSession = {
      staffName: form.staffName.trim(),
      staffEmail: form.staffEmail.trim(),
      staffType: form.staffType,
      hourlyRate: parseFloat(form.hourlyRate),
      clockIn: clockInTime,
      clockInMins: timeToMinutes(clockInTime),
      workDate: now.toISOString().split('T')[0],
    };
    setSession(newSession);
    setError('');
  };

  const handleClockOut = async () => {
    if (!session) return;
    setLoading(true);
    setError('');
    try {
      const now = new Date();
      const clockOutTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const clockOutMins = timeToMinutes(clockOutTime);
      const hours = calcHours(session.clockInMins, clockOutMins);
      const regularHours = Math.min(hours, 8);
      const overtimeHours = Math.max(0, hours - 8);
      const regularPay = regularHours * session.hourlyRate;
      const overtimePay = overtimeHours * (session.hourlyRate * 1.5);

      await base44.entities.Timesheet.create({
        staffName: session.staffName,
        staffEmail: session.staffEmail,
        staffType: session.staffType,
        branch,
        jobReference: jobRef,
        jobType,
        workDate: session.workDate,
        clockIn: session.clockIn,
        clockOut: clockOutTime,
        hoursWorked: hours,
        overtimeHours,
        hourlyRate: session.hourlyRate,
        regularPay,
        overtimePay,
        totalPay: regularPay + overtimePay,
        status: 'pending',
        payPeriod: getPayPeriod(session.workDate),
      });

      setSubmitted(true);
      setSession(null);
      setForm({ staffName: '', staffEmail: '', staffType: 'temp', hourlyRate: '' });
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Shift Logged!</h2>
          <p className="text-gray-600 mb-2">Thank you for your work.</p>
          <p className="text-sm text-gray-500">Scan the QR again to start a new shift.</p>
        </div>
      </div>
    );
  }

  // Active session — show clock-out screen
  if (session) {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const elapsedMins = Math.max(0, nowMins - session.clockInMins);
    const elapsedHours = (elapsedMins / 60).toFixed(2);
    const estimatedPay = (elapsedMins / 60 * session.hourlyRate).toFixed(2);

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full space-y-6">
          <div className="text-center">
            <Clock className="w-16 h-16 text-amber-600 mx-auto mb-3 animate-pulse" />
            <h1 className="text-3xl font-bold text-gray-900">Currently Clocked In</h1>
            <p className="text-sm text-gray-500 mt-1">{session.staffName}</p>
          </div>

          <div className="bg-amber-50 rounded-lg p-4 space-y-3 border-2 border-amber-200">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Clocked In:</span>
              <span className="text-lg font-mono font-bold text-amber-700">{session.clockIn}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Elapsed:</span>
              <span className="text-lg font-mono font-bold text-amber-700">{elapsedHours}h</span>
            </div>
            <div className="border-t border-amber-200 pt-3 flex justify-between items-center">
              <span className="text-gray-600 font-medium">Est. Earnings:</span>
              <span className="text-xl font-bold text-green-700">${estimatedPay}</span>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

          <Button 
            onClick={handleClockOut} 
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 text-lg"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Clocking Out...</> : <><LogOut className="w-5 h-5 mr-2" /> Clock Out Now</>}
          </Button>

          {(branch || jobRef) && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 border border-gray-200">
              {branch && <div>Branch: <strong>{branch}</strong></div>}
              {jobRef && <div>Job: <strong>{jobRef}</strong></div>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Not clocked in — show clock-in form
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full space-y-6">
        <div className="text-center">
          <Clock className="w-12 h-12 text-indigo-600 mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-gray-900">Clock In</h1>
          <p className="text-sm text-gray-500 mt-1">Start your work shift</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

        <form onSubmit={handleClockIn} className="space-y-4">
          <input 
            type="text" 
            placeholder="Your full name *" 
            value={form.staffName} 
            onChange={e => setForm({ ...form, staffName: e.target.value })} 
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
            required 
          />
          <input 
            type="email" 
            placeholder="Email (optional)" 
            value={form.staffEmail} 
            onChange={e => setForm({ ...form, staffEmail: e.target.value })} 
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
          />
          
          <select 
            value={form.staffType} 
            onChange={e => setForm({ ...form, staffType: e.target.value })} 
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="temp">Temp Worker</option>
            <option value="event">Event Staff</option>
            <option value="part_time">Part Time</option>
            <option value="full_time">Full Time</option>
          </select>

          <input 
            type="number" 
            placeholder="Hourly rate ($) *" 
            value={form.hourlyRate} 
            onChange={e => setForm({ ...form, hourlyRate: e.target.value })} 
            step="0.01" 
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
            required 
          />

          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 text-base">
            <Clock className="w-4 h-4 mr-2" /> Clock In Now
          </Button>
        </form>

        {(branch || jobRef) && (
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 border border-gray-200">
            {branch && <div>Branch: <strong>{branch}</strong></div>}
            {jobRef && <div>Job: <strong>{jobRef}</strong></div>}
          </div>
        )}
      </div>
    </div>
  );
}