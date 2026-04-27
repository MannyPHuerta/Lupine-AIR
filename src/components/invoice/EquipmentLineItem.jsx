import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Trash2, AlertTriangle, CheckCircle } from 'lucide-react';

function calcRate(eq, days) {
  if (!eq) return 0;
  if (days >= 30 && eq.monthlyRate) return eq.monthlyRate / 30;
  if (days >= 7 && eq.weeklyRate) return eq.weeklyRate / 7;
  return eq.dailyRate || 0;
}

export default function EquipmentLineItem({ line, equipment, rentals, dateRange, onUpdate, onRemove, qtyRef }) {
  const [search, setSearch] = useState(line.equipmentName || '');
  const [open, setOpen] = useState(!line.equipmentId);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const days = dateRange.start && dateRange.end
    ? Math.floor((new Date(dateRange.end) - new Date(dateRange.start)) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  const filtered = search.trim()
    ? equipment.filter(e => e.name.toUpperCase().includes(search.toUpperCase()))
    : equipment;

  // Auto-open and focus when new line (no equipment yet)
  useEffect(() => {
    if (!line.equipmentId) {
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [search]);

  const scrollToHighlight = (idx) => {
    const el = listRef.current?.children[idx];
    el?.scrollIntoView({ block: 'nearest' });
  };

  const handleSelect = (eq) => {
    const rate = calcRate(eq, days);
    const baseAmount = Math.round(rate * days * line.quantity * 100) / 100;
    onUpdate({ ...line, equipmentId: eq.id, equipmentName: eq.name, rate, baseAmount, taxable: eq.taxable, deposit: eq.depositRequired || 0 });
    setSearch(eq.name);
    setOpen(false);
    // Focus qty after selection
    setTimeout(() => qtyRef?.current?.focus(), 50);
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    const max = Math.min(filtered.length, 30) - 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(highlight + 1, max);
      setHighlight(next);
      scrollToHighlight(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.max(highlight - 1, 0);
      setHighlight(next);
      scrollToHighlight(next);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) handleSelect(filtered[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleQtyChange = (qty) => {
    const q = Math.max(1, parseInt(qty) || 1);
    const eq = equipment.find(e => e.id === line.equipmentId);
    const rate = calcRate(eq, days);
    const baseAmount = Math.round(rate * days * q * 100) / 100;
    onUpdate({ ...line, quantity: q, rate, baseAmount });
  };

  // Availability check — compare as plain date strings (YYYY-MM-DD) to avoid timezone shifts
  const conflicts = line.equipmentId && dateRange.start && dateRange.end
    ? rentals.filter(r => {
        if (r.equipmentId !== line.equipmentId) return false;
        if (['cancelled', 'completed'].includes(r.status)) return false;
        // overlap: not (requested end < rental start OR requested start > rental end)
        return !(dateRange.end < r.startDate || dateRange.start > r.endDate);
      })
    : [];

  const available = line.equipmentId && dateRange.start && dateRange.end && conflicts.length === 0;
  const taxAmount = line.taxable ? Math.round(line.baseAmount * 0.0825 * 100) / 100 : 0;
  const lineTotal = line.baseAmount + taxAmount + (line.deposit || 0);

  return (
    <div className="border rounded-lg p-4 bg-white space-y-3">
      <div className="flex items-start gap-3">
        {/* Unified search input — single field, always visible */}
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={open ? search : line.equipmentName}
            placeholder="Search equipment..."
            className="text-sm"
            onFocus={() => { setOpen(true); if (!line.equipmentId) setSearch(''); }}
            onChange={e => { setSearch(e.target.value); setOpen(true); }}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            readOnly={!open && !!line.equipmentId}
          />

          {open && (
            <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl">
              <div ref={listRef} className="max-h-52 overflow-y-auto">
                {filtered.slice(0, 30).map((eq, idx) => (
                  <button
                    key={eq.id}
                    onMouseDown={() => handleSelect(eq)}
                    className={`w-full text-left px-4 py-2 text-sm transition ${idx === highlight ? 'bg-indigo-100' : 'hover:bg-indigo-50'}`}
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
            ref={qtyRef}
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