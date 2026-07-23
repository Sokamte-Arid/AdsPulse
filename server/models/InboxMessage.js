const mongoose = require('mongoose');

const inboxMessageSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  platform:     { type: String, enum: ['meta','instagram','twitter','linkedin','youtube','tiktok'], required: true },

  // External IDs
  externalId:   { type: String, required: true },   // ID from the platform
  threadId:     { type: String },                    // parent post/thread ID
  parentId:     { type: String },                    // parent comment ID (for nested)

  // Sender info
  senderId:     { type: String },
  senderName:   { type: String },
  senderAvatar: { type: String },

  // Content
  type:         { type: String, enum: ['comment','message','mention','reply'], default: 'comment' },
  message:      { type: String, required: true },
  attachments:  [{ type: String }],

  // Post context
  postId:       { type: String },
  postMessage:  { type: String },
  postUrl:      { type: String },
  campaignId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  campaignName: { type: String },

  // Status
  status:       { type: String, enum: ['unread','read','replied','archived'], default: 'unread' },
  sentiment:    { type: String, enum: ['positive','neutral','negative'], default: 'neutral' },

  // Reply
  reply:        { type: String },
  repliedAt:    { type: Date },

  // DM sent from comment
  dmSent:   { type: Boolean, default: false },
  dmText:   { type: String },
  dmSentAt: { type: Date },

  // Original timestamp from platform
  platformCreatedAt: { type: Date },

}, { timestamps: true });

// Compound index to prevent duplicates
inboxMessageSchema.index({ userId: 1, platform: 1, externalId: 1 }, { unique: true });

module.exports = mongoose.model('InboxMessage', inboxMessageSchema);