import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function SignIn() {
  useEffect(() => {
    // Redirect to the platform's built-in login page (handles password + Google OAuth)
    base44.auth.redirectToLogin('/');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}