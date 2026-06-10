import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

// Pages that don't need a Tenant record
const ONBOARDING_EXEMPT_PATHS = ['/onboarding', '/signin', '/store', '/air', '/airental', '/airevents', '/airfq', '/clockin', '/report/'];

const needsTenantCheck = (path) =>
  !ONBOARDING_EXEMPT_PATHS.some(p => path.startsWith(p));

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      // Wait up to 3s for the platform to inject window.base44
      let attempts = 0;
      while (!window.base44 && attempts < 30) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }

      if (!window.base44) {
        // SDK never arrived — fallback to preview mode
        setUser({ id: 'preview', email: 'preview@base44.com', full_name: 'Preview User', role: 'admin' });
        setIsAuthenticated(true);
        setIsLoadingAuth(false);
        return;
      }
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAuthenticated(true);

        // Check tenant provisioning — redirect to onboarding if missing
        if (needsTenantCheck(window.location.pathname)) {
          const tenants = await base44.entities.Tenant.filter({ admin_user_id: currentUser.id });
          if (!tenants || tenants.length === 0) {
            window.location.replace('/onboarding');
          }
        }
        setIsLoadingAuth(false);
      } catch (error) {
        if (error?.status === 403 && error?.data?.extra_data?.reason === 'user_not_registered') {
          setAuthError({ type: 'user_not_registered' });
        }
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
      }
    };
    checkAuth();
  }, []);

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    base44.auth.logout();
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      appPublicSettings: null,
      logout,
      navigateToLogin: () => base44.auth.redirectToLogin(),
      checkAppState: () => {}
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};