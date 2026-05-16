const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role:     { type: String, enum: ['owner','admin','manager','viewer'], default: 'manager' },

  // Email Verification
  emailVerified:     { type: Boolean, default: false },
  emailVerifyToken:  String,
  emailVerifyExpiry: Date,

  // 2FA
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorMethod:  { type: String, enum: ['totp','email'], default: 'totp' },
  twoFactorSecret:  String,
  emailOTP:         String,
  emailOTPExpiry:   Date,

  // Password Reset
  passwordResetToken:  String,
  passwordResetExpiry: Date,

  // Stripe
  stripeCustomerId: String,

  // Platform Connections
  connectedPlatforms: [{
    platform:     String,
    accountId:    String,
    accountName:  String,
    accessToken:  String,
    refreshToken: String,
    tokenExpiry:  Date,
    appId:        String,
    appSecret:    String,
    advertiserId: String,
    developerToken: String,
    customerId:   String,
    status:       { type: String, enum: ['connected','disconnected','error'], default: 'connected' },
    errorMessage: String,
    lastSync:     Date,
    connectedAt:  { type: Date, default: Date.now }
  }],

  // Preferences
  preferences: {
    notifications: { type: Boolean, default: true },
    currency:      { type: String,  default: 'USD' },
    timezone:      { type: String,  default: 'UTC' }
  },

  lastLogin: Date,
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
