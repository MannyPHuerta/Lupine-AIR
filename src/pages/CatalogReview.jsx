import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import CatalogStats from '@/components/catalog/CatalogStats';
import CatalogFilters from '@/components/catalog/CatalogFilters';
import CatalogTable from '@/components/catalog/CatalogTable';
import CatalogEditModal from '@/components/catalog/CatalogEditModal';

const PAGE_SIZE = 100;

export default function CatalogReview() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('all'); // all | reviewed | junk | needs_review
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const query = {};
      if (filter === 'reviewed') query.reviewStatus = 'approved';
      else if (filter === 'junk') query.reviewStatus = 'junk';
      else if (filter === 'needs_review') query.reviewStatus = { $exists: false };

      const all = await base44.entities.InventoryItem.list('-created_date', 2000);

      // Client-side filtering since we need complex logic
      let filtered = all.filter(item => {
        const d1 = item.description1 || '';
        const d2 = item.description2 || '';
        const sn = item.serialNumber || '';
        const hasContent = d1 || d2 || sn;
        if (!hasContent) return filter === 'junk' || filter === 'all';

        if (filter === 'reviewed') return item.reviewStatus === 'approved';
        if (filter === 'junk') return item.reviewStatus === 'junk' || !hasContent;
        if (filter === 'needs_review') return !item.reviewStatus && hasContent;
        return true;
      });

      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(item =>
          (item.description1 || '').toLowerCase().includes(q) ||
          (item.description2 || '').toLowerCase().includes(q) ||
          (item.serialNumber || '').toLowerCase().includes(q) ||
          (item.location || '').toLowerCase().includes(q)
        );
      }

      setTotal(filtered.length);
      setItems(filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE));
    } finally {
      setLoading(false);
    }
  }, [filter, search, page]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setPage(0); setSelected(new Set()); }, [filter, search]);

  const markItems = async (ids, status) => {
    setSaving(true);
    await Promise.all(ids.map(id => base44.entities.InventoryItem.update(id, { reviewStatus: status })));
    setSelected(new Set());
    await fetchItems();
    setSaving(false);
  };

  const handleSaveEdit = async (updated) => {
    await base44.entities.InventoryItem.update(updated.id, {
      description1: updated.description1,
      description2: updated.description2,
      serialNumber: updated.serialNumber,
      location: updated.location,
      branchCode: updated.branchCode,
      disposition: updated.disposition,
      reviewStatus: 'approved',
      cleanName: updated.cleanName,
      category: updated.category,
    });
    setEditingItem(null);
    await fetchItems();
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map(i => i.id)));
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="px-4 py-3 flex items-center gap-3 max-w-7xl mx-auto">
          <button onClick={() => navigate('/lupine')} className="text-white p-2 rounded-lg hover:bg-indigo-800 flex items-center gap-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-lg font-bold tracking-tight">Equipment Catalog Review</div>
            <div className="text-indigo-300 text-xs">Phase 0 — Migration Data Cleaning</div>
          </div>
          {saving && (
            <div className="ml-auto flex items-center gap-2 text-indigo-200 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Saving…
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <CatalogStats onFilterClick={setFilter} />

        <CatalogFilters
          filter={filter}
          setFilter={setFilter}
          search={search}
          setSearch={setSearch}
          selected={selected}
          onApproveSelected={() => markItems([...selected], 'approved')}
          onJunkSelected={() => markItems([...selected], 'junk')}
          saving={saving}
        />

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <>
            <CatalogTable
              items={items}
              selected={selected}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onEdit={setEditingItem}
              onApprove={(item) => markItems([item.id], 'approved')}
              onJunk={(item) => markItems([item.id], 'junk')}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm text-gray-600 bg-white rounded-lg border px-4 py-3">
                <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1 rounded border bg-white hover:bg-gray-50 disabled:opacity-40"
                  >← Prev</button>
                  <span className="px-3 py-1 text-gray-500">Page {page + 1} of {totalPages}</span>
                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1 rounded border bg-white hover:bg-gray-50 disabled:opacity-40"
                  >Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {editingItem && (
        <CatalogEditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}