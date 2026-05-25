import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Send, CheckCircle, Loader2, AlertCircle, Download } from 'lucide-react';
import { BRANCH_DATA } from '@/lib/branchData';

const BRANCHES = Object.keys(BRANCH_DATA);

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return { rows: [], error: 'CSV must have a header row and at least one data row.' };

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  const emailIdx = headers.findIndex(h => h.includes('email'));
  const nameIdx = headers.findIndex(h => h.includes('name'));

  if (emailIdx === -1) return { rows: [], error: 'CSV must have an "email" column.' };

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const email = cols[emailIdx] || '';
    const fullName = nameIdx !== -1 ? cols[nameIdx] || '' : '';
    if (email) rows.push({ email, fullName, branch: '', role: 'user', status: 'pending' });
  }

  return { rows, error: null };
}

export default function CSVImportPanel({ onClose, onImportDone }) {
  const fileRef = useRef();
  const [rows, setRows] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [bulkBranch, setBulkBranch] = useState('');
  const [sending, setSending] = useState({});
  const [sendingAll, setSendingAll] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { rows: parsed, error } = parseCSV(ev.target.result);
      setParseError(error);
      setRows(parsed);
    };
    reader.readAsText(file);
  };

  const applyBulkBranch = () => {
    if (!bulkBranch) return;
    setRows(prev => prev.map(r => ({ ...r, branch: bulkBranch })));
  };

  const updateRow = (idx, field, value) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const sendInvite = async (idx) => {
    const row = rows[idx];
    if (!row.email) return;
    setSending(s => ({ ...s, [idx]: true }));
    try {
      await base44.users.inviteUser(row.email.trim(), row.role || 'user');
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, status: 'invited' } : r));
    } catch (err) {
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, status: 'error', error: err.message } : r));
    } finally {
      setSending(s => ({ ...s, [idx]: false }));
    }
  };

  const sendAllInvites = async () => {
    setSendingAll(true);
    const pending = rows.map((r, i) => ({ ...r, idx: i })).filter(r => r.status === 'pending');
    for (const row of pending) {
      setSending(s => ({ ...s, [row.idx]: true }));
      try {
        await base44.users.inviteUser(row.email.trim(), row.role || 'user');
        setRows(prev => prev.map((r, i) => i === row.idx ? { ...r, status: 'invited' } : r));
      } catch (err) {
        setRows(prev => prev.map((r, i) => i === row.idx ? { ...r, status: 'error', error: err.message } : r));
      } finally {
        setSending(s => ({ ...s, [row.idx]: false }));
      }
    }
    setSendingAll(false);
    onImportDone?.();
  };

  const pendingCount = rows.filter(r => r.status === 'pending').length;
  const invitedCount = rows.filter(r => r.status === 'invited').length;

  return (
    <div className="bg-white border rounded-xl shadow-sm p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800 text-lg flex items-center gap-2">
          <Upload className="w-5 h-5 text-indigo-500" /> Bulk Import from CSV
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Download template */}
      <div className="mb-4 flex items-center gap-3">
        <a
          href="data:text/csv;charset=utf-8,full_name,email%0AJohn%20Smith,john@example.com"
          download="employee_template.csv"
          className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline"
        >
          <Download className="w-4 h-4" /> Download CSV template
        </a>
        <span className="text-gray-300">|</span>
        <span className="text-sm text-gray-500">Columns: <code className="bg-gray-100 px-1 rounded">full_name</code>, <code className="bg-gray-100 px-1 rounded">email</code></span>
      </div>

      {/* File picker */}
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition mb-4"
      >
        <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-500">{rows.length > 0 ? `${rows.length} employees loaded — click to replace` : 'Click to upload CSV'}</p>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
      </div>

      {parseError && (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {parseError}
        </div>
      )}

      {rows.length > 0 && (
        <>
          {/* Bulk branch assign */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600 font-medium whitespace-nowrap">Assign all to branch:</span>
            <Select value={bulkBranch} onValueChange={setBulkBranch}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select branch…" />
              </SelectTrigger>
              <SelectContent>
                {BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={applyBulkBranch} disabled={!bulkBranch}>Apply</Button>
          </div>

          {/* Employee table */}
          <div className="border rounded-lg overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-600 font-medium">Name</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-medium">Email</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-medium">Branch</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-medium">Role</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-medium">Invite</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row, idx) => (
                  <tr key={idx} className={row.status === 'invited' ? 'bg-green-50' : row.status === 'error' ? 'bg-red-50' : ''}>
                    <td className="px-3 py-2 text-gray-800">{row.fullName || <span className="text-gray-400 italic">—</span>}</td>
                    <td className="px-3 py-2 text-gray-600">{row.email}</td>
                    <td className="px-3 py-2">
                      <Select value={row.branch} onValueChange={v => updateRow(idx, 'branch', v)}>
                        <SelectTrigger className="h-7 text-xs w-32">
                          <SelectValue placeholder="Branch…" />
                        </SelectTrigger>
                        <SelectContent>
                          {BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Select value={row.role} onValueChange={v => updateRow(idx, 'role', v)}>
                        <SelectTrigger className="h-7 text-xs w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="counter">Counter</SelectItem>
                          <SelectItem value="driver">Driver</SelectItem>
                          <SelectItem value="mechanic">Mechanic</SelectItem>
                          <SelectItem value="accountant">Accountant</SelectItem>
                          <SelectItem value="planner">Planner</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      {row.status === 'invited' ? (
                        <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Invited</Badge>
                      ) : row.status === 'error' ? (
                        <span className="text-xs text-red-600" title={row.error}>Failed</span>
                      ) : (
                        <button
                          onClick={() => sendInvite(idx)}
                          disabled={sending[idx]}
                          className="text-xs text-indigo-600 hover:underline disabled:opacity-40 flex items-center gap-1"
                        >
                          {sending[idx] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          Send
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary + bulk send */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {invitedCount > 0 && <span className="text-green-600 font-medium">{invitedCount} invited</span>}
              {invitedCount > 0 && pendingCount > 0 && <span className="mx-2 text-gray-300">·</span>}
              {pendingCount > 0 && <span>{pendingCount} pending</span>}
            </div>
            {pendingCount > 0 && (
              <Button
                onClick={sendAllInvites}
                disabled={sendingAll}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {sendingAll ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Invite All ({pendingCount})
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}