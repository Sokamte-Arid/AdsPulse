const mongoose = require('mongoose');

const variationSchema = new mongoose.Schema({
  name:        { type: String, required: true }, // e.g. "Variation A"
  label:       { type: String },                 // user's custom label
  headline:    { type: String },
  description: { type: String },
  callToAction:{ type: String },
  imageUrl:    { type: String },
  videoUrl:    { type: String },
  mediaPublicId:{ type: String },
  budgetPercent:{ type: Number, default: 25 },   // % of total budget
  // Results
  impressions: { type: Number, default: 0 },
  clicks:      { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  spend:       { type: Number, default: 0 },
  reach:       { type: Number, default: 0 },
  ctr:         { type: Number, default: 0 },
  cpc:         { type: Number, default: 0 },
  // Status
  platformAdId:{ type: String },
  status:      { type: String, enum:['active','paused','winner','loser'], default:'active' },
});

const abTestSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref:'User', required:true, index:true },
  campaignId:  { type: mongoose.Schema.Types.ObjectId, ref:'Campaign' },

  name:        { type: String, required: true },
  objective:   { type: String, default: 'conversions' },
  platforms:   [{ type: String }],
  totalBudget: { type: Number, default: 0 },
  currency:    { type: String, default: 'USD' },
  budgetType:  { type: String, enum:['daily','lifetime'], default:'daily' },
  splitType:   { type: String, enum:['equal','custom'], default:'equal' },

  // Test duration
  startDate:   { type: Date },
  endDate:     { type: Date },
  durationDays:{ type: Number, default: 7 },

  // Variations (2-4)
  variations:  [variationSchema],

  // Status
  status:      { type: String, enum:['draft','active','paused','completed','cancelled'], default:'draft' },
  winnerId:    { type: mongoose.Schema.Types.ObjectId },
  winnerIndex: { type: Number },

  // AI Analysis
  aiAnalysis:  { type: String },
  aiAnalyzedAt:{ type: Date },

  // Targeting
  targeting: {
    ageMin:    { type: Number, default: 18 },
    ageMax:    { type: Number, default: 65 },
    gender:    { type: String, default: 'all' },
    locations: [String],
    interests: [String],
  },

  notes: { type: String },

}, { timestamps: true });

module.exports = mongoose.model('ABTest', abTestSchema);