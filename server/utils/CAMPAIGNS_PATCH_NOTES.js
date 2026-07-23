// ─────────────────────────────────────────────────────────────────────────────
// HOW TO WIRE locationMapper INTO YOUR CAMPAIGN PUSH (server/routes/campaigns.js)
// ─────────────────────────────────────────────────────────────────────────────
//
// 1. At the top of campaigns.js add:
//
const { getLocationForPlatform } = require('../utils/locationMapper');

// 2. When building the Meta adset targeting object, replace the old
//    plain-text locations with:
//
//    BEFORE (broken):
//    geo_locations: { countries: campaign.targeting?.locations || [] }
//
//    AFTER (correct):
const metaGeoLocations = getLocationForPlatform('meta', campaign.targeting?.locations || []);
// metaGeoLocations → { countries: ['CM'], cities: [{ key: '1967538' }] }
// Use it in the Meta adset body:
const adsetBody = {
  // ...other fields...
  targeting: {
    geo_locations:    metaGeoLocations,
    age_min:          campaign.targeting?.ageMin  || 18,
    age_max:          campaign.targeting?.ageMax  || 65,
    genders:          campaign.targeting?.genders || [],
  }
};

// 3. For Google Ads:
const googleLocationIds = getLocationForPlatform('google', campaign.targeting?.locations || []);
// googleLocationIds → ['geoTargetConstants/2120']

// 4. For TikTok:
const tiktokCountries = getLocationForPlatform('tiktok', campaign.targeting?.locations || []);
// tiktokCountries → ['CM']

// 5. For LinkedIn:
const linkedinGeoUrns = getLocationForPlatform('linkedin', campaign.targeting?.locations || []);
// linkedinGeoUrns → ['urn:li:geo:105646813']

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: The Campaign model's targeting.locations field now stores
// the full location objects (not plain strings). Make sure the Campaign
// schema accepts this:
//
// targeting: {
//   locations: [{ type: mongoose.Schema.Types.Mixed }],  // ← change from [String]
//   ...
// }
// ─────────────────────────────────────────────────────────────────────────────
