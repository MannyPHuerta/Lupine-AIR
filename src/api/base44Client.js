// Base44 SDK client — gracefully handles missing appId (preview/Vercel mode)
import { createClient } from '@base44/sdk';

const appId = typeof window !== 'undefined' 
  ? (import.meta.env.VITE_BASE44_APP_ID || window?.base44?.appId) 
  : undefined;

// In preview/Vercel mode, appId may be undefined — SDK still works for functions/integrations
// but auth methods will be bypassed in favor of Supabase auth
export const base44 = appId ? createClient({ appId }) : createClient({ appId: 'preview' });