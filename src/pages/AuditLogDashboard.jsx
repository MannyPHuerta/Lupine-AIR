import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Download, RefreshCw, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function AuditLogDashboard() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = () => {
    setLoading(true);
    base44.entities.AuditLog.list('-performedAt', 5000)
      .then(setLogs)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Extract unique values for filters
  const actions = useMemo(() => [...new Set(logs.map(l => l.action).filter(Boolean))].sort(), [logs]);
  const entities = useMemo(() => [...new Set(logs.map(l => l.entityName).filter(Boolean))].sort(), [logs]);
  const branches = useMemo(() => [...new Set(logs.map(l => l.branch).filter(Boolean))].sort(), [logs]);
  const users = useMemo(() => [...new Set(logs.map(l => l.performedBy).filter(Boolean))].sort(), [logs]);

  // Apply filters
  const filtered = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = !search || 
        log.performedBy?.toLowerCase().includes(search.toLowerCase()) ||
        log.entityLabel?.toLowerCase().includes(search.toLowerCase()) ||
        log.entityName?.toLowerCase().includes(search.toLowerCase()) ||
        log.action?.toLowerCase().includes(search.toLowerCase());
      
      const matchAction = filterAction === 'all' || log.action === filterAction;
      const matchEntity = filterEntity === 'all' || log.entityName === filterEntity;
      const matchBranch = filterBranch === 'all' || log.branch === filterBranch;
      const matchUser = filterUser === 'all' || log.performedBy === filterUser;
      
      let matchDate = true;
      if (dateFrom) {
        matchDate = matchDate && new Date(log.performedAt) >= new Date(dateFrom);
      }
      if (dateTo) {
        matchDate = matchDate && new Date(log.performedAt) <= new Date(dateTo + 'T23:59:59');
      }
      
      return matchSearch && matchAction && matchEntity && matchBranch && matchUser && matchDate;
    });
  }, [logs, search, filterAction, filterEntity, filterBranch, filterUser, dateFrom, dateTo]);

  // Action color coding
  const actionColor = (action) => {
    if (action === 'create') return 'text-green-700 bg-green-50';
    if (action === 'update') return 'text-blue-700 bg-blue-50';
    if (action === 'delete') return 'text-red-700 bg-red-50';
    if (action === 'view') return 'text-gray-700 bg-gray-50';
    if (action === 'export') return 'text-purple-700 bg-purple-50';
    return 'text-gray-700 bg-gray-50';
  };

  const handleExportCSV = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity', 'Branch', 'IP Address', 'Reason'],
      ...filtered.map(log => [
        new Date(log.performedAt).toLocaleString('en-US', { timeZone: 'America/Chicago' }),
        log.performedBy || '',
        log.action || '',
        log.entityName || '',
        log.entityLabel || '',
        log.branch || '',
        log.ipAddress || '',
        log.reason || '',
      ]),
    ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-6xl mx-auto">
          <button onClick={() => navigate('/lupine')} className="p-2 rounded-lg hover:bg-indigo-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold">Audit Log Dashboard</div>
            <div className="text-indigo-300 text-xs">{logs.length} total events | {filtered.length} shown</div>
          </div>
          <button onClick={load} disabled={loading} className="p-2 rounded-lg hover:bg-indigo-800 text-indigo-200">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Button onClick={handleExportCSV} disabled={filtered.length === 0} className="gap-2 bg-white text-indigo-900 hover:bg-indigo-50">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Search & Date Range */}
        <div className="bg-white rounded-lg border shadow-sm p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by user, action, entity..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">From Date</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">To Date</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border shadow-sm p-4 space-y-3">
          <div className="text-xs font-medium text-gray-600">Filters</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Action</label>
              <select
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
                className="w-full h-9 border border-input rounded-md px-3 text-sm bg-white"
              >
                <option value="all">All Actions</option>
                {actions.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Entity Type</label>
              <select
                value={filterEntity}
                onChange={e => setFilterEntity(e.target.value)}
                className="w-full h-9 border border-input rounded-md px-3 text-sm bg-white"
              >
                <option value="all">All Entities</option>
                {entities.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Branch</label>
              <select
                value={filterBranch}
                onChange={e => setFilterBranch(e.target.value)}
                className="w-full h-9 border border-input rounded-md px-3 text-sm bg-white"
              >
                <option value="all">All Branches</option>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">User</label>
              <select
                value={filterUser}
                onChange={e => setFilterUser(e.target.value)}
                className="w-full h-9 border border-input rounded-md px-3 text-sm bg-white"
              >
                <option value="all">All Users</option>
                {users.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setFilterAction('all');
                setFilterEntity('all');
                setFilterBranch('all');
                setFilterUser('all');
                setDateFrom('');
                setDateTo('');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-16 text-sm bg-white rounded-lg border">
            No audit log entries found
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Timestamp</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">User</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Action</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Entity Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Entity Affected</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Branch</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                      {new Date(log.performedAt).toLocaleString('en-US', {
                        timeZone: 'America/Chicago',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-900 font-medium text-xs">{log.performedBy}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${actionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{log.entityName}</td>
                    <td className="px-4 py-3 text-gray-900 text-xs">{log.entityLabel || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{log.branch || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}