const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  action:     { type: String, required: true },  // e.g. 'campaign.create', 'platform.connect', '2fa.enable'
  resource:   String,   // e.g. 'campaign', 'platform', 'user'
  resourceId: String,
  details:    Object,   // what changed
  ip:         String,
  userAgent:  String,
  success:    { type: Boolean, default: true }
}, { timestamps: true });

auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
