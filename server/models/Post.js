const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null },

  // Content
  caption:    { type: String, default: '' },
  mediaUrls:  [{ url: String, type: { type: String, enum: ['image','video'] }, publicId: String }],
  link:       String,
  hashtags:   [String],

  // Platforms
  platforms:  [{
    platform:   { type: String, enum: ['meta','instagram','linkedin','twitter','tiktok','snapchat','youtube'] },
    status:     { type: String, enum: ['pending','published','failed','scheduled'], default: 'pending' },
    postId:     String,
    postUrl:    String,
    error:      String,
    publishedAt:Date,
    // Engagement
    likes:       { type: Number, default: 0 },
    comments:    { type: Number, default: 0 },
    shares:      { type: Number, default: 0 },
    reach:       { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
  }],

  // Status
  status:      { type: String, enum: ['draft','scheduled','published','failed','partially_published'], default: 'draft' },
  scheduledAt: Date,
  publishedAt: Date,
  timezone:    { type: String, default: 'UTC' },

  // Post type
  postType:  { type: String, enum: ['post','reel','story','short','video'], default: 'post' },

  // Platform-specific fields
  title:       String,   // YouTube title
  tags:        [String], // YouTube tags

  // Meta
  label:    String,
  notes:    String,
  isAd:     { type: Boolean, default: false },
  imported: { type: Boolean, default: false },  // true = imported from platform, not created in AdsPulse

}, { timestamps: true });

postSchema.index({ userId: 1, scheduledAt: 1 });
postSchema.index({ userId: 1, status: 1 });
postSchema.index({ userId: 1, 'platforms.postId': 1 });
postSchema.index({ userId: 1, imported: 1 });

module.exports = mongoose.model('Post', postSchema);