const cron = require('node-cron');
const mongoose = require('mongoose');
const axios = require('axios');

const { createNotification, checkBudgetAlerts, checkMilestones } = require('./notifications');

// ── Sync platform data for all connected users ─────────────────────────────
async function syncAllPlatforms() {
  if (mongoose.connection.readyState !== 1) return;
  console.log('[Cron] Starting platform sync...');

  const User = require('../models/User');
  const Campaign = require('../models/Campaign');

  const users = await User.find({ 'connectedPlatforms.0': { $exists: true } });
  console.log(`[Cron] Syncing ${users.length} users with connected platforms`);

  for (const user of users) {
    for (const conn of user.connectedPlatforms) {
      if (conn.status !== 'connected' || !conn.accessToken) continue;
      try {
        await syncPlatformMetrics(user._id, conn, Campaign);
        conn.lastSync = new Date();
        await user.save();
      } catch (err) {
        console.error(`[Cron] Sync error for ${conn.platform}:`, err.message);
        conn.status = 'error';
        conn.errorMessage = err.message;
        await user.save();
        await createNotification(user._id, {
          type: 'error', category: 'platform',
          title: `${conn.platform} Sync Failed`,
          message: `Could not sync ${conn.platform} data: ${err.message}. Please re-check your credentials.`,
          link: '/connect',
          meta: { platform: conn.platform }
        });
      }
    }

    // Check budget alerts and milestones after sync
    await checkBudgetAlerts(user._id);
    await checkMilestones(user._id);
  }
  console.log('[Cron] Platform sync complete');
}

// Sync metrics from Meta
async function syncMetaMetrics(userId, conn, Campaign) {
  const fields = 'name,status,objective,daily_budget,lifetime_budget,spend_cap';
  const res = await axios.get(
    `https://graph.facebook.com/v19.0/${conn.accountId}/campaigns?fields=${fields}&limit=50&access_token=${conn.accessToken}`
  );
  const campaigns = res.data?.data || [];

  for (const mc of campaigns) {
    let metrics = { amountSpent:0, impressions:0, cpm:0, totalClicks:0, ctr:0, cpc:0, conversions:0, totalReach:0, addToCart:0 };
    try {
      const insightRes = await axios.get(
        `https://graph.facebook.com/v19.0/${mc.id}/insights?fields=spend,impressions,cpm,clicks,ctr,cpc,reach,actions&date_preset=last_30d&access_token=${conn.accessToken}`
      );
      const ins = insightRes.data?.data?.[0];
      if (ins) {
        metrics.amountSpent = parseFloat(ins.spend || 0);
        metrics.impressions  = parseInt(ins.impressions || 0);
        metrics.cpm          = parseFloat(ins.cpm || 0);
        metrics.totalClicks  = parseInt(ins.clicks || 0);
        metrics.ctr          = parseFloat(ins.ctr || 0);
        metrics.cpc          = parseFloat(ins.cpc || 0);
        metrics.totalReach   = parseInt(ins.reach || 0);
        const cart = (ins.actions||[]).find(a=>a.action_type==='add_to_cart');
        const conv = (ins.actions||[]).find(a=>a.action_type==='purchase');
        metrics.addToCart  = parseInt(cart?.value||0);
        metrics.conversions = parseInt(conv?.value||0);
      }
    } catch {}

    const existing = await Campaign.findOne({ userId, 'platforms.platformCampaignId': mc.id });
    if (existing) {
      const pIdx = existing.platforms.findIndex(p => p.platformCampaignId === mc.id);
      if (pIdx >= 0) {
        existing.platforms[pIdx].metrics = metrics;
        existing.platforms[pIdx].status = mc.status?.toLowerCase() === 'active' ? 'active' : 'paused';
        // Add to daily history
        existing.metricsHistory = existing.metricsHistory || [];
        existing.metricsHistory.push({ date: new Date(), platform: 'meta', ...metrics });
        await existing.save();
      }
    }
  }
}

// Generic sync dispatcher
async function syncPlatformMetrics(userId, conn, Campaign) {
  if (conn.platform === 'meta') return syncMetaMetrics(userId, conn, Campaign);
  // Other platforms follow similar patterns — add as APIs are integrated
}

// ── Generate daily report notifications ───────────────────────────────────
async function sendDailyReports() {
  if (mongoose.connection.readyState !== 1) return;
  const User = require('../models/User');
  const Campaign = require('../models/Campaign');

  const users = await User.find({ 'preferences.notifications': true });
  for (const user of users) {
    const campaigns = await Campaign.find({ userId: user._id, status: 'active' });
    if (!campaigns.length) continue;

    const totalSpend = campaigns.reduce((s,c) => s + c.platforms.reduce((ps,p) => ps+(p.metrics?.amountSpent||0),0),0);
    const totalConversions = campaigns.reduce((s,c) => s + c.platforms.reduce((ps,p) => ps+(p.metrics?.conversions||0),0),0);

    await createNotification(user._id, {
      type: 'info', category: 'report',
      title: '📊 Daily Performance Summary',
      message: `Today: $${totalSpend.toFixed(0)} spent across ${campaigns.length} active campaigns · ${totalConversions} conversions total. Click to view full report.`,
      link: '/analytics',
      meta: { totalSpend, totalConversions, campaignCount: campaigns.length }
    });
  }
}

// ── Register cron jobs ────────────────────────────────────────────────────
function startCronJobs() {
  // Sync platforms every hour
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Hourly platform sync triggered');
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

  console.log('✅ Cron jobs started (sync: hourly, alerts: every 30min, reports: 8am daily)');
}

module.exports = { startCronJobs, syncAllPlatforms };
