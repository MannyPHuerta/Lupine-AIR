import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, CalendarClock, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

/**
 * DeliveryRescheduleModal
 * Props:
 *   delivery  – the delivery record
 *   onClose   – called when modal is dismissed
 *   onSaved   – called after successful save (receives updated delivery)
 */
export default function DeliveryRescheduleModal({ delivery, onClose, onSaved }) {
  const [date, setDate]     = useState(delivery.scheduledDate || '');
  const [time, setTime]     = useState(delivery.scheduledTime || '');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!date) return;
    setSaving(true);
    try {
      const me = await base44.auth.me();
      const updated = {
        scheduledDate: date,
        scheduledTime: time,
        previousScheduledDate: delivery.scheduledDate,
        previousScheduledTime: delivery.scheduledTime || '',
        scheduleChangedAt: new Date().toISOString(),
        scheduleChangedBy: me?.email || 'user',
      };
      await base44.entities.Delivery.update(delivery.id, updated);

      // Auto-text driver if assigned
      if (delivery.driverId) {
        try {
          const staffPhones = await base44.entities.StaffPhone.list();
          const sp = staffPhones.find(p =>
            p.email === delivery.driverId ||
            p.staffName?.toLowerCase() === delivery.driverName?.toLowerCase()
          );
          if (sp?.phone) {
            const oldStr = `${delivery.scheduledDate || '?'}${delivery.scheduledTime ? ' @ ' + delivery.scheduledTime : ''}`;
            const newStr = `${date}${time ? ' @ ' + time : ''}`;
            const msg = [
              `⚠️ SCHEDULE CHANGE — ${delivery.customerName}:`,
              `Was: ${oldStr}`,
              `Now: ${newStr}`,
              reason ? `Note: ${reason}` : null,
              '– Rental World Operations',
            ].filter(Boolean).join('\n');

            await base44.functions.invoke('driverSMS', {
              phone: sp.phone,
              message: msg,
              driverName: delivery.driverName,
            });
            toast.success(`📱 ${delivery.driverName} texted about schedule change`);
          } else {
            toast.warning(`Schedule saved — no phone on file for ${delivery.driverName}`);
          }
        } catch (smsErr) {
          toast.warning('Schedule saved, SMS failed: ' + smsErr.message);
        }
      }

      onSaved?.({ ...delivery, ...updated });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-indigo-600" />
            <div>
              <div className="font-bold text-gray-900 text-sm">Reschedule Delivery</div>
              <div className="text-xs text-gray-500">{delivery.customerName}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Current schedule */}
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600">
            <span className="font-semibold text-gray-700">Current: </span>
            {delivery.scheduledDate || '—'}
            {delivery.scheduledTime ? ` @ ${delivery.scheduledTime}` : ''}
            {delivery.driverName && <span className="ml-2 text-indigo-600">· {delivery.driverName}</span>}
          </div>

          {/* New date */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">New Date *</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* New time */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Time Window</label>
            <input
              type="text"
              placeholder="e.g. 10am–12pm"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Reason / Notes
              {delivery.driverId && (
                <span className="ml-1 font-normal text-indigo-600 flex items-center gap-0.5 inline-flex">
                  <MessageSquare className="w-3 h-3" /> will be texted to driver
                </span>
              )}
            </label>
            <textarea
              rows={3}
              placeholder="Customer requested morning slot, items added, etc."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg border hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !date}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50 transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save & Notify'}
          </button>
        </div>
      </div>
    </div>
  );
}