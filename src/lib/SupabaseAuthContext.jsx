/**
 * Supabase-native AuthContext.
 * Used on Vercel (production) where window.base44 is never injected.
 * Provides the identical context shape as the Base44 AuthContext so all
 * consumers (useAuth()) work without modification.
 */
import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const SupabaseAuthContext = createContext();

const ONBOARDING_EXEMPT_PATHS = ['/onboarding', '/signin', '/store', '/air', '/airental', '/airevents', '/airfq', '/clockin', '/report/'];
const needsTenantCheck = (path) => !ONBOARDING_EXEMPT_PATHS.some(p => path.startsWith(p));

const buildUser = (supabaseUser) => ({
  id: supabaseUser.id,
  email: supabaseUser.email,
  full_name: supabaseUser.user_metadata?.full_name || supabaseUser.email,
  role: supabaseUser.user_metadata?.role || 'user',
});

export const SupabaseAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Guard: supabase client is null when env vars are missing (Base44 preview)
    if (!supabase) {
      setIsLoadingAuth(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(buildUser(session.user));
        setIsAuthenticated(true);
      }
      setIsLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(buildUser(session.user));
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    window.location.replace('/signin');
  };

  const navigateToLogin = (nextUrl) => {
    const next = nextUrl || window.location.pathname + window.location.search;
    window.location.replace(`/signin?next=${encodeURIComponent(next)}`);
  };

  return (
    <SupabaseAuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      appPublicSettings: null,
      logout,
      navigateToLogin,
      checkAppState: () => {}
    }}>
      {children}
    </SupabaseAuthContext.Provider>
  );
};

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (!context) throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  return context;
};