import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Renders a sticky amber banner at the top of the app when demoModeEnabled = true.
 * Drop this inside AppLayout above the <Outlet />.
 */
export default function DemoBanner() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    base44.entities.CompanySettings.list().then(list => {
      setEnabled(list[0]?.demoModeEnabled === true);
    }).catch(() => {});
  }, []);

  if (!enabled) return null;

  return (
    <div className="sticky top-0 z-50 bg-amber-400 text-amber-900 text-center text-xs font-bold py-1.5 tracking-widest uppercase shadow-sm select-none">
      🎭 DEMO MODE — This is a sandbox environment. Data may be reset at any time.
    </div>
  );
}