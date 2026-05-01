import React, { createContext, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const BrandingContext = createContext(null);

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState({
    logoUrl: null,
    companyName: null,
    brandingTheme: {
      primaryColor: '#1E40AF',
      secondaryColor: '#6B7280',
      accentColor: '#F59E0B',
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.CompanySettings.list()
      .then(settings => {
        if (settings.length > 0) {
          const s = settings[0];
          setBranding({
            logoUrl: s.logoUrl,
            companyName: s.companyName,
            brandingTheme: s.brandingTheme || branding.brandingTheme,
          });
        }
      })
      .catch(err => console.error('Failed to load branding:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <BrandingContext.Provider value={{ ...branding, loading }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used inside BrandingProvider');
  return ctx;
}