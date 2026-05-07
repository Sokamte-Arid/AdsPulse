const mongoose = require('mongoose');

const mediaFileSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  filename:   { type: String, required: true },
  originalName: String,
  mimetype:   String,
  size:       Number,       // bytes
  url:        String,       // served URL
  path:       String,       // disk path
  type:       { type: String, enum: ['image', 'video', 'document'], default: 'image' },
  width:      Number,
  height:     Number,
  duration:   Number,       // seconds (video)
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  tags:       [String]
}, { timestamps: true });

module.exports = mongoose.model('MediaFile', mediaFileSchema);
