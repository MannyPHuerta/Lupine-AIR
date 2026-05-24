import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, CheckCircle, Loader2, AlertCircle, LogOut, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function calcHours(startMins, endMins) {
  if (startMins === null || endMins === null) return 0;
  return Math.round(Math.max(0, endMins - startMins) / 60 * 100) / 100;
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

  // Staff lookup state
  const [query, setQuery] = useState('');
  const [allStaff, setAllStaff] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState('');

  // Load staff roster on mount
  useEffect(() => {
    Promise.all([
      base44.entities.User.list('full_name', 200),
      base44.entities.MechanicProfile.filter({ isActive: true }),
    ]).then(([users, mechs]) => {
      setAllStaff(users);
      setMechanics(mechs);
      setLoadingStaff(false);
    }).catch(() => setLoadingStaff(false));
  }, []);

  // Persist session
  useEffect(() => {
    if (session) {
      localStorage.setItem('clockInSession', JSON.stringify(session));
    } else {
      localStorage.removeItem('clockInSession');
    }
  }, [session]);

  // Live elapsed timer
  useEffect(() => {
    if (!session) return;
    const update = () => {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const mins = Math.max(0, nowMins - session.clockInMins);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      setElapsed(`${h}h ${m}m`);
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [session]);

  // Filter staff by query
  const filteredStaff = query.trim().length < 2 ? [] : allStaff.filter(u =>
    (u.full_name || '').toLowerCase().includes(query.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);

  const getRateForStaff = (user) => {
    const mech = mechanics.find(m => m.email === user.email);
    if (mech?.paymentType === 'hourly' && mech?.hourlyRate > 0) {
      return { rate: mech.hourlyRate, isSalaried: false };
    }
    // Salaried roles — no hourly rate needed
    if (['admin', 'manager', 'planner'].includes(user.role)) {
      return { rate: 0, isSalaried: true };
    }
    return { rate: 0, isSalaried: false };
  };

  const handleSelectStaff = (user) => {
    setSelectedStaff(user);
    setQuery(user.full_name || user.email);
    setShowDropdown(false);
  };

  const handleClockIn = (e) => {
    e?.preventDefault?.();
    if (!selectedStaff) { setError('Please select your name from the list'); return; }
    const now = new Date();
    const clockInTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const { rate, isSalaried } = getRateForStaff(selectedStaff);
    setSession({
      staffName: selectedStaff.full_name || selectedStaff.email,
      staffEmail: selectedStaff.email,
      staffType: selectedStaff.role || 'general',
      hourlyRate: rate,
      isSalaried,
      clockIn: clockInTime,
      clockInMins: timeToMinutes(clockInTime),
      workDate: now.toISOString().split('T')[0],
    });
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
      const regularPay = session.isSalaried ? 0 : regularHours * session.hourlyRate;
      const overtimePay = session.isSalaried ? 0 : overtimeHours * (session.hourlyRate * 1.5);

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
      setSelectedStaff(null);
      setQuery('');
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-sm w-full">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Shift Logged!</h2>
          <p className="text-gray-500 text-sm">Your hours have been submitted for approval.</p>
          {(branch || jobRef) && (
            <div className="mt-4 bg-gray-50 rounded-lg p-3 text-xs text-gray-500 border">
              {branch && <div>Branch: <strong>{branch}</strong></div>}
              {jobRef && <div>Job: <strong>{jobRef}</strong></div>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Active session — clock out screen ──
  if (session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full space-y-6">
          <div className="text-center">
            <Clock className="w-14 h-14 text-amber-600 mx-auto mb-3 animate-pulse" />
            <h1 className="text-2xl font-bold text-gray-900">Clocked In</h1>
            <p className="text-gray-500 mt-1 font-medium">{session.staffName}</p>
          </div>

          <div className="bg-amber-50 rounded-xl p-4 space-y-3 border-2 border-amber-200">
            <div className="flex justify-between">
              <span className="text-gray-600">Clock In</span>
              <span className="font-mono font-bold text-amber-700">{session.clockIn}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Elapsed</span>
              <span className="font-mono font-bold text-amber-700">{elapsed}</span>
            </div>
            {!session.isSalaried && session.hourlyRate > 0 && (
              <div className="border-t border-amber-200 pt-3 flex justify-between">
                <span className="text-gray-600">Est. Earnings</span>
                <span className="text-xl font-bold text-green-700">
                  ${(Math.max(0, (new Date().getHours() * 60 + new Date().getMinutes() - session.clockInMins)) / 60 * session.hourlyRate).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <Button
            onClick={handleClockOut}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 text-lg h-14"
          >
            {loading
              ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Clocking Out…</>
              : <><LogOut className="w-5 h-5 mr-2" /> Clock Out Now</>
            }
          </Button>

          {(branch || jobRef) && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 border text-center">
              {branch && <span>Branch: <strong>{branch}</strong></span>}
              {branch && jobRef && <span className="mx-2">·</span>}
              {jobRef && <span>Job: <strong>{jobRef}</strong></span>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Clock-in form ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full space-y-6">
        <div className="text-center">
          <Clock className="w-12 h-12 text-indigo-600 mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-gray-900">Clock In</h1>
          <p className="text-sm text-gray-500 mt-1">Select your name to start your shift</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleClockIn} className="space-y-4">
          {/* Employee lookup */}
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                placeholder={loadingStaff ? 'Loading staff…' : 'Search your name…'}
                value={query}
                disabled={loadingStaff}
                onChange={e => {
                  setQuery(e.target.value);
                  setSelectedStaff(null);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                className="w-full pl-9 pr-3 border rounded-lg py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                autoComplete="off"
              />
            </div>

            {showDropdown && filteredStaff.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border rounded-xl shadow-lg overflow-hidden">
                {filteredStaff.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onMouseDown={() => handleSelectStaff(u)}
                    className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition flex items-center gap-3 border-b last:border-b-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{u.full_name || u.email}</div>
                      <div className="text-xs text-gray-400 capitalize">{u.role || 'staff'}{u.homeBranch ? ` · ${u.homeBranch}` : ''}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showDropdown && query.trim().length >= 2 && filteredStaff.length === 0 && !loadingStaff && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border rounded-xl shadow-lg px-4 py-3 text-sm text-gray-400 text-center">
                No staff found — ask your manager to add you
              </div>
            )}
          </div>

          {selectedStaff && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <div>
                <div className="font-semibold text-indigo-900 text-sm">{selectedStaff.full_name}</div>
                <div className="text-xs text-indigo-600 capitalize">{selectedStaff.role || 'staff'}</div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={!selectedStaff}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 text-base h-12 disabled:opacity-40"
          >
            <Clock className="w-4 h-4 mr-2" /> Clock In Now
          </Button>
        </form>

        {(branch || jobRef) && (
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 border text-center">
            {branch && <span>Branch: <strong>{branch}</strong></span>}
            {branch && jobRef && <span className="mx-2">·</span>}
            {jobRef && <span>Job: <strong>{jobRef}</strong></span>}
          </div>
        )}
      </div>
    </div>
  );
}