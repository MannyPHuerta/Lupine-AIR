import { useState, useEffect } from 'react';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function StoreAuthBar({ onUserLoaded }) {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
        onUserLoaded?.(me);
      }
      setChecked(true);
    });
  }, []);

  if (!checked || !user) return null;

  return (
    <div className="bg-orange-50 border-b border-orange-100 px-4 py-2 flex items-center justify-between text-sm">
      <div className="text-orange-800 font-medium">
        👋 Welcome back, <span className="font-bold">{user.full_name || user.email}</span>
      </div>
      <div className="relative">
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="flex items-center gap-1 text-orange-700 hover:text-orange-900 font-medium"
        >
          <User className="w-4 h-4" />
          <ChevronDown className="w-3 h-3" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-7 bg-white border rounded-xl shadow-lg py-1 w-40 z-50">
            <div className="px-3 py-2 text-xs text-gray-400 border-b truncate">{user.email}</div>
            <button
              onClick={() => base44.auth.logout('/store')}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}