const mongoose = require('mongoose');

const mediaFileSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', index: true },

  name:        { type: String, required: true },
  type:        { type: String, enum: ['image','video'], required: true },
  mimeType:    String,
  size:        Number,        // bytes

  // URLs
  url:          { type: String, required: true },   // full URL (Cloudinary or local)
  thumbnailUrl: String,                              // auto-generated thumbnail

  // Cloudinary specific
  cloudinaryPublicId: String,
  storage:     { type: String, enum: ['cloudinary','local'], default: 'local' },

  // Meta
  tags:   [String],
  alt:    String,
  width:  Number,
  height: Number,

}, { timestamps: true });

module.exports = mongoose.model('MediaFile', mediaFileSchema);
