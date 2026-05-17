/**
 * Reusable equipment search input with AI synonym fallback.
 * Shows normal results first; when empty + ≥3 chars typed, triggers AI search.
 */
import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAIEquipmentSearch } from '@/hooks/useAIEquipmentSearch';

export default function AIEquipmentSearchInput({ equipment, onSelect, placeholder = 'Search equipment…', className = '' }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const timerRef = useRef(null);
  const listRef = useRef(null);
  const { aiSuggestions, isSearching, triggerAISearch, clearAISuggestions } = useAIEquipmentSearch(equipment);

  const filtered = search.trim()
    ? equipment.filter(e => e.name?.toLowerCase().includes(search.toLowerCase()) && e.status !== 'retired')
    : [];

  const displayItems = filtered.length > 0 ? filtered.slice(0, 20) : aiSuggestions;

  useEffect(() => {
    setHighlightIdx(-1);
  }, [search]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (search.trim().length >= 3 && filtered.length === 0) {
      timerRef.current = setTimeout(() => triggerAISearch(search.trim()), 600);
    } else {
      clearAISuggestions();
    }
    return () => clearTimeout(timerRef.current);
  }, [search, filtered.length]);

  const handleSelect = (item) => {
    onSelect(item);
    setSearch('');
    setOpen(false);
    setHighlightIdx(-1);
    clearAISuggestions();
  };

  const handleKeyDown = (e) => {
    if (!open || displayItems.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(highlightIdx + 1, displayItems.length - 1);
      setHighlightIdx(next);
      listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.max(highlightIdx - 1, 0);
      setHighlightIdx(next);
      listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIdx >= 0 && displayItems[highlightIdx]) handleSelect(displayItems[highlightIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
      <Input
        placeholder={placeholder}
        value={search}
        onChange={e => { setSearch(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        onKeyDown={handleKeyDown}
        className="pl-9 text-sm"
      />
      {open && search.trim().length > 0 && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-xl max-h-56 overflow-y-auto">
          {/* AI label */}
          {filtered.length === 0 && !isSearching && aiSuggestions.length > 0 && (
            <div className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border-b">
              <Sparkles className="w-3 h-3" /> Did you mean…
            </div>
          )}

          {/* Results list (normal or AI) */}
          <div ref={listRef}>
            {displayItems.map((e, idx) => (
              <button
                key={e.id}
                onMouseDown={() => handleSelect(e)}
                className={`w-full text-left px-4 py-2 text-sm transition ${idx === highlightIdx ? 'bg-indigo-100' : 'hover:bg-indigo-50'}`}
              >
                <div className="font-medium text-gray-900">{e.name}</div>
                <div className="text-xs text-gray-500">${e.dailyRate}/day{e.category ? ` · ${e.category}` : ''}</div>
              </button>
            ))}
          </div>

          {/* AI loading */}
          {filtered.length === 0 && isSearching && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-indigo-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Searching by alternate names…
            </div>
          )}

          {/* No results */}
          {displayItems.length === 0 && !isSearching && (
            <div className="px-4 py-3 text-sm text-gray-400">No equipment found</div>
          )}
        </div>
      )}
    </div>
  );
}