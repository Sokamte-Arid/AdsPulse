const express  = require('express');
const router   = express.Router();
const auth     = require('../middleware/auth');
const CampaignSchedule = require('../models/CampaignSchedule');
const Campaign = require('../models/Campaign');

// ── GET all schedules for a campaign ─────────────────────────────────────────
router.get('/campaign/:campaignId', auth, async (req, res) => {
  try {
    const schedules = await CampaignSchedule.find({
      campaignId: req.params.campaignId,
      userId:     req.user._id
    }).sort({ scheduledAt: 1 });
    res.json(schedules);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET all schedules for user (upcoming) ─────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { status = 'pending', limit = 50 } = req.query;
    const filter = { userId: req.user._id };
    if (status !== 'all') filter.status = status;

    const schedules = await CampaignSchedule.find(filter)
      .populate('campaignId', 'name status platforms')
      .sort({ scheduledAt: 1 })
      .limit(Number(limit));

    res.json(schedules);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── CREATE schedule ───────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { campaignId, type, scheduledAt, timezone, recurrence, action, label, notes } = req.body;

    if (!campaignId || !type || !scheduledAt)
      return res.status(400).json({ message: 'campaignId, type and scheduledAt are required' });

    // Verify campaign belongs to user
    const campaign = await Campaign.findOne({ _id: campaignId, userId: req.user._id });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    // Validate scheduledAt is in the future
    if (new Date(scheduledAt) <= new Date())
      return res.status(400).json({ message: 'Scheduled time must be in the future' });

    // For budget_change, validate budget
    if (type === 'budget_change' && (!action?.budget || action.budget <= 0))
      return res.status(400).json({ message: 'A valid budget amount is required for budget change schedules' });

    const schedule = await CampaignSchedule.create({
      campaignId, userId: req.user._id, type,
      scheduledAt: new Date(scheduledAt),
      timezone: timezone || 'UTC',
      recurrence: recurrence || undefined,
      action: action || undefined,
      label: label || generateLabel(type, scheduledAt, action),
      notes,
      nextRunAt: recurrence ? new Date(scheduledAt) : undefined
    });

    res.status(201).json(schedule);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── UPDATE schedule ───────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const schedule = await CampaignSchedule.findOne({ _id: req.params.id, userId: req.user._id });
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
    if (schedule.status === 'executed') return res.status(400).json({ message: 'Cannot edit an already-executed schedule' });

    const { scheduledAt, type, recurrence, action, label, notes, status } = req.body;

    if (scheduledAt) {
      if (new Date(scheduledAt) <= new Date())
        return res.status(400).json({ message: 'Scheduled time must be in the future' });
      schedule.scheduledAt = new Date(scheduledAt);
      if (schedule.recurrence) schedule.nextRunAt = new Date(scheduledAt);
    }
    if (type)       schedule.type       = type;
    if (recurrence) schedule.recurrence = recurrence;
    if (action)     schedule.action     = action;
    if (label)      schedule.label      = label;
    if (notes !== undefined) schedule.notes = notes;
    if (status === 'cancelled') schedule.status = 'cancelled';

    await schedule.save();
    res.json(schedule);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── DELETE / CANCEL schedule ──────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const schedule = await CampaignSchedule.findOne({ _id: req.params.id, userId: req.user._id });
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });
    await schedule.deleteOne();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── EXECUTE schedule manually (for testing) ───────────────────────────────────
router.post('/:id/execute', auth, async (req, res) => {
  try {
    const schedule = await CampaignSchedule.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('campaignId');
    if (!schedule) return res.status(404).json({ message: 'Schedule not found' });

    const result = await executeSchedule(schedule);
    res.json({ success: true, result });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Helper: generate a label ──────────────────────────────────────────────────
function generateLabel(type, scheduledAt, action) {
  const date = new Date(scheduledAt).toLocaleDateString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  const labels = {
    start:         `▶️ Auto-start on ${date}`,
    stop:          `⏹️ Auto-stop on ${date}`,
    pause:         `⏸️ Auto-pause on ${date}`,
    resume:        `▶️ Auto-resume on ${date}`,
    budget_change: `💰 Budget → $${action?.budget} on ${date}`,
    recurring:     `🔄 Recurring schedule`,
  };
  return labels[type] || `Schedule on ${date}`;
}

// ── Execute a schedule (used by cron) ─────────────────────────────────────────
async function executeSchedule(schedule) {
  const Campaign = require('../models/Campaign');
  const User     = require('../models/User');
  const { createNotification } = require('../utils/notifications');

  const campaign = schedule.campaignId._id
    ? schedule.campaignId
    : await Campaign.findById(schedule.campaignId);

  if (!campaign) {
    schedule.status = 'failed';
    schedule.errorMessage = 'Campaign not found';
    await schedule.save();
    return { success: false, error: 'Campaign not found' };
  }

  const user = await User.findById(schedule.userId);

  try {
    let actionTaken = '';

    switch (schedule.type) {
      case 'start':
      case 'resume':
        campaign.status = 'active';
        campaign.platforms.forEach(p => { if (p.status !== 'active') p.status = 'active'; });
        await campaign.save();
        // Push to platform APIs
        await pushStatusToPlatforms(campaign, 'active', user);
        actionTaken = `Campaign "${campaign.name}" started/resumed`;
        break;

      case 'stop':
      case 'pause':
        campaign.status = schedule.type === 'stop' ? 'completed' : 'paused';
        campaign.platforms.forEach(p => { p.status = 'paused'; });
        await campaign.save();
        await pushStatusToPlatforms(campaign, 'paused', user);
        actionTaken = `Campaign "${campaign.name}" ${schedule.type === 'stop' ? 'stopped' : 'paused'}`;
        break;

      case 'budget_change':
        const { budget, budgetType, platform: targetPlatform } = schedule.action;
        if (targetPlatform && targetPlatform !== 'all') {
          const p = campaign.platforms.find(p => p.platform === targetPlatform);
          if (p) { p.budget = budget; if (budgetType) p.budgetType = budgetType; }
        } else {
          campaign.platforms.forEach(p => { p.budget = budget; if (budgetType) p.budgetType = budgetType; });
        }
        campaign.totalBudget = campaign.platforms.reduce((s, p) => s + (p.budget || 0), 0);
        await campaign.save();
        await pushBudgetToPlatforms(campaign, budget, budgetType, targetPlatform, user);
        actionTaken = `Budget changed to $${budget} for "${campaign.name}"`;
        break;

      case 'recurring':
        // Just a marker for recurring schedule tracking
        actionTaken = `Recurring check for "${campaign.name}"`;
        break;
    }

    // Mark as executed
    schedule.status     = 'executed';
    schedule.executedAt = new Date();

    // For recurring schedules, calculate next run time
    if (schedule.recurrence?.frequency) {
      const next = calculateNextRun(schedule);
      if (next && (!schedule.recurrence.endDate || next <= new Date(schedule.recurrence.endDate))) {
        schedule.status    = 'pending'; // keep pending for next run
        schedule.nextRunAt = next;
        schedule.scheduledAt = next;
      }
    }

    await schedule.save();

    // Notify user
    await createNotification(schedule.userId, {
      type: 'success', category: 'campaign',
      title: '⏰ Schedule Executed',
      message: actionTaken,
      link: `/campaigns/${campaign._id}`,
      meta: { campaignId: campaign._id.toString(), scheduleType: schedule.type }
    });

    console.log(`[Schedule] ✅ Executed: ${actionTaken}`);
    return { success: true, action: actionTaken };

  } catch (err) {
    schedule.status       = 'failed';
    schedule.errorMessage = err.message;
    await schedule.save();

    await createNotification(schedule.userId, {
      type: 'error', category: 'campaign',
      title: '❌ Schedule Failed',
      message: `Could not execute scheduled action for "${campaign.name}": ${err.message}`,
      link: `/campaigns/${campaign._id}`
    });

    console.error(`[Schedule] ❌ Failed:`, err.message);
    return { success: false, error: err.message };
  }
}

// ── Calculate next run for recurring schedules ────────────────────────────────
function calculateNextRun(schedule) {
  const { frequency, daysOfWeek, time } = schedule.recurrence;
  const now  = new Date();
  const next = new Date(schedule.scheduledAt);

  if (frequency === 'daily') {
    next.setDate(next.getDate() + 1);
  } else if (frequency === 'weekly') {
    if (daysOfWeek && daysOfWeek.length > 0) {
      // Find next day of week
      let daysAhead = 1;
      for (let i = 1; i <= 7; i++) {
        const candidate = new Date(now);
        candidate.setDate(candidate.getDate() + i);
        if (daysOfWeek.includes(candidate.getDay())) { daysAhead = i; break; }
      }
      next.setDate(now.getDate() + daysAhead);
    } else {
      next.setDate(next.getDate() + 7);
    }
  } else if (frequency === 'monthly') {
    next.setMonth(next.getMonth() + 1);
  }

  // Set specific time if provided
  if (time) {
    const [hours, mins] = time.split(':').map(Number);
    next.setHours(hours, mins, 0, 0);
  }

  return next > now ? next : null;
}

// ── Push status to platform APIs ──────────────────────────────────────────────
async function pushStatusToPlatforms(campaign, newStatus, user) {
  if (!user?.connectedPlatforms) return;
  const axios = require('axios');

  for (const p of campaign.platforms) {
    if (!p.platformCampaignId) continue;
    const conn = user.connectedPlatforms.find(c => c.platform === p.platform);
    if (!conn?.accessToken) continue;

    try {
      if (p.platform === 'meta') {
        await axios.post(`https://graph.facebook.com/v19.0/${p.platformCampaignId}`, {
          status: newStatus === 'active' ? 'ACTIVE' : 'PAUSED',
          access_token: conn.accessToken
        });
      } else if (p.platform === 'tiktok') {
        await axios.post('https://business-api.tiktok.com/open_api/v1.3/campaign/status/update/', {
          advertiser_id: conn.advertiserId,
          campaign_ids: [p.platformCampaignId],
          operation_status: newStatus === 'active' ? 'ENABLE' : 'DISABLE'
        }, { headers: { 'Access-Token': conn.accessToken } });
      }
    } catch (err) {
      console.warn(`[Schedule] Could not push status to ${p.platform}:`, err.message);
    }
  }
}

// ── Push budget to platform APIs ──────────────────────────────────────────────
async function pushBudgetToPlatforms(campaign, budget, budgetType, targetPlatform, user) {
  if (!user?.connectedPlatforms) return;
  const axios = require('axios');

  for (const p of campaign.platforms) {
    if (targetPlatform && targetPlatform !== 'all' && p.platform !== targetPlatform) continue;
    if (!p.platformCampaignId) continue;
    const conn = user.connectedPlatforms.find(c => c.platform === p.platform);
    if (!conn?.accessToken) continue;

    try {
      if (p.platform === 'meta') {
        const body = { access_token: conn.accessToken };
        if (budgetType === 'daily') body.daily_budget = Math.round(budget * 100);
        else body.lifetime_budget = Math.round(budget * 100);
        await axios.post(`https://graph.facebook.com/v19.0/${p.platformCampaignId}`, body);
      }
    } catch (err) {
      console.warn(`[Schedule] Could not push budget to ${p.platform}:`, err.message);
    }
  }
}

module.exports = router;
module.exports.executeSchedule = executeSchedule;
