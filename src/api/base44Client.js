// Base44 SDK client for frontend usage
// In Base44 apps, the platform injects window.base44 automatically

export const base44 = typeof window !== 'undefined' && window.base44 
  ? window.base44 
  : null;