import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function FleetDispatchModal({ reports, onClose, onSent }) {
  const [staffEmails, setStaffEmails] = useState([]);
  const [selected, setSelected] = useState([]);
  const [customEmail, setCustomEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.CustomEmail.filter({ type: 'recipient' }),
      base44.auth.me(),
    ]).then(([emails, me]) => {
      setStaffEmails(emails.map(e => e.email));
      setUser(me);
    });
  }, []);

  const toggle = (email) => {
    setSelected(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleSend = async () => {
    const recipients = [...selected];
    if (customEmail.trim()) recipients.push(customEmail.trim());
    if (!recipients.length) return;

    setSending(true);
    await base44.functions.invoke('sendFleetDecision', {
      reportIds: reports.map(r => r.id),
      recipients,
      sentBy: user?.email || '',
    });

    // Update each report
    const now = new Date().toISOString();
    await Promise.all(reports.map(r =>
      base44.entities.Report.update(r.id, {
        isSent: true,
        lastSentAt: now,
        sentAt: r.sentAt || now,
        sendToEmails: recipients,
        activityLog: [...(r.activityLog || []), `Dispatched to ${recipients.join(', ')} at ${now}`],
      })
    ));

    setSending(false);
    onSent();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <div className="font-semibold text-gray-900">Dispatch Fleet Decision</div>
            <div className="text-xs text-gray-500 mt-0.5">{reports.length} vehicle{reports.length !== 1 ? 's' : ''}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Staff Recipients</div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {staffEmails.length === 0 && (
                <div className="text-xs text-gray-400 italic">No staff emails configured — add them in Settings → Custom Emails.</div>
              )}
              {staffEmails.map(email => (
                <label key={email} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(email)}
                    onChange={() => toggle(email)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">{email}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add Custom Email</div>
            <Input
              type="email"
              placeholder="someone@example.com"
              value={customEmail}
              onChange={e => setCustomEmail(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500">
            <strong>Vehicles:</strong> {reports.map(r => r.itemName).join(', ')}
          </div>
        </div>

        <div className="px-5 py-4 border-t flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
          <Button
            onClick={handleSend}
            disabled={sending || (selected.length === 0 && !customEmail.trim())}
            size="sm"
            className="gap-2"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {sending ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}