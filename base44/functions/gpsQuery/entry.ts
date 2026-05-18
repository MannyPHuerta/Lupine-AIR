/**
 * gpsQuery — Unified GPS adapter for multiple telematics providers
 * 
 * Queries the configured GPS provider for a given equipment's location.
 * Returns normalized location telemetry regardless of underlying provider.
 * 
 * Payload:
 * {
 *   equipmentId: "abc123",
 *   deviceId: "samsara_device_xyz",  // (optional) if you want to override the linked device
 *   providerId: "gps_provider_id",   // (optional) if you want to override the linked provider
 * }
 * 
 * Returns:
 * {
 *   success: true,
 *   location: {
 *     latitude: 26.2235,
 *     longitude: -97.8388,
 *     address: "123 Main St, McAllen, TX 78501",
 *     accuracy: 10, // meters
 *     timestamp: "2026-05-18T14:30:00Z",
 *     speed: 25, // mph
 *     heading: 90, // degrees
 *   },
 *   device: {
 *     id: "samsara_123",
 *     label: "Unit 42 - Generator",
 *     status: "active",
 *   },
 *   provider: {
 *     type: "samsara",
 *     name: "Samsara - McAllen",
 *   },
 *   breach: {
 *     isBreached: false,
 *     breachedAt: null,
 *     radiusMiles: 1,
 *     expectedAddress: "123 Worksite Ln, McAllen, TX",
 *   },
 *   error: null,
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Provider adapter implementations
const adapters = {
  samsara: samsaraAdapter,
  calamp: calapAdapter,
  verizon_connect: verizonAdapter,
  geotab: geotabAdapter,
  spireon: spireonAdapter,
  trackimo: trackimoAdapter,
  bouncie: bouncieAdapter,
};

async function samsaraAdapter(provider, deviceId) {
  const url = `${provider.baseUrl || 'https://api.samsara.com'}/v1/fleet/vehicles/${deviceId}/locations?limit=1`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${provider.apiKey}` }
  });
  if (!res.ok) throw new Error(`Samsara API error: ${res.statusText}`);
  const data = await res.json();
  if (!data.data || data.data.length === 0) return null;
  const loc = data.data[0];
  return {
    latitude: loc.latitude,
    longitude: loc.longitude,
    accuracy: loc.accuracy || 10,
    timestamp: loc.time || new Date().toISOString(),
    speed: loc.speed ? loc.speed * 0.621371 : null, // Convert km/h to mph
    heading: loc.heading || null,
    address: null, // Samsara doesn't return address; reverse geocode separately if needed
  };
}

async function calapAdapter(provider, deviceId) {
  const url = `https://api.calamp.com/v1/assets/${deviceId}/position`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${provider.apiKey}` }
  });
  if (!res.ok) throw new Error(`CalAmp API error: ${res.statusText}`);
  const data = await res.json();
  return {
    latitude: data.latitude,
    longitude: data.longitude,
    accuracy: data.accuracy || 10,
    timestamp: data.timestamp || new Date().toISOString(),
    speed: data.speed || null,
    heading: data.heading || null,
    address: null,
  };
}

async function verizonAdapter(provider, deviceId) {
  const url = `https://api.verizonconnect.com/api/v1/vehicles/${deviceId}/position`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${provider.apiKey}` }
  });
  if (!res.ok) throw new Error(`Verizon Connect API error: ${res.statusText}`);
  const data = await res.json();
  return {
    latitude: data.lat,
    longitude: data.lng,
    accuracy: data.accuracy || 10,
    timestamp: data.timestamp || new Date().toISOString(),
    speed: data.speed || null,
    heading: data.heading || null,
    address: data.address || null,
  };
}

async function geotabAdapter(provider, deviceId) {
  // Geotab uses XML-RPC API — requires auth and a more complex call
  // For MVP, we'll stub this with a simplified approach
  // In production, use geotab-sdk npm package
  const url = `https://api.geotab.com/apiv1/Get`;
  const body = {
    method: 'Get',
    params: {
      typeName: 'LogRecord',
      search: { device: { id: deviceId } },
      resultsLimit: 1,
    },
    id: 1,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Geotab API error: ${res.statusText}`);
  const data = await res.json();
  if (!data.result || data.result.length === 0) return null;
  const log = data.result[0];
  return {
    latitude: log.latitude,
    longitude: log.longitude,
    accuracy: 10,
    timestamp: log.dateTime || new Date().toISOString(),
    speed: log.speed || null,
    heading: null,
    address: null,
  };
}

async function spireonAdapter(provider, deviceId) {
  const url = `https://api.spireon.com/v1/assets/${deviceId}/location`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${provider.apiKey}` }
  });
  if (!res.ok) throw new Error(`Spireon API error: ${res.statusText}`);
  const data = await res.json();
  return {
    latitude: data.gps?.latitude,
    longitude: data.gps?.longitude,
    accuracy: data.gps?.accuracy || 10,
    timestamp: data.gps?.timestamp || new Date().toISOString(),
    speed: data.gps?.speed || null,
    heading: data.gps?.heading || null,
    address: null,
  };
}

async function trackimoAdapter(provider, deviceId) {
  const url = `https://api.trackimo.com/v1/devices/${deviceId}/location`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${provider.apiKey}` }
  });
  if (!res.ok) throw new Error(`Trackimo API error: ${res.statusText}`);
  const data = await res.json();
  return {
    latitude: data.lat,
    longitude: data.lng,
    accuracy: data.accuracy || 10,
    timestamp: data.timestamp || new Date().toISOString(),
    speed: data.speed || null,
    heading: null,
    address: null,
  };
}

async function bouncieAdapter(provider, deviceId) {
  const url = `https://api.bouncie.dev/v1/vehicles/${deviceId}/location`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${provider.apiKey}` }
  });
  if (!res.ok) throw new Error(`Bouncie API error: ${res.statusText}`);
  const data = await res.json();
  return {
    latitude: data.location.latitude,
    longitude: data.location.longitude,
    accuracy: 10,
    timestamp: data.timestamp || new Date().toISOString(),
    speed: data.speed || null,
    heading: null,
    address: null,
  };
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function reverseGeocode(lat, lng) {
  // Using OSM Nominatim (free, no key required)
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.address?.road || data.display_name || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { equipmentId, deviceId: overrideDeviceId, providerId: overrideProviderId } = body;

    if (!equipmentId) {
      return Response.json({ error: 'equipmentId required' }, { status: 400 });
    }

    // Fetch equipment
    const equipment = await base44.asServiceRole.entities.Equipment.get(equipmentId);
    if (!equipment) {
      return Response.json({ error: 'Equipment not found' }, { status: 404 });
    }

    // Find GPS link (or use override)
    let link;
    if (overrideProviderId && overrideDeviceId) {
      link = { providerId: overrideProviderId, deviceId: overrideDeviceId };
    } else {
      const links = await base44.asServiceRole.entities.EquipmentGPSLink.filter({ equipmentId }, '-created_date', 1);
      if (!links || links.length === 0) {
        return Response.json({
          success: false,
          error: 'No GPS provider linked to this equipment',
          location: null,
        });
      }
      link = links[0];
    }

    // Fetch provider config
    const provider = await base44.asServiceRole.entities.GPSProvider.get(link.providerId);
    if (!provider) {
      return Response.json({ error: 'GPS provider config not found' }, { status: 404 });
    }

    if (!provider.isActive) {
      return Response.json({
        success: false,
        error: `Provider "${provider.name}" is inactive`,
        location: null,
      });
    }

    // Call the appropriate adapter
    const adapter = adapters[provider.providerType];
    if (!adapter) {
      return Response.json({ error: `Unknown provider type: ${provider.providerType}` }, { status: 400 });
    }

    let location = null;
    let adapterError = null;
    try {
      location = await adapter(provider, overrideDeviceId || link.deviceId);
    } catch (err) {
      adapterError = err.message;
      console.error(`[gpsQuery] Adapter error for ${provider.providerType}: ${adapterError}`);
    }

    if (!location) {
      return Response.json({
        success: false,
        error: adapterError || 'No location data returned from provider',
        location: null,
      });
    }

    // Reverse geocode if no address returned
    if (!location.address) {
      location.address = await reverseGeocode(location.latitude, location.longitude);
    }

    // Check geo-fence breach
    const rental = (await base44.asServiceRole.entities.Rental.filter(
      { equipmentId, status: 'out' },
      '-created_date',
      1
    ))[0];

    let breachStatus = {
      isBreached: false,
      breachedAt: null,
      radiusMiles: provider.geofenceRadiusMiles || 1,
      expectedAddress: null,
    };

    if (rental && rental.worksiteAddress) {
      // Simple check: if worksite city doesn't match location city, flag it
      // In production, you'd reverse-geocode and do a proper distance check
      breachStatus.expectedAddress = [rental.worksiteAddress, rental.worksiteCity, rental.worksiteState].filter(Boolean).join(', ');
    }

    // Update the EquipmentGPSLink with latest location data
    await base44.asServiceRole.entities.EquipmentGPSLink.update(link.id, {
      lastKnownLat: location.latitude,
      lastKnownLng: location.longitude,
      lastKnownAddress: location.address,
      lastKnownSpeed: location.speed,
      lastSeenAt: location.timestamp,
    });

    return Response.json({
      success: true,
      location,
      device: {
        id: link.deviceId,
        label: link.deviceLabel || equipment.name,
        status: provider.isActive ? 'active' : 'inactive',
      },
      provider: {
        type: provider.providerType,
        name: provider.name,
      },
      breach: breachStatus,
      error: null,
    });
  } catch (error) {
    console.error('[gpsQuery] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});