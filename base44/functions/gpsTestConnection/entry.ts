/**
 * gpsTestConnection — Tests a saved GPS provider's credentials by making a lightweight
 * API call (list vehicles / account info) and returns success/fail with a message.
 *
 * Payload: { providerId: "abc123" }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function testSamsara(provider) {
  const url = `${provider.baseUrl || 'https://api.samsara.com'}/v1/fleet/vehicles?limit=1`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${provider.apiKey}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json();
  const count = data.data?.length ?? 0;
  return `Connected. Found ${count} vehicle(s) in fleet.`;
}

async function testCalAmp(provider) {
  const url = `https://api.calamp.com/v1/assets?limit=1`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${provider.apiKey}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return `Connected to CalAmp (HTTP ${res.status}).`;
}

async function testVerizon(provider) {
  const url = `https://api.verizonconnect.com/api/v1/vehicles?limit=1`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${provider.apiKey}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return `Connected to Verizon Connect (HTTP ${res.status}).`;
}

async function testGeotab(provider) {
  // Geotab: authenticate to get a session
  const url = `${provider.baseUrl || 'https://my.geotab.com'}/apiv1`;
  const body = {
    method: 'Authenticate',
    params: {
      userName: provider.accountId,
      password: provider.apiSecret || provider.apiKey,
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Authentication failed');
  return `Connected to Geotab. Session established.`;
}

async function testSpireon(provider) {
  const url = `https://api.spireon.com/v1/assets?limit=1`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${provider.apiKey}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return `Connected to Spireon (HTTP ${res.status}).`;
}

async function testTrackimo(provider) {
  const url = `https://api.trackimo.com/v1/account`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${provider.apiKey}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return `Connected to Trackimo (HTTP ${res.status}).`;
}

async function testBouncie(provider) {
  const url = `https://api.bouncie.dev/v1/vehicles?limit=1`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${provider.apiKey}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return `Connected to Bouncie (HTTP ${res.status}).`;
}

async function testCustom(provider) {
  if (!provider.baseUrl) throw new Error('No base URL configured for custom provider.');
  const res = await fetch(provider.baseUrl, {
    headers: provider.apiKey ? { 'Authorization': `Bearer ${provider.apiKey}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return `Custom endpoint responded with HTTP ${res.status}.`;
}

const testers = {
  samsara: testSamsara,
  calamp: testCalAmp,
  verizon_connect: testVerizon,
  geotab: testGeotab,
  spireon: testSpireon,
  trackimo: testTrackimo,
  bouncie: testBouncie,
  custom: testCustom,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { providerId } = await req.json();
    if (!providerId) return Response.json({ error: 'providerId required' }, { status: 400 });

    const providers = await base44.asServiceRole.entities.GPSProvider.filter({ id: providerId });
    const provider = providers[0];
    if (!provider) return Response.json({ error: 'Provider not found' }, { status: 404 });

    const tester = testers[provider.providerType] || testCustom;

    const start = Date.now();
    let message = '';
    let success = false;

    try {
      message = await tester(provider);
      success = true;
    } catch (err) {
      message = err.message;
      success = false;
    }

    const latencyMs = Date.now() - start;

    // Update lastTestedAt on the provider record
    await base44.asServiceRole.entities.GPSProvider.update(provider.id, {
      lastTestedAt: new Date().toISOString(),
      lastTestResult: success ? 'ok' : 'fail',
      lastTestMessage: message,
    });

    return Response.json({ success, message, latencyMs });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});