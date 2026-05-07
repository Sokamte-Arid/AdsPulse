const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const platformConnectionSchema = new mongoose.Schema({
  platform: { type: String, required: true },
  accountId: String,
  accountName: String,
  accessToken: String,          // encrypted in production
  appId: String,
  appSecret: String,
  refreshToken: String,
  tokenExpiry: Date,
  developerToken: String,
  customerId: String,
  advertiserId: String,
  status: { type: String, enum: ['connected', 'error', 'expired'], default: 'connected' },
  lastSync: Date,
  errorMessage: String,
  connectedAt: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role:     { type: String, enum: ['admin', 'manager', 'viewer'], default: 'manager' },

  // ── 2FA ──────────────────────────────────────────────────────
  twoFactorEnabled:  { type: Boolean, default: false },
  twoFactorSecret:   { type: String },          // TOTP secret (authenticator app)
  twoFactorMethod:   { type: String, enum: ['totp', 'email'], default: 'totp' },
  emailOTP:          { type: String },           // temp email OTP
  emailOTPExpiry:    { type: Date },
  twoFactorVerified: { type: Boolean, default: false }, // has user completed 2FA setup

  // ── Platform connections ──────────────────────────────────────
  connectedPlatforms: [platformConnectionSchema],

  preferences: {
    currency:         { type: String, default: 'USD' },
    timezone:         { type: String, default: 'UTC' },
    defaultPlatforms: [String],
    notifications:    { type: Boolean, default: true }
  },
  avatar: String,
  lastLogin: Date
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) { next(err); }
});

module.exports = mongoose.model('User', userSchema);
