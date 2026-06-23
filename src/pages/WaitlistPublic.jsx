// src/pages/WaitlistPublic.jsx
// No-auth admin dashboard: list pending waitlist entries, approve / deny,
// resend magic link. Calls the same /api/waitlist-manager backend
// (POST-only, action in body) that /waitlist-manager uses.

import { useEffect, useState, useCallback } from 'react';

const STATUS_FILTERS = ['pending', 'approved', 'denied', 'all'];

export default function WaitlistPublic() {
  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, kind = 'info') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 4000);
  };

  const postAction = async (body) => {
    const res = await fetch('/api/waitlist-manager', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await postAction({ action: 'list' });
      const all = Array.isArray(json.entries) ? json.entries : [];
      setEntries(status === 'all' ? all : all.filter((e) => e.status === status));
    } catch (e) {
      setError(e.message || 'Failed to load entries');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const act = async (id, action, extra = {}) => {
    setBusyId(id);
    try {
      const json = await postAction({ action, entryId: id, ...extra });
      showToast(json.message || `${action} ok`, 'success');
      await load();
    } catch (e) {
      showToast(e.message || `${action} failed`, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const deny = (id) => {
    const reason = window.prompt('Reason for denial (optional):') || '';
    act(id, 'deny', { reason });
  };

  return (
    <div style={{ maxWidth: 1100, margin: '32px auto', padding: '0 16px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: 4 }}>Waitlist (Public Admin)</h1>
      <p style={{ marginTop: 0, color: '#666', fontSize: 14 }}>
        No-auth approve / deny dashboard. Use only on a trusted device.
      </p>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '16px 0' }}>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            style={{
              padding: '6px 12px',
              border: '1px solid #ccc',
              background: status === s ? '#111' : '#fff',
              color: status === s ? '#fff' : '#111',
              borderRadius: 6,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {s}
          </button>
        ))}
        <button onClick={load} style={{ marginLeft: 'auto', padding: '6px 12px' }}>
          Refresh
        </button>
      </div>

      {toast && (
        <div style={{
          padding: 10, marginBottom: 12, borderRadius: 6,
          background: toast.kind === 'error' ? '#fee' : '#efe',
          color: toast.kind === 'error' ? '#900' : '#060',
          border: `1px solid ${toast.kind === 'error' ? '#fbb' : '#bdb'}`,
        }}>{toast.msg}</div>
      )}

      {error && (
        <div style={{ padding: 10, marginBottom: 12, background: '#fee', color: '#900', borderRadius: 6 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : entries.length === 0 ? (
        <p style={{ color: '#666' }}>No entries.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
              <th style={{ padding: 8 }}>Submitted</th>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Email</th>
              <th style={{ padding: 8 }}>Company</th>
              <th style={{ padding: 8 }}>Phone</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 8, whiteSpace: 'nowrap' }}>
                  {e.created_at ? new Date(e.created_at).toLocaleString() : '—'}
                </td>
                <td style={{ padding: 8 }}>{e.full_name || e.name || '—'}</td>
                <td style={{ padding: 8 }}>{e.email}</td>
                <td style={{ padding: 8 }}>{e.company_name || e.company || '—'}</td>
                <td style={{ padding: 8 }}>{e.phone || '—'}</td>
                <td style={{ padding: 8 }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 10, fontSize: 12,
                    background:
                      e.status === 'approved' ? '#dfd' :
                      e.status === 'denied'   ? '#fdd' : '#ffd',
                  }}>{e.status}</span>
                </td>
                <td style={{ padding: 8, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {e.status === 'pending' && (
                    <>
                      <button
                        disabled={busyId === e.id}
                        onClick={() => act(e.id, 'approve')}
                        style={{ marginRight: 6, padding: '4px 10px', background: '#060', color: '#fff', border: 0, borderRadius: 4, cursor: 'pointer' }}
                      >
                        Approve
                      </button>
                      <button
                        disabled={busyId === e.id}
                        onClick={() => deny(e.id)}
                        style={{ marginRight: 6, padding: '4px 10px', background: '#900', color: '#fff', border: 0, borderRadius: 4, cursor: 'pointer' }}
                      >
                        Deny
                      </button>
                    </>
                  )}
                  {e.status === 'approved' && (
                    <button
                      disabled={busyId === e.id}
                      onClick={() => act(e.id, 'approve')}
                      title="Re-runs approve, which regenerates and re-sends the magic link"
                      style={{ padding: '4px 10px', background: '#06c', color: '#fff', border: 0, borderRadius: 4, cursor: 'pointer' }}
                    >
                      Resend Magic Link
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
