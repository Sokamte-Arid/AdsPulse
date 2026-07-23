const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const platformConnectionSchema = new mongoose.Schema({
  platform:       { type: String, required: true },
  accountId:      String,
  accountName:    String,
  accessToken:    String,
  appId:          String,
  appSecret:      String,
  refreshToken:   String,
  tokenExpiry:    Date,
  developerToken: String,
  customerId:     String,
  advertiserId:   String,
  status:         { type: String, enum: ['connected','error','expired'], default: 'connected' },
  lastSync:       Date,
  errorMessage:   String,
  passwordResetToken:   String,
  passwordResetExpires: Date,
  connectedAt:    { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role:     { type: String, enum: ['admin','manager','viewer'], default: 'manager' },

  // ── 2FA ─────────────────────────────────────────────────────────────────────
  twoFactorEnabled:  { type: Boolean, default: false },
  twoFactorSecret:   String,
  twoFactorMethod:   { type: String, enum: ['totp','email'], default: 'totp' },
  emailOTP:          String,
  emailOTPExpiry:    Date,
  twoFactorVerified: { type: Boolean, default: false },
  emailVerified:     { type: Boolean, default: false },
  emailVerifyToken:  String,
  resetPasswordToken: String,
  resetPasswordExpiry: Date,

  // ── Platform connections ──────────────────────────────────────────────────
  connectedPlatforms: [platformConnectionSchema],

  // ── Preferences ──────────────────────────────────────────────────────────
  preferences: {
    currency:         { type: String, default: 'USD' },
    timezone:         { type: String, default: 'UTC' },
    defaultPlatforms: [String],
    notifications:    { type: Boolean, default: true }
  },

  // ── Profile ───────────────────────────────────────────────────────────────
  avatar:   String,   // Cloudinary URL — user profile photo
  bio:      String,
  phone:    String,
  lastLogin: Date,

  // ── Dashboard Brand Banner ────────────────────────────────────────────────
  // Displayed at the top of the dashboard to give the company's atmosphere
  brand: {
    companyName:    String,             // e.g. "Acme Marketing Agency"
    companyLogo:    String,             // Cloudinary URL — company logo
    coverImage:     String,             // Cloudinary URL — wide cover/hero photo
    welcomeMessage: String,             // e.g. "Welcome back! Let's grow your business."
    tagline:        String,             // e.g. "Performance Marketing, Simplified"
  }

}, { timestamps: true });

const { encrypt, decrypt } = require('../utils/tokenCrypto');

// ── Auto-encrypt platform tokens before saving ────────────────────────────────
userSchema.pre('save', async function(next) {
  // Hash password if modified
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (err) { return next(err); }
  }

  // Encrypt any platform access tokens that were modified
  if (this.isModified('connectedPlatforms')) {
    this.connectedPlatforms = this.connectedPlatforms.map(p => {
      if (p.accessToken)    p.accessToken    = encrypt(p.accessToken);
      if (p.appSecret)      p.appSecret      = encrypt(p.appSecret);
      if (p.developerToken) p.developerToken = encrypt(p.developerToken);
      return p;
    });
  }

  next();
});

// ── Auto-decrypt platform tokens after loading from DB ────────────────────────
userSchema.post('find',    decryptTokensInDocs);
userSchema.post('findOne', decryptTokensInDoc);
userSchema.post('findOneAndUpdate', decryptTokensInDoc);

function decryptTokensInDocs(docs) {
  if (!docs) return;
  docs.forEach(decryptTokensInDoc);
}

function decryptTokensInDoc(doc) {
  if (!doc?.connectedPlatforms) return;
  doc.connectedPlatforms = doc.connectedPlatforms.map(p => {
    try {
      if (p.accessToken)    p.accessToken    = decrypt(p.accessToken);
      if (p.appSecret)      p.appSecret      = decrypt(p.appSecret);
      if (p.developerToken) p.developerToken = decrypt(p.developerToken);
    } catch (e) {
      console.error('[Token Decrypt] Failed for platform', p.platform, e.message);
    }
    return p;
  });
}

userSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);


// const mongoose = require('mongoose');
// const bcrypt   = require('bcryptjs');

// const platformConnectionSchema = new mongoose.Schema({
//   platform:       { type: String, required: true },
//   accountId:      String,
//   accountName:    String,
//   accessToken:    String,
//   appId:          String,
//   appSecret:      String,
//   refreshToken:   String,
//   tokenExpiry:    Date,
//   developerToken: String,
//   customerId:     String,
//   advertiserId:   String,
//   status:         { type: String, enum: ['connected','error','expired'], default: 'connected' },
//   lastSync:       Date,
//   errorMessage:   String,
//   connectedAt:    { type: Date, default: Date.now }
// }, { _id: false });

// const userSchema = new mongoose.Schema({
//   name:     { type: String, required: true, trim: true },
//   email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
//   password: { type: String, required: true, minlength: 6 },
//   role:     { type: String, enum: ['owner','admin','manager','viewer'], default: 'manager' },

//   // ── Email Verification ──────────────────────────────────────────────────────
//   emailVerified:     { type: Boolean, default: false },
//   emailVerifyToken:  String,
//   emailVerifyExpiry: Date,

//   // ── 2FA ──────────────────────────────────────────────────────────────────────
//   twoFactorEnabled:  { type: Boolean, default: false },
//   twoFactorMethod:   { type: String, enum: ['totp','email'], default: 'totp' },
//   twoFactorSecret:   String,
//   emailOTP:          String,
//   emailOTPExpiry:    Date,
//   twoFactorVerified: { type: Boolean, default: false },

//   // ── Password Reset ───────────────────────────────────────────────────────────
//   passwordResetToken:  String,
//   passwordResetExpiry: Date,

//   // ── Platform connections ──────────────────────────────────────────────────────
//   connectedPlatforms: [platformConnectionSchema],

//   // ── Preferences ────────────────────────────────────────────────────────────
//   preferences: {
//     currency:         { type: String, default: 'USD' },
//     timezone:         { type: String, default: 'UTC' },
//     defaultPlatforms: [String],
//     notifications:    { type: Boolean, default: true }
//   },

//   // ── Profile ───────────────────────────────────────────────────────────────
//   avatar: String,
//   bio:    String,
//   phone:  String,
//   lastLogin: Date,

// }, { timestamps: true });

// // ── Hash password before saving ───────────────────────────────────────────────
// userSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) return next();
//   try {
//     const salt = await bcrypt.genSalt(12);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
//   } catch (err) { next(err); }
// });

// module.exports = mongoose.model('User', userSchema);