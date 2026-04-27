import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Trash2, AlertTriangle, CheckCircle, ChevronDown } from 'lucide-react';

function calcRate(eq, days) {
  if (!eq) return 0;
  if (days >= 30 && eq.monthlyRate) return eq.monthlyRate / 30;
  if (days >= 7 && eq.weeklyRate) return eq.weeklyRate / 7;
  return eq.dailyRate || 0;
}

export default function EquipmentLineItem({ line, equipment, rentals, dateRange, onUpdate, onRemove }) {
  const [search, setSearch] = useState(line.equipmentName || '');
  const [open, setOpen] = useState(!line.equipmentId);
  const inputRef = useRef(null);

  const days = dateRange.start && dateRange.end
    ? Math.floor((new Date(dateRange.end) - new Date(dateRange.start)) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  const filtered = search.trim()
    ? equipment.filter(e => e.name.toUpperCase().startsWith(search.toUpperCase()))
    : equipment;

  const handleSelect = (eq) => {
    const rate = calcRate(eq, days);
    const baseAmount = Math.round(rate * days * line.quantity * 100) / 100;
    onUpdate({ ...line, equipmentId: eq.id, equipmentName: eq.name, rate, baseAmount, taxable: eq.taxable, deposit: eq.depositRequired || 0 });
    setSearch(eq.name);
    setOpen(false);
  };

  const handleQtyChange = (qty) => {
    const q = Math.max(1, parseInt(qty) || 1);
    const eq = equipment.find(e => e.id === line.equipmentId);
    const rate = calcRate(eq, days);
    const baseAmount = Math.round(rate * days * q * 100) / 100;
    onUpdate({ ...line, quantity: q, rate, baseAmount });
  };

  // Availability check
  const conflicts = line.equipmentId && dateRange.start && dateRange.end
    ? rentals.filter(r => {
        if (r.equipmentId !== line.equipmentId) return false;
        if (['cancelled', 'completed'].includes(r.status)) return false;
        const rStart = new Date(r.startDate);
        const rEnd = new Date(r.endDate);
        const s = new Date(dateRange.start);
        const e = new Date(dateRange.end);
        return !(e < rStart || s > rEnd);
      })
    : [];

  const available = line.equipmentId && dateRange.start && dateRange.end && conflicts.length === 0;

  const selectedEq = equipment.find(e => e.id === line.equipmentId);
  const taxAmount = line.taxable ? Math.round(line.baseAmount * 0.0825 * 100) / 100 : 0;
  const lineTotal = line.baseAmount + taxAmount + (line.deposit || 0);

  return (
    <div className="border rounded-lg p-4 bg-white space-y-3">
      <div className="flex items-start gap-3">
        {/* Equipment Search */}
        <div className="flex-1 relative">
          <div
            className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer bg-white hover:border-indigo-400 transition"
            onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
          >
            {line.equipmentId ? (
              <span className="text-sm font-medium text-gray-900 flex-1">{line.equipmentName}</span>
            ) : (
              <span className="text-sm text-gray-400 flex-1">Search equipment...</span>
            )}
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </div>

          {open && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl">
              <div className="p-2 border-b">
                <Input
                  ref={inputRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Type to filter..."
                  className="text-sm"
                  onKeyDown={e => e.key === 'Escape' && setOpen(false)}
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filtered.slice(0, 30).map(eq => (
                  <button
                    key={eq.id}
                    onClick={() => handleSelect(eq)}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 transition"
                  >
                    <div className="font-medium text-gray-900">{eq.name}</div>
                    <div className="text-xs text-gray-500">{eq.category} · ${eq.dailyRate}/day</div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-500">No matches</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Qty */}
        <div className="w-20">
          <Input
            type="number"
            min="1"
            value={line.quantity}
            onChange={e => handleQtyChange(e.target.value)}
            className="text-center text-sm"
          />
        </div>

        {/* Remove */}
        <button onClick={onRemove} className="text-gray-400 hover:text-red-600 p-2 flex-shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Availability & pricing row */}
      {line.equipmentId && (
        <div className="flex items-center justify-between text-xs gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            {!dateRange.start || !dateRange.end ? (
              <span className="text-gray-400">Set dates to check availability</span>
            ) : available ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                <span className="text-green-700 font-medium">Available · {days} day{days !== 1 ? 's' : ''}</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-red-700 font-medium">{conflicts.length} conflict(s)</span>
                <span className="text-red-600">
                  ({conflicts.map(c => `${c.customerName} ${c.startDate}–${c.endDate}`).join(', ')})
                </span>
              </>
            )}
          </div>
          {line.baseAmount > 0 && (
            <div className="flex items-center gap-3 text-gray-600 ml-auto">
              <span>Rental: <strong>${line.baseAmount.toFixed(2)}</strong></span>
              {line.taxable && <span>Tax: <strong>${taxAmount.toFixed(2)}</strong></span>}
              {line.deposit > 0 && <span>Deposit: <strong>${line.deposit.toFixed(2)}</strong></span>}
              <span className="text-gray-900 font-bold">Line: ${lineTotal.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}