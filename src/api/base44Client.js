import { createClient } from "@base44/sdk";

// Base44 SDK client for frontend usage
// Platform injects window.base44 in editor preview; use env var for production builds
const base44Client = typeof window !== 'undefined' && window.base44
  ? window.base44
  : createClient({ appId: import.meta.env.VITE_BASE44_APP_ID });

export const base44 = base44Client;