const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role:   { type: String, enum: ['owner', 'admin', 'manager', 'viewer'], default: 'viewer' },
  joinedAt: { type: Date, default: Date.now },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const organizationSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  slug:     { type: String, unique: true },
  ownerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:  [memberSchema],
  plan:     { type: String, enum: ['starter', 'pro', 'agency'], default: 'starter' },
  settings: {
    currency:  { type: String, default: 'USD' },
    timezone:  { type: String, default: 'UTC' },
    logo:      String
  },
  pendingInvites: [{
    email:     String,
    role:      String,
    token:     String,
    expiresAt: Date
  }]
}, { timestamps: true });

module.exports = mongoose.model('Organization', organizationSchema);
