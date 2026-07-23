// ─────────────────────────────────────────────────────────────────────────────
// ADD THIS LINE to server/index.js where other routes are registered:
// ─────────────────────────────────────────────────────────────────────────────

const locationRoutes = require('./routes/locations');
app.use('/api/locations', locationRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// It should sit alongside your other route registrations, e.g.:
//
// app.use('/api/auth',         authRoutes);
// app.use('/api/campaigns',    campaignRoutes);
// app.use('/api/analytics',    analyticsRoutes);
// app.use('/api/integrations', integrationRoutes);
// app.use('/api/locations',    locationRoutes);   ← ADD THIS
// ─────────────────────────────────────────────────────────────────────────────
