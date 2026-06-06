import { useState, useEffect } from 'react';
import { ShieldAlert, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

const SESSION_KEY = 'air_fraud_section_unlocked';
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// A simple passphrase gate — the admin sets a known shared code.
// For stronger security, replace with a backend OTP/magic-link flow.
// The passphrase is stored only in the admin's head, not in the codebase.
const ADMIN_PIN_ENV = 'FRAUD_SECTION_PIN'; // set via Deno secret if desired

function isSessionValid() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const { expires } = JSON.parse(raw);
    return Date.now() < expires;
  } catch {
    return false;
  }
}

function setSession() {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ expires: Date.now() + SESSION_DURATION_MS }));
}

/**
 * AdminReauthGate
 * Prompts the admin to enter a passphrase before accessing fraud/security pages.
 * Session is held in sessionStorage for 30 minutes (clears on tab close).
 */
export default function AdminReauthGate({ children, title = 'Internal Fraud Controls' }) {
  const [verified, setVerified] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setVerified(isSessionValid());
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setLoading(true);
    setError('');

    try {
      await base44.functions.invoke('verifyAdminPin', { pin: pin.trim() });
      setSession();
      setVerified(true);
    } catch {
      setError('Incorrect PIN. Access denied.');
      setPin('');
    }
    setLoading(false);
  };

  if (verified) return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 bg-red-900/30 border border-red-700/50 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-white font-bold text-xl">{title}</h1>
          <p className="text-gray-400 text-sm">Administrator verification required to access this section.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 block mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Security PIN
            </label>
            <Input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="Enter admin PIN"
              className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 tracking-widest text-center text-lg"
              autoFocus
              maxLength={20}
            />
          </div>

          {error && (
            <div className="text-red-400 text-xs bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2 text-center">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !pin.trim()}
            className="w-full bg-red-700 hover:bg-red-600 text-white font-semibold gap-2"
          >
            <Lock className="w-4 h-4" />
            {loading ? 'Verifying…' : 'Unlock Section'}
          </Button>
        </form>

        <div className="text-center text-xs text-gray-600 space-y-1">
          <p>Restricted to system administrators only.</p>
          <p>Session expires after 30 minutes of inactivity.</p>
          <p>All access attempts are logged.</p>
        </div>
      </div>
    </div>
  );
}