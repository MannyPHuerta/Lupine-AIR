import { createClient } from "@base44/sdk";

// Platform injects window.base44 in production/editor; use it if available
const base44Client = typeof window !== 'undefined' && window.base44
  ? window.base44
  : createClient({ appId: import.meta.env.VITE_BASE44_APP_ID });

export const base44 = base44Client;