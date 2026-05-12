import { useState, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * When a search term returns no results in the local catalog,
 * ask the LLM to suggest alternative names / synonyms that might match.
 * Returns { aiSuggestions, isSearching, triggerAISearch, clearAISuggestions }
 */
export function useAIEquipmentSearch(equipment) {
  const [aiSuggestions, setAISuggestions] = useState([]); // matched Equipment records
  const [isSearching, setIsSearching] = useState(false);
  const lastQuery = useRef('');

  const triggerAISearch = useCallback(async (query) => {
    if (!query || query.trim().length < 2) return;
    if (query === lastQuery.current) return;
    lastQuery.current = query;

    setIsSearching(true);
    setAISuggestions([]);

    try {
      // Build a compact catalog list for the LLM (name only to keep prompt small)
      const catalogNames = equipment.map(e => e.name).join('\n');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a rental equipment catalog assistant. A user searched for "${query}" but found nothing.\n\nBelow is our equipment catalog (one item per line):\n${catalogNames}\n\nWhich catalog items (if any) are likely what the user is looking for? Consider alternate trade names, regional names, or common synonyms (e.g. "Quicky Saw" = "Rescue Saw", "Jack Hammer" = "Paving Breaker", "Bobcat" = "Skid Steer").\n\nReturn ONLY a JSON array of exact item names from the catalog that match. If nothing matches, return []. No explanation.`,
        response_json_schema: {
          type: 'object',
          properties: {
            matches: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      const matchedNames = result?.matches || [];
      const matched = equipment.filter(e =>
        matchedNames.some(name => name.toLowerCase() === e.name.toLowerCase())
      );
      setAISuggestions(matched);
    } catch (_) {
      // Fail silently — AI search is a best-effort enhancement
    } finally {
      setIsSearching(false);
    }
  }, [equipment]);

  const clearAISuggestions = useCallback(() => {
    setAISuggestions([]);
    lastQuery.current = '';
  }, []);

  return { aiSuggestions, isSearching, triggerAISearch, clearAISuggestions };
}