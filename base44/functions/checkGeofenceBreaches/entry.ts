/**
 * checkGeofenceBreaches — Scheduled task that runs periodically to detect geo-fence breaches
 * Sends SMS (Twilio) + email alerts to configured management contacts on new breaches.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function sendSMS(to, body) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !fromPhone) {
    console.warn('[checkGeofenceBreaches] Twilio credentials not configured, skipping SMS');
    return;
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: fromPhone, Body: body }).toString(),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error(`[checkGeofenceBreaches] SMS to ${to} failed: ${err}`);
  } else {
    console.log(`[checkGeofenceBreaches] SMS sent to ${to}`);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Load company settings for alert contacts
    const settingsArr = await base44.asServiceRole.entities.CompanySettings.list();
    const settings = settingsArr[0] || {};
    const alertPhones = settings.geofenceAlertPhones || [];
    const alertEmails = settings.geofenceAlertEmails?.length
      ? settings.geofenceAlertEmails
      : ['dispatch@lupine.rental'];

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

      const gpsLinks = await base44.asServiceRole.entities.EquipmentGPSLink.filter(
        { equipmentId: rental.equipmentId, isActive: true },
        '-created_date',
        1
      );

      if (gpsLinks.length === 0) continue;
      const link = gpsLinks[0];

      if (!link.lastKnownLat || !link.lastKnownLng) continue;

      const provider = await base44.asServiceRole.entities.GPSProvider.get(link.providerId);
      if (!provider) continue;

      const radiusMiles = provider.geofenceRadiusMiles || 1;
      const worksiteAddress = rental.worksiteAddress || rental.customerAddress;
      const worksiteCity = rental.worksiteCity || rental.customerCity;

      const isBreached = !link.lastKnownAddress ||
        !(link.lastKnownAddress.toLowerCase().includes(worksiteCity?.toLowerCase() || ''));

      if (isBreached && !link.geofenceBreached) {
        const breachTime = new Date().toISOString();

        await base44.asServiceRole.entities.EquipmentGPSLink.update(link.id, {
          geofenceBreached: true,
          geofenceBreachedAt: breachTime,
        });

        const breachInfo = {
          rentalId: rental.id,
          equipmentId: rental.equipmentId,
          equipmentName: rental.equipmentName,
          customerName: rental.customerName,
          currentLocation: link.lastKnownAddress,
          expectedLocation: [worksiteAddress, worksiteCity, rental.worksiteState].filter(Boolean).join(', '),
          breachedAt: breachTime,
          radiusMiles,
        };
        breachesDetected.push(breachInfo);
        alertsSent++;

        const detectedStr = new Date(breachTime).toLocaleString('en-US', { timeZone: 'America/Chicago' });
        const expectedLoc = breachInfo.expectedLocation || 'Unknown worksite';

        // Send SMS to all configured alert phones
        const smsBody = `⚠️ GEO-FENCE BREACH\n${rental.equipmentName} (${rental.invoiceNumber || rental.id})\nCustomer: ${rental.customerName}\nCurrent: ${link.lastKnownAddress || 'Unknown'}\nExpected: ${expectedLoc}\nDetected: ${detectedStr}\nView: https://app.lupine.rental/airecovery`;

        for (const phone of alertPhones) {
          try {
            await sendSMS(phone, smsBody);
          } catch (smsErr) {
            console.error(`[checkGeofenceBreaches] SMS error for ${phone}: ${smsErr.message}`);
          }
        }

        // Send email to all configured alert emails
        const emailBody = `UNAUTHORIZED LOCATION DETECTED

Equipment: ${rental.equipmentName}
Rental: ${rental.invoiceNumber || rental.id}
Customer: ${rental.customerName}

Current Location: ${link.lastKnownAddress || 'Unknown'}
Expected Worksite: ${expectedLoc}

Geo-fence Radius: ${radiusMiles} miles
Detected: ${detectedStr}

⚡ IMMEDIATE ACTION REQUIRED:
1. Contact customer to verify equipment location
2. If unauthorized, initiate theft recovery protocol
3. Log incident for insurance purposes

Manage Recovery: https://app.lupine.rental/airecovery`;

        for (const email of alertEmails) {
          try {
            await base44.integrations.Core.SendEmail({
              to: email,
              subject: `⚠️ GEO-FENCE BREACH ALERT — ${rental.equipmentName}`,
              body: emailBody,
            });
          } catch (emailErr) {
            console.warn(`[checkGeofenceBreaches] Email to ${email} failed: ${emailErr.message}`);
          }
        }

      } else if (!isBreached && link.geofenceBreached) {
        await base44.asServiceRole.entities.EquipmentGPSLink.update(link.id, {
          geofenceBreached: false,
          geofenceBreachedAt: null,
        });
      }
    }

    console.log(`[checkGeofenceBreaches] Checked ${activeRentals.length} rentals. Detected ${breachesDetected.length} breaches. SMS recipients: ${alertPhones.length}, Email recipients: ${alertEmails.length}`);

    return Response.json({
      success: true,
      breachesDetected,
      alertsSent,
      smsRecipients: alertPhones.length,
      emailRecipients: alertEmails.length,
      message: `Scanned ${activeRentals.length} active rentals, detected ${breachesDetected.length} geo-fence breaches.`,
    });
  } catch (error) {
    console.error('[checkGeofenceBreaches] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});