/**
 * Displays the operational status of an equipment unit as a colored badge.
 */

export const STATUS_CONFIG = {
  available:        { label: 'Available',        color: 'bg-green-100 text-green-800 border-green-200',   dot: 'bg-green-500' },
  reserved:         { label: 'Reserved',          color: 'bg-blue-100 text-blue-800 border-blue-200',     dot: 'bg-blue-500' },
  out_on_rental:    { label: 'Out on Rental',     color: 'bg-indigo-100 text-indigo-800 border-indigo-200', dot: 'bg-indigo-500' },
  in_shop:          { label: 'In Shop',           color: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500' },
  awaiting_parts:   { label: 'Awaiting Parts',    color: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500' },
  in_laundry:       { label: 'In Laundry',        color: 'bg-cyan-100 text-cyan-800 border-cyan-200',     dot: 'bg-cyan-500' },
  under_inspection: { label: 'Under Inspection',  color: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-500' },
  retired:          { label: 'Retired',            color: 'bg-gray-100 text-gray-500 border-gray-200',    dot: 'bg-gray-400' },
};

export default function UnitStatusBadge({ status, note }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.available;
  return (
    <span className={`inline-flex items-center gap-1.5 border rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
      {note && <span className="opacity-70 ml-0.5">· {note}</span>}
    </span>
  );
}