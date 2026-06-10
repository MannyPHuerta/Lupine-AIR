/**
 * SmartAuthProvider — picks the right auth provider based on environment.
 *
 * On Vercel (production): window.base44 is never injected → use Supabase auth.
 * On Base44 (dev preview): window.base44 is injected → use Base44 auth (AuthProvider).
 *
 * Also exports useAuth() that works in both environments by reading from
 * whichever context is active.
 */
import React, { createContext, useContext } from 'react';
import { AuthProvider, useAuth as useBase44Auth } from '@/lib/AuthContext';
import { SupabaseAuthProvider, useSupabaseAuth } from '@/lib/SupabaseAuthContext';

// Are we running on Vercel / outside Base44?
// Base44 sets VITE_BASE44_APP_ID; Vercel doesn't (or we can check hostname).
const IS_VERCEL = !import.meta.env.VITE_BASE44_APP_ID ||
  (typeof window !== 'undefined' &&
   !window.location.hostname.includes('base44') &&
   !window.location.hostname.includes('localhost'));

export function SmartAuthProvider({ children }) {
  if (IS_VERCEL) {
    return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>;
  }
  return <AuthProvider>{children}</AuthProvider>;
}

// Unified useAuth hook — works in both environments
export function useAuth() {
  // Try Base44 context first, fall back to Supabase context
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useBase44Auth();
  } catch {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSupabaseAuth();
  }
}