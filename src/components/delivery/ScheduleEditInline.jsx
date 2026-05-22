import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CalendarClock, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ScheduleEditInline({ delivery, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [newDate, setNewDate] = useState(delivery.scheduledDate || '');
  const [newTime, setNewTime] = useState(delivery.scheduledTime || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!newDate) return;
    setSaving(true);
    try {
      const me = await base44.auth.me();
      await base44.entities.Delivery.update(delivery.id, {
        scheduledDate: newDate,
        scheduledTime: newTime,
        previousScheduledDate: delivery.scheduledDate,
        previousScheduledTime: delivery.scheduledTime || '',
        scheduleChangedAt: new Date().toISOString(),
        scheduleChangedBy: me?.email || 'user',
      });

      // Auto-text the assigned driver about the schedule change
      if (delivery.driverId) {
        try {
          const staffPhones = await base44.entities.StaffPhone.list();
          const sp = staffPhones.find(p =>
            p.email === delivery.driverId ||
            p.staffName?.toLowerCase() === delivery.driverName?.toLowerCase()
          );
          if (sp?.phone) {
            const oldStr = `${delivery.scheduledDate || '?'}${delivery.scheduledTime ? ' @ ' + delivery.scheduledTime : ''}`;
            const newStr = `${newDate}${newTime ? ' @ ' + newTime : ''}`;
            const msg = `⚠️ SCHEDULE CHANGE — ${delivery.customerName}: was ${oldStr}, now ${newStr}. Please update your plans. – Rental World Operations`;
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
          // SMS failure is non-fatal — schedule was already saved
          toast.warning('Schedule saved, but SMS failed: ' + smsErr.message);
        }
      }

      setEditing(false);
      if (onSaved) onSaved();
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={e => { e.stopPropagation(); setEditing(true); }}
        className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 flex-shrink-0"
        title="Reschedule delivery"
      >
        <CalendarClock className="w-3 h-3" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
      <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
        className="text-xs border rounded px-1 py-0.5 w-28" />
      <input type="text" placeholder="Time" value={newTime} onChange={e => setNewTime(e.target.value)}
        className="text-xs border rounded px-1 py-0.5 w-20" />
      <button onClick={handleSave} disabled={saving || !newDate}
        className="p-0.5 text-green-600 hover:text-green-800 disabled:opacity-50">
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
      </button>
      <button onClick={() => setEditing(false)} className="p-0.5 text-gray-400 hover:text-gray-600">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}