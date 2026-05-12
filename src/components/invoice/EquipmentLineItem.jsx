/**
 * ⚠️ CRITICAL INVOICE COMPONENT
 * DO NOT MODIFY WITHOUT DISCUSSION
 * 
 * This component manages individual rental line items including:
 * - Equipment selection and quantity
 * - Date range selection with availability checking
 * - Rate calculations and tax handling
 * - AI-powered bundle suggestions
 * 
 * Before editing: discuss with the team first.
 */

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Trash2, AlertTriangle, CheckCircle, WrenchIcon, Loader2, Sparkles } from 'lucide-react';
import UnitStatusBadge from '@/components/equipment/UnitStatusBadge';
import { useAIEquipmentSearch } from '@/hooks/useAIEquipmentSearch';

const UNAVAILABLE_STATUSES = ['in_shop', 'awaiting_parts', 'in_laundry', 'under_inspection', 'retired'];
import { format, parseISO } from 'date-fns';
import AISuggestions from './AISuggestions';

function calcRate(eq, days) {
  if (!eq) return 0;
  if (days >= 30 && eq.monthlyRate) return eq.monthlyRate / 30;
  if (days >= 7 && eq.weeklyRate) return eq.weeklyRate / 7;
  return eq.dailyRate || 0;
}

function calcDays(start, end) {
  if (!start || !end) return 0;
  return Math.floor((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
}

function LineDateInput({ label, value, onChange, nextFocusRef, triggerRef: externalTriggerRef }) {
  const [open, setOpen] = useState(false);
  const internalRef = useRef(null);
  const triggerRef = externalTriggerRef || internalRef;
  const parsed = value ? parseISO(value) : null;

  const handleSelect = (date) => {
    onChange(date ? format(date, 'yyyy-MM-dd') : '');
    setOpen(false);
    // Focus next field after selection
    setTimeout(() => {
      if (nextFocusRef?.current) {
        nextFocusRef.current.focus();
      }
    }, 50);
  };

  const handleTriggerKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            onKeyDown={handleTriggerKeyDown}
            className="h-7 rounded border border-input bg-transparent px-2 text-xs shadow-sm cursor-pointer outline-none focus:ring-1 focus:ring-indigo-400 w-36 text-left"
          >
            {parsed ? format(parsed, 'MM/dd/yyyy') : <span className="text-gray-400">Pick a date</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
          sideOffset={4}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              setOpen(false);
              triggerRef.current?.focus();
            }
            // Enter on a focused day cell selects it — react-day-picker handles this natively,
            // but we intercept to also close and advance focus
            if (e.key === 'Enter') {
              // Let react-day-picker handle the selection first, then close
              setTimeout(() => {
                // If a day was selected the onSelect callback fires synchronously,
                // so the popover will already be closing. This is a safety fallback.
                setOpen(false);
                if (nextFocusRef?.current) nextFocusRef.current.focus();
              }, 50);
            }
          }}
        >
          <Calendar
            mode="single"
            selected={parsed || undefined}
            onSelect={handleSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function EquipmentLineItem({ line, equipment, rentals, onUpdate, onRemove, qtyRef, onAddLine }) {
  const [search, setSearch] = useState(line.equipmentName || '');
  const [open, setOpen] = useState(!line.equipmentId);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const toTriggerRef = useRef(null);  // "To" date button — From calendar advances here
  const afterToRef = qtyRef;          // after "To" calendar, advance to qty
  const aiSearchTimer = useRef(null);
  const { aiSuggestions, isSearching, triggerAISearch, clearAISuggestions } = useAIEquipmentSearch(equipment);

  const startDate = line.startDate || '';
  const endDate = line.endDate || '';
  const days = calcDays(startDate, endDate);

  const filtered = search.trim()
    ? equipment.filter(e => e.name.toUpperCase().includes(search.toUpperCase()))
    : equipment;

  // Trigger AI search when local results are empty and user has typed ≥3 chars
  useEffect(() => {
    clearTimeout(aiSearchTimer.current);
    if (open && search.trim().length >= 3 && filtered.length === 0) {
      aiSearchTimer.current = setTimeout(() => triggerAISearch(search.trim()), 600);
    } else {
      clearAISuggestions();
    }
    return () => clearTimeout(aiSearchTimer.current);
  }, [search, filtered.length, open]);

  // Auto-open and focus when new line
  useEffect(() => {
    if (!line.equipmentId) {
      setOpen(true);
      // Use a slightly longer delay so the DOM is fully ready before grabbing focus
      setTimeout(() => {
        inputRef.current?.focus();
        setOpen(true);
      }, 80);
    }
  }, []);

  useEffect(() => { setHighlight(0); }, [search]);

  const scrollToHighlight = (idx) => {
    listRef.current?.children[idx]?.scrollIntoView({ block: 'nearest' });
  };

  const recalc = (updatedLine, eq) => {
    const start = updatedLine.startDate || '';
    const end = updatedLine.endDate || '';
    const d = calcDays(start, end);
    const rate = calcRate(eq, d);
    const baseAmount = Math.round(rate * d * (updatedLine.quantity || 1) * 100) / 100;
    return { ...updatedLine, rate, baseAmount };
  };

  const handleSelect = (eq) => {
    const updated = recalc({ ...line, equipmentId: eq.id, equipmentName: eq.name, taxable: eq.taxable, deposit: eq.depositRequired || 0 }, eq);
    onUpdate(updated);
    setSearch(eq.name);
    setOpen(false);
    setTimeout(() => qtyRef?.current?.focus(), 50);
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    const max = Math.min(filtered.length, 30) - 1;
    if (e.key === 'ArrowDown') { e.preventDefault(); const next = Math.min(highlight + 1, max); setHighlight(next); scrollToHighlight(next); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); const next = Math.max(highlight - 1, 0); setHighlight(next); scrollToHighlight(next); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlight]) handleSelect(filtered[highlight]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  const handleQtyChange = (qty) => {
    const q = Math.max(1, parseInt(qty) || 1);
    const eq = equipment.find(e => e.id === line.equipmentId);
    onUpdate(recalc({ ...line, quantity: q }, eq));
  };

  const handleDateChange = (field, value) => {
    const eq = equipment.find(e => e.id === line.equipmentId);
    onUpdate(recalc({ ...line, [field]: value }, eq));
  };

  // Unit status check — is this item physically rentable right now?
  const eqRecord = equipment.find(e => e.id === line.equipmentId);
  const unitStatus = eqRecord?.unitStatus || 'available';
  const unitUnavailable = UNAVAILABLE_STATUSES.includes(unitStatus);

  // Availability check using this line's effective dates
  const conflicts = line.equipmentId && startDate && endDate
    ? rentals.filter(r => {
        if (r.equipmentId !== line.equipmentId) return false;
        if (['cancelled', 'completed'].includes(r.status)) return false;
        return !(endDate < r.startDate || startDate > r.endDate);
      })
    : [];

  const available = line.equipmentId && startDate && endDate && conflicts.length === 0;
  const taxAmount = line.taxable ? Math.round(line.baseAmount * 0.0825 * 100) / 100 : 0;
  const lineTotal = line.baseAmount + taxAmount + (line.deposit || 0);

  return (
    <div className="border rounded-lg p-4 bg-white space-y-3">
      <div className="flex items-start gap-3">
        {/* Equipment search */}
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={open ? search : (line.equipmentName || '')}
            placeholder="Search equipment..."
            className="text-sm"
            onFocus={() => { setOpen(true); setSearch(line.equipmentId ? '' : search); }}
            onChange={e => { setSearch(e.target.value); setOpen(true); }}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            readOnly={false}
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
                {filtered.length === 0 && !isSearching && aiSuggestions.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-400">No matches found</div>
                )}
                {filtered.length === 0 && isSearching && (
                  <div className="px-4 py-3 text-sm text-indigo-500 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Searching by alternate names…</span>
                  </div>
                )}
                {filtered.length === 0 && !isSearching && aiSuggestions.length > 0 && (
                  <>
                    <div className="px-4 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 flex items-center gap-1.5 border-b">
                      <Sparkles className="w-3 h-3" /> Did you mean…
                    </div>
                    {aiSuggestions.map((eq, idx) => (
                      <button
                        key={eq.id}
                        onMouseDown={() => handleSelect(eq)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 transition"
                      >
                        <div className="font-medium text-gray-900">{eq.name}</div>
                        <div className="text-xs text-gray-500">{eq.category} · ${eq.dailyRate}/day</div>
                      </button>
                    ))}
                  </>
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

      {/* Per-line date overrides */}
      <div className="flex items-center gap-3 flex-wrap">
        <LineDateInput
          label="From"
          value={line.startDate || ''}
          onChange={v => handleDateChange('startDate', v)}
          nextFocusRef={toTriggerRef}
        />
        <LineDateInput
          label="To"
          value={line.endDate || ''}
          onChange={v => handleDateChange('endDate', v)}
          nextFocusRef={afterToRef}
          triggerRef={toTriggerRef}
        />

      </div>

      {/* Availability & pricing row */}
      {line.equipmentId && (
        <div className="flex items-center justify-between text-xs gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            {unitUnavailable ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                <UnitStatusBadge status={unitStatus} note={eqRecord?.statusNote} />
              </>
            ) : !startDate || !endDate ? (
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

      {/* AI Suggestions */}
      {line.equipmentId && (
        <AISuggestions
          equipmentId={line.equipmentId}
          equipmentName={line.equipmentName}
          equipmentItem={equipment.find(e => e.id === line.equipmentId)}
          equipment={equipment}
          onAddToCart={(sugg) => {
            if (onAddLine) {
              const eq = equipment.find(e => e.id === sugg.id);
              onAddLine(sugg, line.startDate, line.endDate, eq);
            }
          }}
          rentals={rentals}
          startDate={line.startDate}
          endDate={line.endDate}
        />
      )}
    </div>
  );
}