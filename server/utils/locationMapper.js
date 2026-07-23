// ─────────────────────────────────────────────────────────────────────────────
// locationMapper.js
// Given an array of stored location objects (from LocationPicker),
// returns the correct targeting format for each ad platform.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract Meta geo_locations targeting from locations array.
 * Returns: { countries: ['CM'], cities: [{ key: '1967538' }] }
 */
function toMetaLocations(locations = []) {
  const countries = [];
  const cities    = [];
  const regions   = [];

  for (const loc of locations) {
    const m = loc.platforms?.meta;
    if (!m) continue;
    if (m.type === 'country') {
      countries.push(m.key);
    } else if (m.type === 'city') {
      cities.push({ key: m.key });
    } else if (m.type === 'region') {
      regions.push({ key: m.key });
    }
  }

  const result = {};
  if (countries.length) result.countries = countries;
  if (cities.length)    result.cities    = cities;
  if (regions.length)   result.regions   = regions;
  return result;
}

/**
 * Extract Google Ads geo_target_constants from locations array.
 * Returns: ['resourceNames/geoTargetConstants/2120', ...]
 */
function toGoogleLocations(locations = []) {
  return locations
    .map(loc => loc.platforms?.google?.criterionId)
    .filter(Boolean)
    .map(id => `geoTargetConstants/${id}`);
}

/**
 * Extract TikTok location codes from locations array.
 * Returns: ['CM', 'NG', ...]  (ISO country codes)
 */
function toTikTokLocations(locations = []) {
  const codes = new Set(
    locations.map(loc => loc.platforms?.tiktok).filter(Boolean)
  );
  return [...codes];
}

/**
 * Extract LinkedIn geo URNs from locations array.
 * Returns: ['urn:li:geo:105646813', ...]
 */
function toLinkedInLocations(locations = []) {
  return locations
    .map(loc => loc.platforms?.linkedin)
    .filter(Boolean);
}

/**
 * Extract Twitter WOEIDs from locations array.
 * Returns: [23424785, ...]
 */
function toTwitterLocations(locations = []) {
  return locations
    .map(loc => loc.platforms?.twitter?.woeid)
    .filter(Boolean);
}

/**
 * Extract Snapchat country codes from locations array.
 * Returns: ['CM', 'NG', ...]
 */
function toSnapchatLocations(locations = []) {
  const codes = new Set(
    locations.map(loc => loc.platforms?.snapchat).filter(Boolean)
  );
  return [...codes];
}

/**
 * Master function — given a platform name and locations array,
 * returns the correct format for that platform.
 */
function getLocationForPlatform(platform, locations = []) {
  switch (platform) {
    case 'meta':     return toMetaLocations(locations);
    case 'google':   return toGoogleLocations(locations);
    case 'tiktok':   return toTikTokLocations(locations);
    case 'linkedin': return toLinkedInLocations(locations);
    case 'twitter':  return toTwitterLocations(locations);
    case 'snapchat': return toSnapchatLocations(locations);
    default:         return [];
  }
}

module.exports = {
  getLocationForPlatform,
  toMetaLocations,
  toGoogleLocations,
  toTikTokLocations,
  toLinkedInLocations,
  toTwitterLocations,
  toSnapchatLocations,
};
