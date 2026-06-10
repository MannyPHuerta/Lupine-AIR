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
    if (!base44) {
      // Base44 SDK not available yet
      setIsLoadingAuth(false);
      return;
    }
    base44.auth.me()
      .then(async (currentUser) => {
        setUser(currentUser);
        setIsAuthenticated(true);

        // Check tenant provisioning — redirect to onboarding if missing
        if (needsTenantCheck(window.location.pathname)) {
          const tenants = await base44.entities.Tenant.filter({ admin_user_id: currentUser.id });
          if (!tenants || tenants.length === 0) {
            window.location.replace('/onboarding');
          }
        }
      })
      .catch((error) => {
        if (error?.status === 403 && error?.data?.extra_data?.reason === 'user_not_registered') {
          setAuthError({ type: 'user_not_registered' });
        }
        setIsAuthenticated(false);
      })
      .finally(() => setIsLoadingAuth(false));
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