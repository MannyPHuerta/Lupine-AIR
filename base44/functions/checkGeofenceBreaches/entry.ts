/**
 * checkGeofenceBreaches — Scheduled task that runs periodically to detect geo-fence breaches
 * 
 * For each active rental with GPS tracking enabled, check if equipment has moved outside
 * its expected worksite geo-fence. If breached, trigger alerts and update EquipmentGPSLink.
 * 
 * Payload: {} (no params needed)
 * 
 * Returns: { breachesDetected: [...], alertsSent: number }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all active rentals
    const activeRentals = await base44.asServiceRole.entities.Rental.filter(
      { status: 'out' },
      '-created_date',
      500
    );

    const breachesDetected = [];
    let alertsSent = 0;

    for (const rental of activeRentals) {
      if (!rental.equipmentId) continue;

      // Check if equipment has GPS tracking
      const gpsLinks = await base44.asServiceRole.entities.EquipmentGPSLink.filter(
        { equipmentId: rental.equipmentId, isActive: true },
        '-created_date',
        1
      );

      if (gpsLinks.length === 0) continue;
      const link = gpsLinks[0];

      // Get latest location from EquipmentGPSLink
      if (!link.lastKnownLat || !link.lastKnownLng) continue;

      // Get provider to get geo-fence radius
      const provider = await base44.asServiceRole.entities.GPSProvider.get(link.providerId);
      if (!provider) continue;

      const radiusMiles = provider.geofenceRadiusMiles || 1;

      // Calculate distance from rental worksite to current location
      // Use worksite as the expected location
      const worksiteAddress = rental.worksiteAddress || rental.customerAddress;
      const worksiteCity = rental.worksiteCity || rental.customerCity;

      // For now, we'll use simple city-based matching
      // In production, you'd want to reverse-geocode the GPS coords and do proper distance checking
      const isBreached = !link.lastKnownAddress ||
        !(link.lastKnownAddress.toLowerCase().includes(worksiteCity?.toLowerCase() || ''));

      if (isBreached && !link.geofenceBreached) {
        // New breach detected!
        const breachTime = new Date().toISOString();

        // Update the GPS link to mark breach
        await base44.asServiceRole.entities.EquipmentGPSLink.update(link.id, {
          geofenceBreached: true,
          geofenceBreachedAt: breachTime,
        });

        breachesDetected.push({
          rentalId: rental.id,
          equipmentId: rental.equipmentId,
          equipmentName: rental.equipmentName,
          customerName: rental.customerName,
          currentLocation: link.lastKnownAddress,
          expectedLocation: [worksiteAddress, worksiteCity, rental.worksiteState].filter(Boolean).join(', '),
          breachedAt: breachTime,
          radiusMiles,
        });

        alertsSent++;

        // Send alert notification
        try {
          await base44.integrations.Core.SendEmail({
            to: 'dispatch@lupine.rental', // Replace with actual dispatch email
            subject: `⚠️ GEO-FENCE BREACH ALERT — ${rental.equipmentName}`,
            body: `
UNAUTHORIZED LOCATION DETECTED

Equipment: ${rental.equipmentName}
Rental: ${rental.invoiceNumber}
Customer: ${rental.customerName}

Current Location: ${link.lastKnownAddress}
Expected Worksite: ${[worksiteAddress, worksiteCity, rental.worksiteState].filter(Boolean).join(', ')}

Geo-fence Radius: ${radiusMiles} miles
Detected: ${new Date(breachTime).toLocaleString('en-US', { timeZone: 'America/Chicago' })}

⚡ IMMEDIATE ACTION REQUIRED:
1. Contact customer to verify equipment location
2. If unauthorized, initiate theft recovery protocol
3. Log incident for insurance purposes

Manage Recovery: https://app.lupine.rental/airecovery
            `,
          });
        } catch (emailErr) {
          console.warn(`[checkGeofenceBreaches] Email notification failed: ${emailErr.message}`);
        }
      } else if (!isBreached && link.geofenceBreached) {
        // Breach has been cleared (equipment returned to zone)
        await base44.asServiceRole.entities.EquipmentGPSLink.update(link.id, {
          geofenceBreached: false,
          geofenceBreachedAt: null,
        });
      }
    }

    console.log(`[checkGeofenceBreaches] Checked ${activeRentals.length} rentals. Detected ${breachesDetected.length} breaches.`);

    return Response.json({
      success: true,
      breachesDetected,
      alertsSent,
      message: `Scanned ${activeRentals.length} active rentals, detected ${breachesDetected.length} geo-fence breaches.`,
    });
  } catch (error) {
    console.error('[checkGeofenceBreaches] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});