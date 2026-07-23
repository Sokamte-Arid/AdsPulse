require('dotenv').config();
const express  = require('express');
const cors      = require('cors');
const mongoose  = require('mongoose');
const rateLimit = require('express-rate-limit');
const helmet    = require('helmet');
const path     = require('path');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Rate limiters ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many accounts created from this IP. Please try again later.' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'AI request limit reached (20/hour). Please wait before making more AI requests.' },
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
});

const syncLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Sync limit reached (10/hour). Please wait before syncing again.' },
});

const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Export limit reached (30/hour). Please wait before exporting again.' },
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth/login',               authLimiter);
app.use('/api/auth/forgot-password',     authLimiter);
app.use('/api/auth/verify-2fa',          authLimiter);
app.use('/api/auth/2fa/resend-otp',      authLimiter);
app.use('/api/auth/verify-reset-token',  authLimiter);
app.use('/api/auth/reset-password',      authLimiter);
app.use('/api/auth/register',            registerLimiter);
app.use('/api/auth/resend-verification', registerLimiter);
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/auth',            require('./routes/passwordReset'));
app.use('/api/billing',         require('./routes/billing'));
app.use('/api/stripe',          require('./routes/stripe'));
app.use('/api/locations',       require('./routes/locations'));
app.use('/api/campaigns',       require('./routes/campaigns'));
app.use('/api/export',          exportLimiter, require('./routes/export'));
app.use('/api/abtests',         require('./routes/abtests'));
app.use('/api/analytics',       require('./routes/analytics'));
app.use('/api/platforms',       require('./routes/platforms'));
app.use('/api/integrations',    syncLimiter, require('./routes/integrations'));
app.use('/api/notifications',   require('./routes/notifications'));
app.use('/api/invoices',        require('./routes/invoices'));
app.use('/api/audit',           require('./routes/audit'));
app.use('/api/media',           require('./routes/media'));
app.use('/api/organization',    require('./routes/organization'));
app.use('/api/payment-methods', require('./routes/paymentMethods'));
app.use('/api/oauth',           require('./routes/oauth'));
app.use('/api/profile',         require('./routes/profile'));
app.use('/api/schedules',       require('./routes/schedules'));
app.use('/api/cinetpay',        require('./routes/cinetpay'));
app.use('/api/posts',           require('./routes/posts'));
app.use('/api/post-history',    require('./routes/postHistory'));
app.use('/api/insights',        aiLimiter, require('./routes/insights'));
app.use('/api/revenue',         require('./routes/revenue'));
app.use('/api/inbox',           require('./routes/inbox'));
app.use('/api/whatsapp',        require('./routes/whatsapp'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const states = { 0:'disconnected', 1:'connected', 2:'connecting', 3:'disconnecting' };
  const { isConfigured } = require('./utils/cloudinary');
  res.json({
    status:    'ok',
    db:        states[mongoose.connection.readyState] || 'unknown',
    cloudinary:isConfigured(),
    timestamp: new Date(),
    version:   '16.0.0'
  });
});

app.use((req, res) => res.status(404).json({ message: `Route ${req.method} ${req.path} not found` }));
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(err.status || 500).json({ message: 'An unexpected error occurred. Please try again.' });
});

// ── Database ──────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ads_manager';
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    const { startCronJobs } = require('./utils/cronJobs');
    startCronJobs();
    const { isConfigured } = require('./utils/cloudinary');
    if (isConfigured()) console.log('Cloudinary configured (' + process.env.CLOUDINARY_CLOUD_NAME + ')');
    else console.warn('Cloudinary not configured');
    if (process.env.CINETPAY_SITE_ID) console.log('CinetPay configured');
  })
  .catch(err => console.error('MongoDB FAILED:', err.message));

mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected',  () => console.log('MongoDB reconnected'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('AdsPulse server running on port ' + PORT));