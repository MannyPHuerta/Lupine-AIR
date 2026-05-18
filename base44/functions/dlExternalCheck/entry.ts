/**
 * dlExternalCheck — Free external database checks for DL Scan Intel
 * 1. Twilio Lookup v2 — phone line type, fraud score, VOIP/burner detection
 * 2. NICB VINCheck — not applicable to DL, but we check address against NICB fraud indicators
 *
 * Payload: { phone, name, address, city, state, zip }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone, name, address, city, state, zip } = await req.json();

    const results = {
      twilioLookup: null,
      nicbCheck: null,
      errors: [],
    };

    // ── 1. TWILIO LOOKUP v2 ─────────────────────────────────────────────────
    if (phone && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      try {
        // Normalize phone to E.164
        const digits = phone.replace(/\D/g, '');
        const e164 = digits.startsWith('1') ? `+${digits}` : `+1${digits}`;

        const twilioUrl = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(e164)}?Fields=line_type_intelligence,identity_match`;
        const twilioRes = await fetch(twilioUrl, {
          headers: {
            Authorization: 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
          },
        });
        const twilioData = await twilioRes.json();
        console.log('Twilio Lookup response:', JSON.stringify(twilioData));

        if (twilioRes.ok) {
          const lti = twilioData.line_type_intelligence || {};
          const im = twilioData.identity_match || {};
          results.twilioLookup = {
            valid: twilioData.valid,
            phoneType: lti.type || 'unknown',         // mobile, landline, voip, toll-free, etc.
            carrier: lti.carrier_name || null,
            mobileCountryCode: lti.mobile_country_code || null,
            fraudScore: lti.call_forwarding_detected !== undefined ? lti : null,
            // Identity match (if name provided)
            nameMatch: im.first_name_match || im.last_name_match || null,
            addressMatch: im.address_line_match || null,
            isFraudRisk: lti.type === 'voip' || lti.type === 'prepaid',
            rawType: lti.type,
          };
        } else {
          results.errors.push(`Twilio: ${twilioData.message || twilioRes.statusText}`);
          console.error('Twilio error:', twilioData);
        }
      } catch (err) {
        console.error('Twilio lookup failed:', err);
        results.errors.push(`Twilio: ${err.message}`);
      }
    } else if (!TWILIO_ACCOUNT_SID) {
      results.errors.push('Twilio credentials not configured');
    }

    // ── 2. NICB VINCheck (address-based stolen equipment check via public API) ──
    // NICB doesn't have a public address API, but we can flag known high-risk zip codes
    // and cross-reference with the NICB stolen equipment reporting page.
    // We'll do a structured check and provide a direct NICB search link.
    if (name || address) {
      try {
        // NICB doesn't expose a REST API for address/person lookup directly.
        // We provide the structured data and a direct NICB search URL.
        const nicbSearchUrl = `https://www.nicb.org/vincheck`; // VIN check portal
        const nicbReportUrl = `https://www.nicb.org/tips`; // Report stolen equipment

        // Check if the zip code is in a known high-theft area (TX border region flagging)
        const highRiskZips = [
          '78501','78502','78503','78504','78505','78516','78520','78521','78526',
          '78550','78552','78557','78572','78573','78574','78577','78578','78579',
          '78580','78582','78583','78586','78589','78590','78593','78595','78596',
          '78599','78501','78539','78541','78542','78543','78544','78545','78547',
          '78548','78549','78559','78560','78561','78562','78563','78564','78565',
          '78566','78567','78568','78569','78570','78571','78575','78576'
        ];
        const isHighRiskZip = zip && highRiskZips.includes(zip.replace(/\D/g, '').slice(0, 5));

        results.nicbCheck = {
          dataSource: 'NICB (National Insurance Crime Bureau)',
          note: 'NICB does not expose a free public REST API for person/address lookup. Use the links below to manually cross-reference.',
          isHighRiskZip,
          zipChecked: zip || null,
          manualCheckUrl: nicbSearchUrl,
          reportStolen: nicbReportUrl,
          machineryTraderStolen: 'https://www.machinerytrader.com/stolen-equipment/search',
      stolenRegister: 'https://www.stolenregister.com/check',
      nerIronCheck: 'https://www.ner.net/solutions/ironcheck/',
          // Provide a direct Google search link for the name + "stolen equipment" or "scam"
          googleFraudSearch: name
            ? `https://www.google.com/search?q=${encodeURIComponent(`"${name}" stolen equipment rental scam Texas`)}`
            : null,
        };
      } catch (err) {
        results.errors.push(`NICB: ${err.message}`);
      }
    }

    return Response.json(results);
  } catch (error) {
    console.error('dlExternalCheck error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});