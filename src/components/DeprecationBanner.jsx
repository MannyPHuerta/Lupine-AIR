import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Renders a prominent red deprecation banner at the top of the app.
 * Indicates this Base44 demo is being replaced by Vercel/Supabase deployment.
 */
export default function DeprecationBanner() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem('deprecationBannerDismissed');
    if (dismissed) setShow(false);
  }, []);

  const dismiss = () => {
    localStorage.setItem('deprecationBannerDismissed', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="sticky top-0 z-50 bg-red-600 text-white text-center text-xs font-semibold py-2 px-4 shadow-lg flex items-center justify-between gap-4">
      <div className="flex-1">
        <span className="font-bold">⚠️ DEPRECATED DEMO ENVIRONMENT</span>
        <span className="ml-2">This Base44 app is being replaced. Production will run on Vercel/Supabase.</span>
      </div>
      <button
        onClick={dismiss}
        className="text-white/80 hover:text-white font-bold text-lg leading-none px-2 py-1"
        title="Dismiss"
      >
        ×
      </button>
    </div>
  );
}