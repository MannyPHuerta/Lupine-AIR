import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2, CheckCircle, Trash2, Users } from 'lucide-react';

export default function RosterPanel({ onRosterChange }) {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({});
  const [sendingAll, setSendingAll] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.UserRoster.list('-created_date');
    setRoster(data);
    setLoading(false);
  };

  const updateRow = async (id, field, value) => {
    setRoster(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    await base44.entities.UserRoster.update(id, { [field]: value });
  };

  const sendInvite = async (entry) => {
    setSending(s => ({ ...s, [entry.id]: true }));
    try {
      await base44.users.inviteUser(entry.email.trim(), entry.role || 'user');
      await base44.entities.UserRoster.update(entry.id, { inviteStatus: 'invited', invitedAt: new Date().toISOString() });
      setRoster(prev => prev.map(r => r.id === entry.id ? { ...r, inviteStatus: 'invited', invitedAt: new Date().toISOString() } : r));
      onRosterChange?.();
    } catch (err) {
      await base44.entities.UserRoster.update(entry.id, { inviteStatus: 'error', inviteError: err.message });
      setRoster(prev => prev.map(r => r.id === entry.id ? { ...r, inviteStatus: 'error', inviteError: err.message } : r));
    } finally {
      setSending(s => ({ ...s, [entry.id]: false }));
    }
  };

  const sendAllPending = async () => {
    setSendingAll(true);
    const pending = roster.filter(r => r.inviteStatus === 'pending');
    for (const entry of pending) {
      setSending(s => ({ ...s, [entry.id]: true }));
      try {
        await base44.users.inviteUser(entry.email.trim(), entry.role || 'user');
        await base44.entities.UserRoster.update(entry.id, { inviteStatus: 'invited', invitedAt: new Date().toISOString() });
        setRoster(prev => prev.map(r => r.id === entry.id ? { ...r, inviteStatus: 'invited' } : r));
      } catch (err) {
        await base44.entities.UserRoster.update(entry.id, { inviteStatus: 'error', inviteError: err.message });
        setRoster(prev => prev.map(r => r.id === entry.id ? { ...r, inviteStatus: 'error' } : r));
      } finally {
        setSending(s => ({ ...s, [entry.id]: false }));
      }
    }
    setSendingAll(false);
    onRosterChange?.();
  };

  const deleteEntry = async (id) => {
    await base44.entities.UserRoster.delete(id);
    setRoster(prev => prev.filter(r => r.id !== id));
  };

  const pendingCount = roster.filter(r => r.inviteStatus === 'pending').length;

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  if (roster.length === 0) {
    return (
      <div className="bg-white border rounded-xl p-10 text-center text-gray-400 shadow-sm">
        <Users className="w-10 h-10 mx-auto mb-3 text-gray-200" />
        <p className="font-medium text-gray-500">No saved roster yet</p>
        <p className="text-sm mt-1">Upload a CSV and click "Save to Roster" to stage employees before inviting.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-800">Saved Roster ({roster.length})</h2>
          <p className="text-xs text-gray-500 mt-0.5">{pendingCount} pending invite{pendingCount !== 1 ? 's' : ''}</p>
        </div>
        {pendingCount > 0 && (
          <Button onClick={sendAllPending} disabled={sendingAll} className="bg-indigo-600 hover:bg-indigo-700">
            {sendingAll ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Invite All Pending ({pendingCount})
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Name</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Email</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Branch</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Role</th>
              <th className="text-left px-4 py-2 text-gray-600 font-medium">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {roster.map(entry => (
              <tr key={entry.id} className={entry.inviteStatus === 'invited' ? 'bg-green-50' : entry.inviteStatus === 'error' ? 'bg-red-50' : ''}>
                <td className="px-4 py-2 text-gray-800">{entry.fullName || <span className="text-gray-400 italic">—</span>}</td>
                <td className="px-4 py-2 text-gray-600">{entry.email}</td>
                <td className="px-4 py-2 text-gray-500 text-xs">{entry.branch || '—'}</td>
                <td className="px-4 py-2">
                  {entry.inviteStatus === 'pending' ? (
                    <Select value={entry.role || 'user'} onValueChange={v => updateRow(entry.id, 'role', v)}>
                      <SelectTrigger className="h-7 text-xs w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['user','admin','manager','counter','driver','mechanic','accountant','planner'].map(r => (
                          <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs text-gray-600">{entry.role || 'user'}</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {entry.inviteStatus === 'invited' ? (
                    <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Invited</Badge>
                  ) : entry.inviteStatus === 'error' ? (
                    <span className="text-xs text-red-600" title={entry.inviteError}>Failed</span>
                  ) : (
                    <button
                      onClick={() => sendInvite(entry)}
                      disabled={sending[entry.id]}
                      className="text-xs text-indigo-600 hover:underline disabled:opacity-40 flex items-center gap-1"
                    >
                      {sending[entry.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Invite
                    </button>
                  )}
                </td>
                <td className="px-4 py-2">
                  <button onClick={() => deleteEntry(entry.id)} className="text-gray-300 hover:text-red-500 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}