const express   = require('express');
const router    = express.Router();
const auth      = require('../middleware/auth');
const locations = require('../data/geoLocations');

// ── GET /api/locations/search?q=doua ─────────────────────────────────────────
router.get('/search', auth, (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q || q.length < 2) return res.json([]);

  // Normalize accents so "Yaounde" matches "Yaoundé"
  const normalize = str => str?.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim() || '';

  const qNorm = normalize(q);

  const results = locations
    .filter(loc => {
      const nameMatch    = normalize(loc.name).includes(qNorm);
      const countryMatch = normalize(loc.country).includes(qNorm);
      const regionMatch  = normalize(loc.region).includes(qNorm);
      return nameMatch || countryMatch || regionMatch;
    })
    .slice(0, 12) // max 12 suggestions
    .map(loc => ({
      id:          loc.meta?.key || loc.iso,
      label:       loc.country ? `${loc.name}, ${loc.country}` : loc.name,
      name:        loc.name,
      country:     loc.country || loc.name,
      type:        loc.type,
      region:      loc.region,
      iso:         loc.iso,
      // Platform-specific IDs
      platforms: {
        meta:     loc.meta,
        google:   loc.google,
        tiktok:   loc.tiktok,
        linkedin: loc.linkedin,
        twitter:  loc.twitter,
        snapchat: loc.snapchat,
      }
    }));

  res.json(results);
});

// ── GET /api/locations/all — full list grouped by region ─────────────────────
router.get('/all', auth, (req, res) => {
  const grouped = {};
  locations.forEach(loc => {
    if (!grouped[loc.region]) grouped[loc.region] = [];
    grouped[loc.region].push({
      id:      loc.meta?.key || loc.iso,
      label:   loc.country ? `${loc.name}, ${loc.country}` : loc.name,
      name:    loc.name,
      country: loc.country || loc.name,
      type:    loc.type,
      iso:     loc.iso,
      platforms: {
        meta:     loc.meta,
        google:   loc.google,
        tiktok:   loc.tiktok,
        linkedin: loc.linkedin,
        twitter:  loc.twitter,
        snapchat: loc.snapchat,
      }
    });
  });
  res.json(grouped);
});

module.exports = router;