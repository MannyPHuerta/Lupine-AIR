import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Trash2, Clock, Package } from 'lucide-react';

export default function CatalogStats({ onFilterClick }) {
  const [counts, setCounts] = useState({ total: 0, approved: 0, junk: 0, needsReview: 0, empty: 0 });

  useEffect(() => {
    base44.entities.InventoryItem.list('-created_date', 2000).then(all => {
      let approved = 0, junk = 0, needsReview = 0, empty = 0;
      all.forEach(item => {
        const hasContent = item.description1 || item.description2 || item.serialNumber;
        if (!hasContent) { empty++; return; }
        if (item.reviewStatus === 'approved') approved++;
        else if (item.reviewStatus === 'junk') junk++;
        else needsReview++;
      });
      setCounts({ total: all.length, approved, junk, needsReview, empty });
    });
  }, []);

  const pct = (n) => counts.total ? Math.round((n / counts.total) * 100) : 0;

  const cards = [
    { label: 'Total Records', value: counts.total, icon: Package, color: 'blue', filter: 'all' },
    { label: 'Approved', value: counts.approved, icon: CheckCircle2, color: 'green', filter: 'reviewed' },
    { label: 'Needs Review', value: counts.needsReview, icon: Clock, color: 'yellow', filter: 'needs_review' },
    { label: 'Junk / Empty', value: counts.junk + counts.empty, icon: Trash2, color: 'red', filter: 'junk' },
  ];

  const colorMap = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  };
  const barColorMap = { blue: 'bg-blue-500', green: 'bg-green-500', yellow: 'bg-yellow-500', red: 'bg-red-500' };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(({ label, value, icon: Icon, color, filter }) => (
        <button
          key={label}
          onClick={() => onFilterClick(filter)}
          className={`rounded-xl border p-4 text-left transition-all hover:shadow-md ${colorMap[color]}`}
        >
          <div className="flex items-center justify-between mb-2">
            <Icon className="w-5 h-5 opacity-70" />
            <span className="text-xs font-medium opacity-60">{pct(value)}%</span>
          </div>
          <div className="text-2xl font-bold">{value.toLocaleString()}</div>
          <div className="text-xs font-medium mt-0.5 opacity-75">{label}</div>
          <div className={`mt-2 h-1 rounded-full opacity-30 w-full bg-current`}>
            <div className={`h-1 rounded-full ${barColorMap[color]}`} style={{ width: `${pct(value)}%` }} />
          </div>
        </button>
      ))}
    </div>
  );
}