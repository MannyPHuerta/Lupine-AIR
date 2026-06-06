import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

export default function VarianceTrendChart({ drawers }) {
  const data = useMemo(() => {
    // Last 30 closed/reconciled drawers with a date, sorted oldest → newest
    return drawers
      .filter(d => d.status !== 'open' && d.shiftDate)
      .sort((a, b) => a.shiftDate.localeCompare(b.shiftDate))
      .slice(-30)
      .map(d => ({
        label: `${d.shiftDate.slice(5)} ${d.shiftLabel?.slice(0, 3) || ''}`.trim(),
        variance: d.variance ?? 0,
        branch: d.branch,
        closedBy: d.closedBy || d.openedBy || '?',
      }));
  }, [drawers]);

  if (data.length === 0) return null;

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl space-y-0.5">
        <div className="font-semibold">{d.label}</div>
        <div className="text-gray-300">{d.branch}</div>
        <div className="text-gray-300">Closed by: {d.closedBy}</div>
        <div className={d.variance < 0 ? 'text-red-400 font-bold' : d.variance > 0 ? 'text-blue-400 font-bold' : 'text-green-400'}>
          Variance: {d.variance >= 0 ? '+' : ''}${d.variance.toFixed(2)}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-semibold text-gray-900">Variance Trend</div>
          <div className="text-xs text-gray-400">Last {data.length} closed drawers</div>
        </div>
        <div className="flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> Short</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" /> Over</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-400 inline-block" /> Balanced</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
          <Bar dataKey="variance" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.variance < 0 ? '#f87171' : d.variance > 0 ? '#60a5fa' : '#4ade80'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}