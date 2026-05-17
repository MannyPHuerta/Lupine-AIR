import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Download, RefreshCw, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function ChangeDetail({ changes }) {
  if (!changes || Object.keys(changes).length === 0) return <span className="text-gray-400 italic">no details</span>;
  return (
    <div className="space-y-1 mt-1">
      {Object.entries(changes).map(([field, val]) => {
        const before = val?.before;
        const after = val?.after;
        const hasDiff = before !== undefined || after !== undefined;
        return (
          <div key={field} className="flex items-start gap-2 text-xs">
            <span className="font-mono text-gray-500 shrink-0">{field}:</span>
            {hasDiff ? (
              <span className="flex items-center gap-1 flex-wrap">
                {before !== undefined && <span className="line-through text-red-600 bg-red-50 px-1 rounded">{JSON.stringify(before)}</span>}
                {after !== undefined && <span className="text-green-700 bg-green-50 px-1 rounded">{JSON.stringify(after)}</span>}
              </span>
            ) : (
              <span className="text-gray-700">{JSON.stringify(val)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AuditRow({ log, actionColor }) {
  const [expanded, setExpanded] = useState(false);
  const hasChanges = log.changes && Object.keys(log.changes).length > 0;
  return (
    <>
      <tr
        className={`hover:bg-gray-50 transition ${hasChanges ? 'cursor-pointer' : ''}`}
        onClick={() => hasChanges && setExpanded(v => !v)}
      >
        <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
          {new Date(log.performedAt).toLocaleString('en-US', {
            timeZone: 'America/Chicago',
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
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
        <td className="px-4 py-3 text-gray-400 text-xs">
          {log.reason && <span className="italic text-gray-500">{log.reason}</span>}
        </td>
        <td className="px-4 py-3 w-8">
          {hasChanges && (
            expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </td>
      </tr>
      {expanded && hasChanges && (
        <tr className="bg-gray-50 border-b">
          <td colSpan={8} className="px-6 py-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Changes</div>
            <ChangeDetail changes={log.changes} />
          </td>
        </tr>
      )}
    </>
  );
}

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
  const [showFinancialOnly, setShowFinancialOnly] = useState(false);

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

  // Financial audit keywords
  const financialKeywords = ['baseAmount', 'taxAmount', 'deposit', 'amountPaid', 'discount', 'deliveryFee', 'returnFee', 'refund', 'payment'];
  const isFinancialAudit = (log) => {
    if (!log.changes) return false;
    const changeFields = Object.keys(log.changes).map(f => f.toLowerCase());
    return financialKeywords.some(k => changeFields.some(f => f.includes(k.toLowerCase())));
  };

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
      
      const matchFinancial = showFinancialOnly ? isFinancialAudit(log) : true;
      
      return matchSearch && matchAction && matchEntity && matchBranch && matchUser && matchDate && matchFinancial;
    });
  }, [logs, search, filterAction, filterEntity, filterBranch, filterUser, dateFrom, dateTo, showFinancialOnly]);

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

          <div className="flex gap-2 flex-wrap">
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
                setShowFinancialOnly(false);
              }}
            >
              Clear Filters
            </Button>
            <Button
              variant={showFinancialOnly ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setShowFinancialOnly(!showFinancialOnly)}
              className={showFinancialOnly ? 'bg-red-600 text-white hover:bg-red-700' : ''}
            >
              💰 Financial Audit Only
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        {!loading && filtered.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Creates', action: 'create', color: 'text-green-700 bg-green-50 border-green-200' },
                { label: 'Updates', action: 'update', color: 'text-blue-700 bg-blue-50 border-blue-200' },
                { label: 'Deletes', action: 'delete', color: 'text-red-700 bg-red-50 border-red-200' },
                { label: 'Other', action: null, color: 'text-gray-700 bg-gray-50 border-gray-200' },
              ].map(({ label, action, color }) => {
                const count = action
                  ? filtered.filter(l => l.action === action).length
                  : filtered.filter(l => !['create', 'update', 'delete'].includes(l.action)).length;
                return (
                  <div key={label} className={`rounded-lg border px-4 py-3 ${color}`}>
                    <div className="text-xl font-bold">{count}</div>
                    <div className="text-xs font-medium">{label}</div>
                  </div>
                );
              })}
            </div>
            {showFinancialOnly && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800 font-semibold text-sm mb-2">
                  <span>💰 Financial Audit Filter Active</span>
                </div>
                <div className="text-xs text-red-700">
                  Showing only audits with financial changes: amounts, discounts, taxes, deposits, fees, and payments.
                  <br />
                  Total: <strong>{filtered.length}</strong> financial events
                </div>
              </div>
            )}
          </>
        )}

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
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs">Timestamp</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs">User</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs">Action</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs">Entity Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs">Entity Affected</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs">Branch</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs">Reason</th>
                  <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(log => (
                  <AuditRow key={log.id} log={log} actionColor={actionColor} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}