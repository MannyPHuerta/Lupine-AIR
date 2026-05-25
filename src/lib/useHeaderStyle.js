import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getActiveSeasonalTheme, SEASONAL_THEMES } from '@/lib/seasonalThemes';

let _cached = null;
const _listeners = new Set();

export function invalidateHeaderStyleCache() {
  _cached = null;
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
  const [result, setResult] = useState(_cached || { style: 'classic', seasonalTheme: null });

  useEffect(() => {
    if (!_cached) {
      base44.entities.CompanySettings.list().then(list => {
        const resolved = resolveStyle(list[0]);
        _cached = resolved;
        setResult(resolved);
      }).catch(() => {});
    }

    const refresh = () => {
      base44.entities.CompanySettings.list().then(list => {
        const resolved = resolveStyle(list[0]);
        _cached = resolved;
        setResult(resolved);
      }).catch(() => {});
    };
    _listeners.add(refresh);
    return () => _listeners.delete(refresh);
  }, []);

  return result;
}