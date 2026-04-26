import { CheckCircle2, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const statusBadge = (item) => {
  if (item.reviewStatus === 'approved') return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">✅ Approved</Badge>;
  if (item.reviewStatus === 'junk') return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">🗑 Junk</Badge>;
  const hasContent = item.description1 || item.description2 || item.serialNumber;
  if (!hasContent) return <Badge className="bg-gray-100 text-gray-500 border-gray-200 text-xs">Empty</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">⏳ Needs Review</Badge>;
};

export default function CatalogTable({ items, selected, onToggleSelect, onToggleSelectAll, onEdit, onApprove, onJunk }) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-12 text-center text-gray-400">
        No records match the current filter.
      </div>
    );
  }

  const allSelected = selected.size === items.length;

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-3 text-left w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="rounded"
                />
              </th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700 w-8">#</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Description 1</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Description 2</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Serial / Model</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Location</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Clean Name</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Status</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700 w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, idx) => {
              const isSelected = selected.has(item.id);
              const isJunk = item.reviewStatus === 'junk';
              const isEmpty = !item.description1 && !item.description2 && !item.serialNumber;
              return (
                <tr
                  key={item.id}
                  className={`transition-colors ${
                    isSelected ? 'bg-indigo-50' :
                    isJunk || isEmpty ? 'bg-red-50/40 text-gray-400' :
                    item.reviewStatus === 'approved' ? 'bg-green-50/30' :
                    'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(item.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-3 py-2 text-gray-400 text-xs font-mono">{item.recordIndex ?? '—'}</td>
                  <td className="px-3 py-2 max-w-xs">
                    <div className="truncate font-medium text-gray-900">{item.description1 || <span className="text-gray-300 italic">empty</span>}</div>
                  </td>
                  <td className="px-3 py-2 max-w-xs">
                    <div className="truncate text-gray-600">{item.description2 || '—'}</div>
                  </td>
                  <td className="px-3 py-2 max-w-xs">
                    <div className="truncate text-gray-500 text-xs font-mono">{item.serialNumber || '—'}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{item.location || '—'}</td>
                  <td className="px-3 py-2">
                    {item.cleanName
                      ? <span className="text-indigo-700 font-medium text-xs">{item.cleanName}</span>
                      : <span className="text-gray-300 text-xs italic">not set</span>
                    }
                  </td>
                  <td className="px-3 py-2">{statusBadge(item)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(item)} title="Edit & Approve">
                        <Pencil className="w-3.5 h-3.5 text-indigo-500" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onApprove(item)} title="Quick Approve">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onJunk(item)} title="Mark Junk">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}