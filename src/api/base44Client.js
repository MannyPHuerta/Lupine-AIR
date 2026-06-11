// Base44 SDK client
import { createClient } from '@base44/sdk';

export const base44 = createClient({
  appId: typeof window !== 'undefined' ? (import.meta.env.VITE_BASE44_APP_ID || window?.base44?.appId) : undefined,
});