const cron     = require('node-cron');
const mongoose = require('mongoose');
const axios    = require('axios');
const { createNotification, checkBudgetAlerts, checkMilestones } = require('./notifications');

// ── Execute due schedules ─────────────────────────────────────────────────────
async function executeDueSchedules() {
  if (mongoose.connection.readyState !== 1) return;
  const CampaignSchedule = require('../models/CampaignSchedule');
  const { executeSchedule } = require('../routes/schedules');

  const now = new Date();

  // Find all pending schedules that are due
  const due = await CampaignSchedule.find({
    status:      'pending',
    scheduledAt: { $lte: now }
  }).populate('campaignId');

  if (due.length > 0) {
    console.log(`[Cron Scheduler] Found ${due.length} schedule(s) due for execution`);
  }

  for (const schedule of due) {
    console.log(`[Cron Scheduler] Executing: ${schedule.label || schedule.type} for campaign ${schedule.campaignId?.name}`);
    await executeSchedule(schedule);
  }
}

// ── Sync platform data ────────────────────────────────────────────────────────
async function syncAllPlatforms() {
  if (mongoose.connection.readyState !== 1) return;
  const User     = require('../models/User');
  const Campaign = require('../models/Campaign');

  const users = await User.find({ 'connectedPlatforms.0': { $exists: true } });
  console.log(`[Cron Sync] Syncing ${users.length} users`);

  for (const user of users) {
    for (const conn of user.connectedPlatforms) {
      if (conn.status !== 'connected' || !conn.accessToken) continue;
      try {
        if (conn.platform === 'meta') {
          await syncMetaMetrics(user._id, conn, Campaign);
          conn.lastSync = new Date();
          await user.save();
        }
      } catch (err) {
        console.error(`[Cron Sync] ${conn.platform} error for ${user.email}:`, err.message);
        conn.status = 'error';
        conn.errorMessage = err.message;
        await user.save();
        await createNotification(user._id, {
          type: 'error', category: 'platform',
          title: `${conn.platform} Sync Failed`,
          message: `Could not sync ${conn.platform}: ${err.message}. Please reconnect.`,
          link: '/connect'
        });
      }
    }
    await checkBudgetAlerts(user._id);
    await checkMilestones(user._id);
  }
}

// ── Sync Meta metrics ─────────────────────────────────────────────────────────
async function syncMetaMetrics(userId, conn, Campaign) {
  const res = await axios.get(
    `https://graph.facebook.com/v19.0/${conn.accountId}/campaigns`,
    { params: { fields: 'name,status,effective_status,daily_budget,lifetime_budget', limit: 100, access_token: conn.accessToken } }
  );
  const campaigns = res.data?.data || [];

  for (const mc of campaigns) {
    let metrics = { amountSpent:0, impressions:0, cpm:0, totalClicks:0, ctr:0, cpc:0, conversions:0, totalReach:0, addToCart:0 };
    try {
      const insRes = await axios.get(`https://graph.facebook.com/v19.0/${mc.id}/insights`, {
        params: { fields:'spend,impressions,cpm,clicks,ctr,cpc,reach,actions', date_preset:'last_30d', access_token: conn.accessToken }
      });
      const ins = insRes.data?.data?.[0];
      if (ins) {
        metrics.amountSpent = parseFloat(ins.spend || 0);
        metrics.impressions  = parseInt(ins.impressions || 0);
        metrics.cpm          = parseFloat(ins.cpm || 0);
        metrics.totalClicks  = parseInt(ins.clicks || 0);
        metrics.ctr          = parseFloat(ins.ctr || 0);
        metrics.cpc          = parseFloat(ins.cpc || 0);
        metrics.totalReach   = parseInt(ins.reach || 0);
        const cart = (ins.actions||[]).find(a => a.action_type==='add_to_cart');
        const conv = (ins.actions||[]).find(a => a.action_type==='purchase');
        metrics.addToCart   = parseInt(cart?.value||0);
        metrics.conversions = parseInt(conv?.value||0);
      }
    } catch {}

    const statusMap = { ACTIVE:'active', PAUSED:'paused', WITH_ISSUES:'paused', PENDING_BILLING_INFO:'paused', ARCHIVED:'paused' };
    const mappedStatus = statusMap[mc.effective_status] || 'paused';

    const existing = await Campaign.findOne({ userId, 'platforms.platformCampaignId': mc.id });
    if (existing) {
      const pIdx = existing.platforms.findIndex(p => p.platformCampaignId === mc.id);
      if (pIdx >= 0) {
        existing.platforms[pIdx].metrics = metrics;
        existing.platforms[pIdx].status  = mappedStatus;
        existing.metricsHistory = existing.metricsHistory || [];
        if (metrics.impressions > 0) existing.metricsHistory.push({ date: new Date(), platform: 'meta', ...metrics });
        await existing.save();
      }
    }
  }
}

// ── Daily reports ─────────────────────────────────────────────────────────────
async function sendDailyReports() {
  if (mongoose.connection.readyState !== 1) return;
  const User     = require('../models/User');
  const Campaign = require('../models/Campaign');

  const users = await User.find({ 'preferences.notifications': true });
  for (const user of users) {
    const campaigns = await Campaign.find({ userId: user._id, status: 'active' });
    if (!campaigns.length) continue;

    const totalSpent = campaigns.reduce((s,c) => s + c.platforms.reduce((ps,p) => ps+(p.metrics?.amountSpent||0),0), 0);
    const totalConversions = campaigns.reduce((s,c) => s + c.platforms.reduce((ps,p) => ps+(p.metrics?.conversions||0),0), 0);

    await createNotification(user._id, {
      type: 'info', category: 'report',
      title: '📊 Daily Performance Summary',
      message: `${campaigns.length} active campaign${campaigns.length!==1?'s':''} · $${totalSpent.toFixed(0)} spent · ${totalConversions} conversions. Click to view analytics.`,
      link: '/analytics'
    });
  }
}

// ── Notify about upcoming schedules (24h warning) ────────────────────────────
async function notifyUpcomingSchedules() {
  if (mongoose.connection.readyState !== 1) return;
  const CampaignSchedule = require('../models/CampaignSchedule');

  const in24h = new Date(Date.now() + 24 * 3600000);
  const in23h = new Date(Date.now() + 23 * 3600000);

  const upcoming = await CampaignSchedule.find({
    status:      'pending',
    scheduledAt: { $gte: in23h, $lte: in24h }
  }).populate('campaignId', 'name');

  for (const s of upcoming) {
    const alreadyNotified = false; // Could track this — skipping for brevity
    if (!alreadyNotified) {
      await createNotification(s.userId, {
        type: 'info', category: 'campaign',
        title: '⏰ Upcoming Scheduled Action',
        message: `"${s.label || s.type}" for campaign "${s.campaignId?.name}" is scheduled in ~24 hours.`,
        link: `/campaigns/${s.campaignId?._id}`,
        meta: { scheduleId: s._id.toString() }
      });
    }
  }
}

// ── Register all cron jobs ────────────────────────────────────────────────────
function startCronJobs() {
  // ✅ Check and execute due schedules every minute
  cron.schedule('* * * * *', async () => {
    await executeDueSchedules();
  });

  // Sync platforms every hour
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Hourly platform sync');
    await syncAllPlatforms();
  });

  // Budget alerts every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    if (mongoose.connection.readyState !== 1) return;
    const User = require('../models/User');
    const users = await User.find({});
    for (const user of users) {
      await checkBudgetAlerts(user._id);
      await checkMilestones(user._id);
    }
  });

  // Daily report at 8am
  cron.schedule('0 8 * * *', async () => {
    console.log('[Cron] Sending daily reports');
    await sendDailyReports();
  });

  // Notify upcoming schedules daily at 9am
  cron.schedule('0 9 * * *', async () => {
    console.log('[Cron] Checking upcoming schedules');
    await notifyUpcomingSchedules();
  });

  console.log('✅ Cron jobs started:');
  console.log('   · Schedule executor: every minute');
  console.log('   · Platform sync:     every hour');
  console.log('   · Budget alerts:     every 30 min');
  console.log('   · Daily report:      8:00 AM');
  console.log('   · Schedule warning:  9:00 AM');
}

module.exports = { startCronJobs, syncAllPlatforms, executeDueSchedules };
