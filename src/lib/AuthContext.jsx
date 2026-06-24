import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

function userFromSession(session) {
  if (!session?.user) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    full_name:
      session.user.user_metadata?.full_name ||
      session.user.user_metadata?.name ||
      session.user.email,
    role: session.user.user_metadata?.role || 'user',
    raw: session.user,
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  const applySession = useCallback((session) => {
    const nextUser = userFromSession(session);
    setUser(nextUser);
    setIsAuthenticated(Boolean(nextUser));
    setAuthError(null);
  }, []);

  const checkAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) throw error;
      applySession(session);
    } catch (error) {
      console.error('[AuthContext] auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      setAuthError(null);
    } finally {
      setIsLoadingAuth(false);
    }
  }, [applySession]);

  useEffect(() => {
    let mounted = true;

    const loadInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;
        if (error) throw error;

        applySession(session);
      } catch (error) {
        if (!mounted) return;
        console.error('[AuthContext] initial session failed:', error);
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(null);
      } finally {
        if (mounted) setIsLoadingAuth(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT' ||
        event === 'USER_UPDATED'
      ) {
        applySession(session);
        setIsLoadingAuth(false);
      }
    });

    loadInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/signin';
  };

  const navigateToLogin = (nextUrl) => {
    const next = nextUrl || `${window.location.pathname}${window.location.search}`;
    window.location.href = `/signin?next=${encodeURIComponent(next)}`;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError,
        appPublicSettings: null,
        logout,
        navigateToLogin,
        checkAppState: checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
