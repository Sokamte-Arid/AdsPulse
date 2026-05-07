const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:      { type: String, enum: ['warning', 'success', 'info', 'error'], default: 'info' },
  category:  { type: String, enum: ['budget', 'campaign', 'platform', 'report', 'system', 'milestone'], default: 'system' },
  title:     { type: String, required: true },
  message:   { type: String, required: true },
  read:      { type: Boolean, default: false },
  link:      String,   // optional deep-link e.g. /campaigns/abc
  meta:      Object,   // extra data e.g. { platform:'meta', campaignId:'...' }
  expiresAt: Date
}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
