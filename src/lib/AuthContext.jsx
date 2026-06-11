import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();


export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      if (!base44 || !base44.auth) {
        // Base44 SDK not available — fallback to preview mode
        setUser({ id: 'preview', email: 'preview@base44.com', full_name: 'Preview User', role: 'admin' });
        setIsAuthenticated(true);
        setIsLoadingAuth(false);
        return;
      }
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAuthenticated(true);
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