import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { getActiveSeasonalTheme, SEASONAL_THEMES } from '@/lib/seasonalThemes';

const _listeners = new Set();
const CACHE_KEY = 'headerStyleCache';

export function invalidateHeaderStyleCache() {
  sessionStorage.removeItem(CACHE_KEY);
  _listeners.forEach(fn => fn());
}

function resolveStyle(settings) {
  const base = settings?.headerStyle || 'classic';
  const autoSeasonal = settings?.seasonalAutoActivate === true;
  const manualSeasonalKey = settings?.seasonalThemeKey || null;

  if (autoSeasonal) {
    const active = getActiveSeasonalTheme();
    if (active) return { style: 'seasonal', seasonalTheme: active };
  }
  if (base === 'seasonal' && manualSeasonalKey) {
    const found = SEASONAL_THEMES.find(t => t.key === manualSeasonalKey);
    return { style: 'seasonal', seasonalTheme: found || null };
  }
  return { style: base, seasonalTheme: null };
}

/**
 * Returns { style: string, seasonalTheme: object|null }
 * style = 'classic' | 'glassmorphism' | 'neon' | 'navy' | 'seasonal'
 * seasonalTheme = the matching SEASONAL_THEMES entry (when style === 'seasonal'), else null
 */
export function useHeaderStyle() {
  const cached = sessionStorage.getItem(CACHE_KEY);
  const [result, setResult] = useState(cached ? JSON.parse(cached) : null);

  useEffect(() => {
    if (!supabase) {
      setResult({ style: 'classic', seasonalTheme: null });
      return;
    }
    
    let cancelled = false;
    const doFetch = async () => {
      try {
        const { data, error } = await supabase.from('company_settings').select('*').limit(1);
        if (cancelled) return;
        if (error) throw error;
        const resolved = resolveStyle(data?.[0] || {});
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(resolved));
        setResult(resolved);
      } catch (err) {
        console.error('[useHeaderStyle] fetch error:', err);
        setResult({ style: 'classic', seasonalTheme: null });
      }
    };

    doFetch();
    _listeners.add(doFetch);
    return () => {
      cancelled = true;
      _listeners.delete(doFetch);
    };
  }, []);

  return result;
}
