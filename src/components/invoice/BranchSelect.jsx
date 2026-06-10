import { useState, useRef, useEffect } from 'react';

const BRANCHES = [
  '01 State Street',
  '02 Congress Ave',
  '03 Riverside Dr',
  '04 Market Square',
  '05 Harbor Blvd',
  '98 Shop',
  '99 Warehouse',
];

export default function BranchSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(BRANCHES.indexOf(value) || 0);
  const listRef = useRef(null);
  const btnRef = useRef(null);
  const typeahead = useRef('');
  const typeaheadTimer = useRef(null);

  // Keep highlight in sync when value changes externally
  useEffect(() => {
    const idx = BRANCHES.indexOf(value);
    if (idx >= 0) setHighlight(idx);
  }, [value]);

  const select = (branch) => {
    onChange(branch);
    setOpen(false);
    btnRef.current?.focus();
  };

  const scrollTo = (idx) => {
    listRef.current?.children[idx]?.scrollIntoView({ block: 'nearest' });
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
        return;
      }
    }

    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'Enter') { e.preventDefault(); select(BRANCHES[highlight]); return; }
    if (e.key === 'Tab') { setOpen(false); return; }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(highlight + 1, BRANCHES.length - 1);
      setHighlight(next);
      scrollTo(next);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.max(highlight - 1, 0);
      setHighlight(next);
      scrollTo(next);
      return;
    }

    // Typeahead — accumulate chars, find first match
    if (e.key.length === 1) {
      e.preventDefault();
      clearTimeout(typeaheadTimer.current);
      typeahead.current += e.key.toLowerCase();
      const match = BRANCHES.findIndex(b => b.toLowerCase().includes(typeahead.current));
      if (match >= 0) {
        setHighlight(match);
        scrollTo(match);
        if (!open) { onChange(BRANCHES[match]); }
      }
      typeaheadTimer.current = setTimeout(() => { typeahead.current = ''; }, 800);
    }
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onKeyDown={handleKeyDown}
        onClick={() => setOpen(o => !o)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}
        className="w-full flex items-center justify-between px-3 py-2 border rounded-md text-sm bg-transparent hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-left"
      >
        <span>{value}</span>
        <span className="text-gray-400 ml-2">▾</span>
      </button>

      {open && (
        <div className="absolute z-40 left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl">
          <ul ref={listRef} className="max-h-52 overflow-y-auto py-1">
            {BRANCHES.map((b, idx) => (
              <li
                key={b}
                onMouseDown={() => select(b)}
                onMouseEnter={() => setHighlight(idx)}
                className={`px-4 py-2 text-sm cursor-pointer ${idx === highlight ? 'bg-indigo-100 text-indigo-900' : 'hover:bg-gray-50'}`}
              >
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}