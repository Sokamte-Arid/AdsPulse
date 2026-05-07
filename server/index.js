require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const mongoose = require('mongoose');
const path    = require('path');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/campaigns',       require('./routes/campaigns'));
app.use('/api/analytics',       require('./routes/analytics'));
app.use('/api/platforms',       require('./routes/platforms'));
app.use('/api/integrations',    require('./routes/integrations'));
app.use('/api/notifications',   require('./routes/notifications'));
app.use('/api/invoices',        require('./routes/invoices'));
app.use('/api/audit',           require('./routes/audit'));
app.use('/api/media',           require('./routes/media'));
app.use('/api/organization',    require('./routes/organization'));
app.use('/api/payment-methods', require('./routes/paymentMethods'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const states = { 0:'disconnected', 1:'connected', 2:'connecting', 3:'disconnecting' };
  res.json({ status:'ok', db: states[mongoose.connection.readyState] || 'unknown', timestamp: new Date(), version: '10.0.0' });
});

app.use((req, res) => res.status(404).json({ message: `Route ${req.method} ${req.path} not found` }));
app.use((err, req, res, next) => { console.error('[Error]', err); res.status(500).json({ message: err.message }); });

// ── Database ──────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ads_manager';
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    const { startCronJobs } = require('./utils/cronJobs');
    startCronJobs();
  })
  .catch(err => console.error('❌ MongoDB FAILED:', err.message));

mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));
mongoose.connection.on('reconnected',  () => console.log('✅ MongoDB reconnected'));

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 AdsPulse server → http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
