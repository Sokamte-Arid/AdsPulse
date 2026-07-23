const Notification = require('../models/Notification');

async function createNotification(userId, { type, category, title, message, link, meta }) {
  try {
    return await Notification.create({ userId, type, category, title, message, link, meta });
  } catch (err) {
    console.error('[Notification Error]', err.message);
  }
}

// Check campaigns for budget alerts and create notifications
async function checkBudgetAlerts(userId) {
  const Campaign = require('../models/Campaign');
  const campaigns = await Campaign.find({ userId, status: 'active' });

  for (const campaign of campaigns) {
    for (const p of campaign.platforms) {
      if (!p.budget || !p.metrics?.amountSpent) continue;
      const pct = (p.metrics.amountSpent / p.budget) * 100;

      if (pct >= 90) {
        const existing = await Notification.findOne({
          userId, 'meta.campaignId': campaign._id.toString(),
          'meta.platform': p.platform, 'meta.alertType': 'budget_90',
          createdAt: { $gte: new Date(Date.now() - 24 * 3600000) }
        });
        if (!existing) {
          await createNotification(userId, {
            type: 'warning', category: 'budget',
            title: '⚠️ Budget Alert (90%)',
            message: `"${campaign.name}" on ${p.platform} has used ${pct.toFixed(0)}% of its budget ($${p.metrics.amountSpent.toFixed(0)} / $${p.budget}).`,
            link: `/campaigns/${campaign._id}`,
            meta: { campaignId: campaign._id.toString(), platform: p.platform, alertType: 'budget_90', percent: pct }
          });
        }
      } else if (pct >= 75) {
        const existing = await Notification.findOne({
          userId, 'meta.campaignId': campaign._id.toString(),
          'meta.platform': p.platform, 'meta.alertType': 'budget_75',
          createdAt: { $gte: new Date(Date.now() - 24 * 3600000) }
        });
        if (!existing) {
          await createNotification(userId, {
            type: 'info', category: 'budget',
            title: 'Budget at 75%',
            message: `"${campaign.name}" on ${p.platform} has used ${pct.toFixed(0)}% of its budget.`,
            link: `/campaigns/${campaign._id}`,
            meta: { campaignId: campaign._id.toString(), platform: p.platform, alertType: 'budget_75', percent: pct }
          });
        }
      }
    }

    // Check if campaign is ending soon (within 3 days)
    if (campaign.endDate) {
      const daysLeft = (new Date(campaign.endDate) - new Date()) / 86400000;
      if (daysLeft > 0 && daysLeft <= 3) {
        const existing = await Notification.findOne({
          userId, 'meta.campaignId': campaign._id.toString(), 'meta.alertType': 'ending_soon',
          createdAt: { $gte: new Date(Date.now() - 12 * 3600000) }
        });
        if (!existing) {
          await createNotification(userId, {
            type: 'warning', category: 'campaign',
            title: '⏰ Campaign Ending Soon',
            message: `"${campaign.name}" ends in ${Math.ceil(daysLeft)} day(s). Review performance and consider extending.`,
            link: `/campaigns/${campaign._id}`,
            meta: { campaignId: campaign._id.toString(), alertType: 'ending_soon', daysLeft }
          });
        }
      }
    }
  }
}

// Milestone notifications
async function checkMilestones(userId) {
  const Campaign = require('../models/Campaign');
  const campaigns = await Campaign.find({ userId, status: 'active' });

  for (const campaign of campaigns) {
    const totalImpressions = campaign.platforms.reduce((s, p) => s + (p.metrics?.impressions || 0), 0);
    const totalConversions = campaign.platforms.reduce((s, p) => s + (p.metrics?.conversions || 0), 0);

    const milestones = [
      { key: 'impressions_1m', value: 1000000, current: totalImpressions, label: '1M impressions', kpi: 'Impressions' },
      { key: 'impressions_500k', value: 500000, current: totalImpressions, label: '500K impressions', kpi: 'Impressions' },
      { key: 'conversions_1k', value: 1000, current: totalConversions, label: '1,000 conversions', kpi: 'Conversions' },
      { key: 'conversions_100', value: 100, current: totalConversions, label: '100 conversions', kpi: 'Conversions' },
    ];

    for (const m of milestones) {
      if (m.current >= m.value) {
        const existing = await Notification.findOne({
          userId, 'meta.campaignId': campaign._id.toString(), 'meta.milestone': m.key
        });
        if (!existing) {
          await createNotification(userId, {
            type: 'success', category: 'milestone',
            title: `🎉 Milestone: ${m.label}!`,
            message: `"${campaign.name}" just hit ${m.label}. Great performance!`,
            link: `/campaigns/${campaign._id}`,
            meta: { campaignId: campaign._id.toString(), milestone: m.key, kpi: m.kpi }
          });
        }
      }
    }
  }
}

module.exports = { createNotification, checkBudgetAlerts, checkMilestones };
