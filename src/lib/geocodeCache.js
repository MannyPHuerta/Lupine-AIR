/**
 * Geocode cache using localStorage.
 * Key: "address, city, state zip"
 * Value: { lat, lng }
 */

const CACHE_KEY = 'lupine_geocode_cache';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // storage full — ignore
  }
}

function cacheKey(address, city, state, zip) {
  return `${address}|${city}|${state}|${zip}`.toLowerCase();
}

export function getCached(address, city, state, zip) {
  const cache = loadCache();
  const entry = cache[cacheKey(address, city, state, zip)];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) return null;
  return { lat: entry.lat, lng: entry.lng };
}

export function setCached(address, city, state, zip, coords) {
  const cache = loadCache();
  cache[cacheKey(address, city, state, zip)] = { ...coords, ts: Date.now() };
  saveCache(cache);
}