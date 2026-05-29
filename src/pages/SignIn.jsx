import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await base44.auth.sendMagicLink(email);
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 space-y-6">

        {/* Logo / Branding */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-2xl">RW</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-gray-900">Rental World</h1>
            <p className="text-sm text-gray-500">Staff Portal</p>
          </div>
        </div>

        {sent ? (
          <div className="text-center space-y-3">
            <div className="text-4xl">📬</div>
            <h2 className="font-bold text-gray-900">Check your email</h2>
            <p className="text-sm text-gray-500">
              We sent a magic link to <strong>{email}</strong>. Click it to sign in.
            </p>
            <button
              onClick={() => setSent(false)}
              className="text-xs text-indigo-600 hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Work Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@rentalworld.com"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Magic Link'}
            </button>
            <p className="text-xs text-center text-gray-400">
              We'll email you a secure link — no password needed.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}