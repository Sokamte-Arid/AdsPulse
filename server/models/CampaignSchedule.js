const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  campaignId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true, index: true },

  // Type of scheduled action
  type: {
    type: String,
    enum: [
      'start',          // auto-start campaign at date/time
      'stop',           // auto-stop campaign at date/time
      'pause',          // auto-pause at date/time
      'resume',         // auto-resume at date/time
      'budget_change',  // change budget at date/time
      'recurring',      // run on a recurring schedule (daily, weekly)
    ],
    required: true
  },

  // When to execute
  scheduledAt:  { type: Date, required: true },   // exact datetime to run
  timezone:     { type: String, default: 'UTC' },

  // For recurring schedules
  recurrence: {
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }],  // 0=Sun, 1=Mon...
    time:       String,   // HH:MM format e.g. "08:00"
    endDate:    Date,     // stop recurring after this date
  },

  // What to do (for budget_change)
  action: {
    budget:      Number,
    budgetType:  { type: String, enum: ['daily', 'lifetime'] },
    platform:    String,   // specific platform or 'all'
    status:      String,   // active / paused
  },

  // Execution state
  status:      { type: String, enum: ['pending', 'executed', 'failed', 'cancelled', 'skipped'], default: 'pending' },
  executedAt:  Date,
  errorMessage:String,
  nextRunAt:   Date,   // for recurring schedules

  // Notes
  label:       String,   // e.g. "Black Friday campaign start"
  notes:       String,
}, { timestamps: true });

scheduleSchema.index({ scheduledAt: 1, status: 1 });
scheduleSchema.index({ nextRunAt: 1, status: 1 });

module.exports = mongoose.model('CampaignSchedule', scheduleSchema);
