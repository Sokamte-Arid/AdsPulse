const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role:      { type: String, enum: ['owner', 'admin', 'manager', 'viewer'], default: 'viewer' },
  joinedAt:  { type: Date, default: Date.now },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const pendingInviteSchema = new mongoose.Schema({
  email:     { type: String, required: true },
  role:      { type: String, enum: ['admin', 'manager', 'viewer'], default: 'viewer' },
  token:     { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  invitedAt: { type: Date, default: Date.now }
}, { _id: false });

const organizationSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  slug:    { type: String, unique: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // No limit — can have unlimited members
  members: [memberSchema],

  // No limit — can have unlimited pending invites
  pendingInvites: [pendingInviteSchema],

  plan: {
    type: String,
    enum: ['starter', 'pro', 'agency'],
    default: 'starter'
  },

  settings: {
    currency: { type: String, default: 'USD'  },
    timezone: { type: String, default: 'UTC'  },
    logo:     { type: String, default: null   }
  }
}, {
  timestamps: true
});

// Index for fast member lookup
organizationSchema.index({ 'members.userId': 1 });
organizationSchema.index({ 'pendingInvites.token': 1 });
organizationSchema.index({ 'pendingInvites.email': 1 });

module.exports = mongoose.model('Organization', organizationSchema);
