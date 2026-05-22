import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, MessageSquare, Loader2, Check, Phone } from 'lucide-react';
import { format } from 'date-fns';

export default function TextCrewModal({ date, rentals = [], deliveries = [], onClose }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [results, setResults] = useState([]);
  const [customMessage, setCustomMessage] = useState('');

  const dateStr = format(date, 'yyyy-MM-dd');
  const displayDate = format(date, 'EEEE, MMMM d');

  // Build schedule summary for this date
  const goingOut = rentals.filter(r => r.startDate === dateStr && ['reservation','contract'].includes(r.status));
  const dueBack  = rentals.filter(r => r.endDate === dateStr && r.status === 'out');
  const todayDeliveries = deliveries.filter(d => d.scheduledDate === dateStr && !['completed','cancelled'].includes(d.status));

  // Collect unique drivers assigned to today's deliveries
  const assignedDrivers = [];
  const seen = new Set();
  todayDeliveries.forEach(d => {
    if (d.driverId && !seen.has(d.driverId)) {
      seen.add(d.driverId);
      assignedDrivers.push({ id: d.driverId, name: d.driverName, phone: null }); // phone resolved via StaffPhone
    }
    (d.teamDrivers || []).forEach(td => {
      if (td.driverId && !seen.has(td.driverId)) {
        seen.add(td.driverId);
        assignedDrivers.push({ id: td.driverId, name: td.driverName, phone: null });
      }
    });
  });

  const defaultMessage = [
    `📅 Schedule for ${displayDate}:`,
    goingOut.length > 0 ? `🚀 Going Out (${goingOut.length}): ${goingOut.map(r => `${r.customerName} – ${r.equipmentName}`).join('; ')}` : null,
    dueBack.length > 0  ? `🔁 Due Back (${dueBack.length}): ${dueBack.map(r => `${r.customerName} – ${r.equipmentName}`).join('; ')}` : null,
    todayDeliveries.length > 0 ? `🚚 Deliveries (${todayDeliveries.length}): ${todayDeliveries.map(d => `${d.customerName}${d.scheduledTime ? ` @ ${d.scheduledTime}` : ''}`).join('; ')}` : null,
    '– Rental World Operations',
  ].filter(Boolean).join('\n');

  const messageToSend = customMessage.trim() || defaultMessage;

  const handleSend = async () => {
    if (assignedDrivers.length === 0) {
      alert('No drivers assigned to deliveries today. Assign drivers first via Dispatch.');
      return;
    }
    setSending(true);
    const resultList = [];
    try {
      // Look up StaffPhone records for drivers
      const staffPhones = await base44.entities.StaffPhone.list();

      for (const driver of assignedDrivers) {
        const sp = staffPhones.find(p => p.email === driver.id || p.staffName?.toLowerCase() === driver.name?.toLowerCase());
        const phone = sp?.phone;
        if (!phone) {
          resultList.push({ name: driver.name, status: 'no_phone', phone: null });
          continue;
        }
        try {
          await base44.functions.invoke('driverSMS', {
            phone,
            message: messageToSend,
            driverName: driver.name,
          });
          resultList.push({ name: driver.name, status: 'sent', phone });
        } catch (err) {
          resultList.push({ name: driver.name, status: 'error', phone, error: err.message });
        }
      }
      setResults(resultList);
      setSent(true);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-gray-900">Text Crew — {displayDate}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Schedule summary */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 space-y-1">
            <div className="font-semibold text-gray-900 mb-1">Today's Schedule Summary</div>
            <div>🚀 Going out: <strong>{goingOut.length}</strong></div>
            <div>🔁 Due back: <strong>{dueBack.length}</strong></div>
            <div>🚚 Deliveries: <strong>{todayDeliveries.length}</strong></div>
          </div>

          {/* Assigned drivers */}
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-2">
              Drivers to Notify ({assignedDrivers.length})
            </div>
            {assignedDrivers.length === 0 ? (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠️ No drivers assigned to today's deliveries. Go to <strong>Dispatch</strong> to assign drivers first.
              </div>
            ) : (
              <div className="space-y-1">
                {assignedDrivers.map(d => {
                  const result = results.find(r => r.name === d.name);
                  return (
                    <div key={d.id} className="flex items-center justify-between text-xs bg-gray-50 rounded px-3 py-1.5">
                      <span className="font-medium text-gray-800">{d.name}</span>
                      {result ? (
                        result.status === 'sent' ? <span className="text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> Sent</span>
                        : result.status === 'no_phone' ? <span className="text-amber-600">No phone on file</span>
                        : <span className="text-red-600">Error</span>
                      ) : (
                        <span className="text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" /> Pending</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Message */}
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-1">Message Preview</div>
            <textarea
              value={customMessage || defaultMessage}
              onChange={e => setCustomMessage(e.target.value)}
              rows={6}
              className="w-full text-xs border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
            <div className="text-[10px] text-gray-400 mt-1">Edit above to customize, or leave as-is for the auto-generated schedule.</div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t bg-gray-50">
          <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg border hover:bg-gray-100 transition">
            {sent ? 'Close' : 'Cancel'}
          </button>
          {!sent && (
            <button
              onClick={handleSend}
              disabled={sending || assignedDrivers.length === 0}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50 transition"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
              {sending ? 'Sending...' : `Send to ${assignedDrivers.length} Driver${assignedDrivers.length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}