import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Mail, Loader2, Shield, User, ToggleLeft, ToggleRight } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.User.list(),
      base44.auth.me()
    ]).then(([userList, me]) => {
      setUsers(userList);
      setCurrentUser(me);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleToggleActive = async (u) => {
    if (u.id === currentUser?.id) return; // can't deactivate yourself
    setTogglingId(u.id);
    const nowActive = !(u.isActive !== false);
    const updates = { isActive: nowActive };
    if (!nowActive) {
      updates.deactivatedAt = new Date().toISOString();
      updates.deactivatedBy = currentUser?.email;
    }
    await base44.entities.User.update(u.id, updates);
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, ...updates } : x));
    setTogglingId(null);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMessage(null);
    try {
      await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      setInviteMessage({ type: 'success', text: `Invite sent to ${inviteEmail}` });
      setInviteEmail('');
      // Refresh user list
      const updated = await base44.entities.User.list();
      setUsers(updated);
    } catch (err) {
      setInviteMessage({ type: 'error', text: err.message || 'Failed to send invite' });
    } finally {
      setInviting(false);
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-8 text-center text-gray-500">
        <Shield className="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Users className="w-7 h-7 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
      </div>

      {/* Invite Form */}
      <div className="bg-white border rounded-xl p-6 mb-8 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-indigo-500" /> Invite a New User
        </h2>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <Input
            type="email"
            placeholder="Email address"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            className="flex-1"
            required
          />
          <Select value={inviteRole} onValueChange={setInviteRole}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={inviting} className="bg-indigo-600 hover:bg-indigo-700">
            {inviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
            Send Invite
          </Button>
        </form>
        {inviteMessage && (
          <div className={`mt-3 text-sm px-3 py-2 rounded-lg ${inviteMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {inviteMessage.text}
          </div>
        )}
      </div>

      {/* User List */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-800">Current Users ({users.length})</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="divide-y">
            {users.map(u => (
              <div key={u.id} className={`flex items-center justify-between px-6 py-4 ${u.isActive === false ? 'opacity-50 bg-gray-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${u.isActive === false ? 'bg-gray-200' : 'bg-indigo-100'}`}>
                    <User className={`w-4 h-4 ${u.isActive === false ? 'text-gray-400' : 'text-indigo-600'}`} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{u.full_name || '—'}</div>
                    <div className="text-sm text-gray-500">{u.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                    {u.role || 'user'}
                  </Badge>
                  {u.id !== currentUser?.id && (
                    <button
                      onClick={() => handleToggleActive(u)}
                      disabled={togglingId === u.id}
                      title={u.isActive === false ? 'Activate user' : 'Deactivate user'}
                      className="text-gray-400 hover:text-gray-700 transition disabled:opacity-40"
                    >
                      {togglingId === u.id
                        ? <Loader2 className="w-5 h-5 animate-spin" />
                        : u.isActive === false
                          ? <ToggleLeft className="w-6 h-6 text-gray-400" />
                          : <ToggleRight className="w-6 h-6 text-green-500" />
                      }
                    </button>
                  )}
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="text-center py-10 text-gray-400">No users found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}