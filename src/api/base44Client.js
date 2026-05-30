import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, functionsVersion, appBaseUrl } = appParams;

// Read token dynamically so it picks up tokens stored after initial page load
const getToken = () => appParams.token || localStorage.getItem('base44_access_token');

export const base44 = createClient({
  appId,
  get token() { return getToken(); },
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});