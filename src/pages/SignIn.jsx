import { useMemo, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

function safeNext(rawNext) {
  if (!rawNext) return '/ops';
  if (!rawNext.startsWith('/') || rawNext.startsWith('//')) return '/ops';
  return rawNext;
}

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicSent, setMagicSent] = useState(false);

  const nextUrl = useMemo(() => {
    return safeNext(new URLSearchParams(window.location.search).get('next'));
  }, []);

  const authCallbackUrl = useMemo(() => {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`;
  }, [nextUrl]);

  const handlePasswordSignIn = async (event) => {
    event.preventDefault();

    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }

    setPasswordLoading(true);
    setError('');

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      window.location.href = nextUrl;
    } catch (err) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError('Enter your email first.');
      return;
    }

    setMagicLoading(true);
    setError('');

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: authCallbackUrl,
          shouldCreateUser: false,
        },
      });

      if (otpError) throw otpError;

      setMagicSent(true);
    } catch (err) {
      setError(err?.message || 'Failed to send magic link.');
    } finally {
      setMagicLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');

    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: authCallbackUrl,
        },
      });

      if (googleError) throw googleError;
    } catch (err) {
      setError(err?.message || 'Google sign-in failed.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 bg-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-xl">AIR</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-gray-900">The Project AIR</h1>
            <p className="text-sm text-gray-500">Staff Portal</p>
          </div>
        </div>

        {magicSent ? (
          <div className="space-y-4">
            <div className="text-center text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-4 text-sm">
              Magic link sent to <strong>{email}</strong>. Check your inbox.
            </div>
            <button
              onClick={() => {
                setMagicSent(false);
                setPassword('');
              }}
              className="w-full text-sm text-gray-600 hover:text-gray-900 underline transition"
            >
              ← Back to sign in
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handlePasswordSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Work Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@theprojectair.com"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={passwordLoading || !email || !password}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign in'}
              </button>
            </form>

            <button
              onClick={handleMagicLink}
              disabled={magicLoading || !email}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              {magicLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Magic Link'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              If your account does not use a password, use the magic link.
            </p>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs text-gray-400">
                <span className="bg-white px-2">or</span>
              </div>
            </div>

            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign in with Google
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
