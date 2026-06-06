import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

export default function AttendantLogModal({ drawer, user, onClose, onSaved }) {
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const existing = drawer.attendantLog || [];

  const handleAdd = async () => {
    if (!email.trim()) return;
    setSaving(true);
    const entry = {
      email: email.trim(),
      note: note.trim(),
      loggedBy: user?.email || '',
      loggedAt: new Date().toISOString(),
    };
    await base44.entities.CashDrawer.update(drawer.id, {
      attendantLog: [...existing, entry],
    });
    toast({ title: 'Attendant logged', description: email });
    setSaving(false);
    setEmail('');
    setNote('');
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-600" /> Drawer Attendant Log
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {/* Existing attendants */}
        {existing.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-semibold text-gray-500 uppercase">On this drawer</div>
            {existing.map((a, i) => (
              <div key={i} className="flex justify-between items-center text-xs bg-gray-50 rounded px-3 py-2">
                <span className="font-medium text-gray-700">{a.email}</span>
                {a.note && <span className="text-gray-400 italic">{a.note}</span>}
                <span className="text-gray-400">{new Date(a.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Employee Email</label>
          <Input placeholder="staff@company.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Note (optional)</label>
          <Input placeholder="e.g. covered lunch break 12-1pm" value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <Button onClick={handleAdd} disabled={saving || !email.trim()} className="w-full gap-2">
          <UserPlus className="w-4 h-4" /> {saving ? 'Logging…' : 'Add Attendant'}
        </Button>
      </div>
    </div>
  );
}