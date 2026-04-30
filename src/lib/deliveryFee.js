/**
 * Calculate delivery or pickup fee from a DeliveryMatrix record and a zip code.
 * Returns the fee amount in USD.
 */
export function calcDeliveryFee(matrix, customerZip) {
  if (!matrix) return 0;

  const laborRate = matrix.laborRatePerManHour || 0;
  const truckRate = matrix.truckRatePerHour || 0;
  const minimumCharge = matrix.minimumCharge || 0;
  const zones = matrix.zones || [];

  // Try to match a zone by zip prefix
  let matchedZone = null;
  if (customerZip) {
    matchedZone = zones.find(z =>
      (z.zipPrefixes || []).some(prefix => customerZip.startsWith(prefix))
    );
  }

  // If zone has a flat rate, use it directly
  if (matchedZone?.flatRate != null) {
    return matchedZone.flatRate;
  }

  const driveMinutes = matchedZone?.estimatedMinutes ?? 30; // default 30 min if no zone
  const crewSize = matchedZone?.crewSize ?? matrix.defaultCrewSize ?? 2;
  const trucks = matchedZone?.trucks ?? matrix.defaultTrucks ?? 1;

  // Formula: ((laborRate × crewSize) + (truckRate × trucks)) × (roundTripHours)
  const roundTripHours = (driveMinutes * 2) / 60;
  const fee = ((laborRate * crewSize) + (truckRate * trucks)) * roundTripHours;

  return Math.max(fee, minimumCharge);
}