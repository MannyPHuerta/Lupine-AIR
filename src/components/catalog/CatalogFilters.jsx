import { CheckCircle2, Trash2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'needs_review', label: 'Needs Review' },
  { key: 'reviewed', label: 'Approved' },
  { key: 'junk', label: 'Junk' },
];

export default function CatalogFilters({
  filter, setFilter, search, setSearch,
  selected, onApproveSelected, onJunkSelected, saving
}) {
  const hasSelection = selected.size > 0;

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
      {/* Tab filters */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === t.key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search + bulk actions */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Search descriptions, serial numbers, location…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        {hasSelection && (
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-500">{selected.size} selected</span>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 gap-1"
              onClick={onApproveSelected}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50 gap-1"
              onClick={onJunkSelected}
              disabled={saving}
            >
              <Trash2 className="w-3 h-3" />
              Mark Junk
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}