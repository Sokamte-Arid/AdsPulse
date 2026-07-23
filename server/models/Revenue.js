const mongoose = require('mongoose');

const revenueSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  campaignId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', index: true },
  campaignName: { type: String },
  platform:     { type: String, enum: ['meta','google','tiktok','linkedin','twitter','snapchat','youtube','direct','other'], default: 'other' },

  // Revenue entry
  amount:       { type: Number, required: true, min: 0 },
  currency:     { type: String, default: 'USD' },
  source:       { type: String, enum: ['sales','leads','subscriptions','app_installs','other'], default: 'sales' },
  description:  { type: String },

  // Attribution
  conversions:  { type: Number, default: 0 },
  period: {
    start: { type: Date },
    end:   { type: Date },
  },

  // Cached spend at time of entry (for ROI calculation)
  adSpend:      { type: Number, default: 0 },

}, { timestamps: true });

// Virtual: ROI
revenueSchema.virtual('roi').get(function () {
  if (!this.adSpend || this.adSpend === 0) return null;
  return ((this.amount - this.adSpend) / this.adSpend) * 100;
});

// Virtual: ROAS
revenueSchema.virtual('roas').get(function () {
  if (!this.adSpend || this.adSpend === 0) return null;
  return this.amount / this.adSpend;
});

revenueSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Revenue', revenueSchema);