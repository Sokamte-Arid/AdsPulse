const mongoose = require('mongoose');

const adCreativeSchema = new mongoose.Schema({
  type: { type: String, enum: ['single_image', 'single_video', 'carousel'], required: true },
  headline: String,
  description: String,
  callToAction: String,
  destinationType: { type: String, enum: ['website', 'messenger', 'whatsapp', 'instagram_dm', 'telegram'], default: 'website' },
  destinationUrl: String,
  items: [{
    mediaType: { type: String, enum: ['image', 'video'] },
    mediaUrl: String,
    headline: String,
    description: String,
    link: String
  }]
});

const platformCampaignSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['meta', 'google', 'tiktok', 'twitter', 'linkedin', 'snapchat', 'youtube'],
    required: true
  },
  platformCampaignId: String,
  status: { type: String, enum: ['active', 'paused', 'draft', 'completed', 'rejected'], default: 'draft' },
  budget: { type: Number, default: 0 },
  budgetType: { type: String, enum: ['daily', 'lifetime'], default: 'daily' },
  objective: String,
  targeting: {
    ageMin: { type: Number, default: 18 },
    ageMax: { type: Number, default: 65 },
    genders: [String],
    locations: [String],
    interests: [String],
    languages: [String]
  },
  creative: adCreativeSchema,
  metrics: {
    amountSpent: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    cpm: { type: Number, default: 0 },
    totalClicks: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    cpc: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    totalReach: { type: Number, default: 0 },
    addToCart: { type: Number, default: 0 }
  }
});

const campaignSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  objective: {
    type: String,
    enum: [
      'awareness', 'reach', 'traffic', 'engagement', 'app_installs',
      'video_views', 'lead_generation', 'messages', 'conversions',
      'catalog_sales', 'store_traffic'
    ],
    required: true
  },
  status: { type: String, enum: ['active', 'paused', 'draft', 'completed'], default: 'draft' },
  startDate: Date,
  endDate: Date,
  totalBudget: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  platforms: [platformCampaignSchema],
  tags: [String],
  notes: String,
  metricsHistory: [{
    date: Date,
    platform: String,
    amountSpent: Number,
    impressions: Number,
    cpm: Number,
    totalClicks: Number,
    ctr: Number,
    cpc: Number,
    conversions: Number,
    totalReach: Number,
    addToCart: Number
  }]
}, { timestamps: true });

module.exports = mongoose.model('Campaign', campaignSchema);
