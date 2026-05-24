import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

let _cached = null;
const _listeners = new Set();

export function invalidateHeaderStyleCache(newStyle) {
  if (newStyle) {
    _cached = newStyle;
    _listeners.forEach(fn => fn(newStyle));
  } else {
    _cached = null;
    _listeners.forEach(fn => fn());
  }
}

/**
 * Returns the current headerStyle string: 'classic' | 'glassmorphism' | 'neon'
 * Caches the result in memory so it only hits the DB once per session.
 */
export function useHeaderStyle() {
  const [style, setStyle] = useState(_cached || 'classic');

  useEffect(() => {
    // Always fetch on mount if no cache
    if (!_cached) {
      base44.entities.CompanySettings.list().then(list => {
        const s = list[0]?.headerStyle || 'classic';
        _cached = s;
        setStyle(s);
      }).catch(() => {});
    }

    // Always register listener so invalidation reaches every mounted component
    const refresh = (newStyle) => {
      if (newStyle) {
        _cached = newStyle;
        setStyle(newStyle);
      } else {
        base44.entities.CompanySettings.list().then(list => {
          const s = list[0]?.headerStyle || 'classic';
          _cached = s;
          setStyle(s);
        }).catch(() => {});
      }
    };
    _listeners.add(refresh);
    return () => _listeners.delete(refresh);
  }, []);

  return style;
}