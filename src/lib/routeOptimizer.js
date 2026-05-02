/**
 * Nearest-neighbor route optimization.
 * Sorts stops by straight-line distance from each previous stop.
 * Zero cost, no API key required.
 */

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 3958.8; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * @param {Array} stops - each must have { id, lat, lng, ...rest }
 * @param {{ lat, lng } | null} origin - starting point (driver location or first stop)
 * @returns {Array} stops sorted by nearest-neighbor
 */
export function optimizeRoute(stops, origin = null) {
  if (stops.length <= 1) return stops;

  const remaining = [...stops];
  const ordered = [];

  let current = origin || { lat: remaining[0].lat, lng: remaining[0].lng };

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    remaining.forEach((stop, idx) => {
      const dist = haversineKm(current.lat, current.lng, stop.lat, stop.lng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = idx;
      }
    });

    const next = remaining.splice(nearestIdx, 1)[0];
    next._distFromPrev = Math.round(nearestDist * 10) / 10; // km, 1 decimal
    ordered.push(next);
    current = { lat: next.lat, lng: next.lng };
  }

  return ordered;
}