import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, functionsVersion, appBaseUrl } = appParams;

// Always read token fresh from localStorage so tokens stored after page load are picked up
function getLiveToken() {
  return localStorage.getItem('base44_access_token') || null;
}

export const base44 = createClient({
  appId,
  get token() { return getLiveToken(); },
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});