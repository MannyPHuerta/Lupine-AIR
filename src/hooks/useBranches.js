import { useState, useEffect } from 'react';
import { supabaseData } from '@/lib/supabaseData';

/**
 * Fetches the list of branch names from the BranchSettings table.
 * Returns { branches: string[], loading: boolean }.
 */
export function useBranches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabaseData.BranchSettings.list()
      .then(records => {
        if (cancelled) return;
        setBranches(records.map(r => r.branch).filter(Boolean).sort());
      })
      .catch(err => {
        if (!cancelled) console.error('[useBranches] Failed to load:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { branches, loading };
}