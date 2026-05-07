const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const { createNotification } = require('../utils/notifications');

// ── GET all campaigns ─────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { status, platform, page = 1, limit = 20, search } = req.query;
    const filter = { userId: req.user._id };
    if (status && status !== 'all') filter.status = status;
    if (platform) filter['platforms.platform'] = platform;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const campaigns = await Campaign.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Campaign.countDocuments(filter);
    res.json({ campaigns, total, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET single campaign ───────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, userId: req.user._id });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.json(campaign);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── CREATE campaign + push to platforms ──────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const campaign = await Campaign.create({ ...req.body, userId: req.user._id });

    // Push to connected platforms
    const user = await User.findById(req.user._id);
    const pushResults = await pushCampaignToPlatforms(campaign, user);

    // Notify
    await createNotification(req.user._id, {
      type: 'success', category: 'campaign',
      title: '📣 Campaign Created',
      message: `"${campaign.name}" created${pushResults.pushed.length ? ` and pushed to ${pushResults.pushed.join(', ')}` : ' as draft'}.`,
      link: `/campaigns/${campaign._id}`
    });

    if (pushResults.failed.length) {
      await createNotification(req.user._id, {
        type: 'warning', category: 'platform',
        title: '⚠️ Platform Push Partial',
        message: `Could not push to: ${pushResults.failed.map(f => `${f.platform} (${f.error})`).join(', ')}`,
        link: `/campaigns/${campaign._id}`
      });
    }

    res.status(201).json({ campaign, pushResults });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── UPDATE campaign ───────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    // Sync changes to platforms if campaign is active
    if (campaign.status === 'active') {
      const user = await User.findById(req.user._id);
      await syncCampaignUpdateToPlatforms(campaign, req.body, user);
    }

    await createNotification(req.user._id, {
      type: 'info', category: 'campaign',
      title: '✏️ Campaign Updated',
      message: `"${campaign.name}" has been updated.`,
      link: `/campaigns/${campaign._id}`
    });

    res.json(campaign);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── DELETE campaign ───────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.json({ message: 'Campaign deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── TOGGLE campaign status (pause / resume) ───────────────────────────────────
router.patch('/:id/toggle-status', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, userId: req.user._id });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    campaign.status = newStatus;

    // Update all platform statuses too
    campaign.platforms.forEach(p => {
      if (p.status === 'active' || p.status === 'paused') p.status = newStatus;
    });
    await campaign.save();

    // Push status change to real platforms
    const user = await User.findById(req.user._id);
    const results = await toggleCampaignOnPlatforms(campaign, newStatus, user);

    await createNotification(req.user._id, {
      type: newStatus === 'active' ? 'success' : 'info',
      category: 'campaign',
      title: newStatus === 'active' ? '▶️ Campaign Resumed' : '⏸️ Campaign Paused',
      message: `"${campaign.name}" is now ${newStatus}.${results.pushed.length ? ` Updated on: ${results.pushed.join(', ')}.` : ''}`,
      link: `/campaigns/${campaign._id}`
    });

    res.json({ campaign, platformResults: results });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── TOGGLE platform status within a campaign ──────────────────────────────────
router.patch('/:id/platforms/:platform/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const campaign = await Campaign.findOne({ _id: req.params.id, userId: req.user._id });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    const platformData = campaign.platforms.find(p => p.platform === req.params.platform);
    if (!platformData) return res.status(404).json({ message: 'Platform not found in campaign' });

    const oldStatus = platformData.status;
    platformData.status = status;
    await campaign.save();

    // Push to real platform API
    const user = await User.findById(req.user._id);
    const conn = user.connectedPlatforms?.find(p => p.platform === req.params.platform);
    if (conn?.accessToken && platformData.platformCampaignId) {
      try {
        await togglePlatformCampaign(req.params.platform, platformData.platformCampaignId, status, conn);
      } catch (apiErr) {
        console.warn(`[${req.params.platform}] Could not toggle campaign:`, apiErr.message);
      }
    }

    await createNotification(req.user._id, {
      type: status === 'active' ? 'success' : 'info',
      category: 'campaign',
      title: `${status === 'active' ? '▶️' : '⏸️'} ${req.params.platform} ${status === 'active' ? 'Resumed' : 'Paused'}`,
      message: `"${campaign.name}" on ${req.params.platform} is now ${status}.`,
      link: `/campaigns/${campaign._id}`
    });

    res.json(campaign);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── UPDATE platform budget ────────────────────────────────────────────────────
router.patch('/:id/platforms/:platform/budget', auth, async (req, res) => {
  try {
    const { budget, budgetType } = req.body;
    if (!budget || budget <= 0) return res.status(400).json({ message: 'Budget must be greater than 0' });

    const campaign = await Campaign.findOne({ _id: req.params.id, userId: req.user._id });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    const platformData = campaign.platforms.find(p => p.platform === req.params.platform);
    if (!platformData) return res.status(404).json({ message: 'Platform not found' });

    const oldBudget = platformData.budget;
    platformData.budget = Number(budget);
    if (budgetType) platformData.budgetType = budgetType;
    campaign.totalBudget = campaign.platforms.reduce((s, p) => s + (p.budget || 0), 0);
    await campaign.save();

    // Push budget update to real platform API
    const user = await User.findById(req.user._id);
    const conn = user.connectedPlatforms?.find(p => p.platform === req.params.platform);
    if (conn?.accessToken && platformData.platformCampaignId) {
      try {
        await updatePlatformBudget(req.params.platform, platformData.platformCampaignId, budget, budgetType, conn);
      } catch (apiErr) {
        console.warn(`[${req.params.platform}] Could not update budget:`, apiErr.message);
      }
    }

    await createNotification(req.user._id, {
      type: 'info', category: 'budget',
      title: '💰 Budget Updated',
      message: `"${campaign.name}" ${req.params.platform} budget changed from $${oldBudget} to $${budget}${budgetType ? ` (${budgetType})` : ''}.`,
      link: `/campaigns/${campaign._id}`
    });

    res.json(campaign);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── PUSH campaign to platforms manually ──────────────────────────────────────
router.post('/:id/push', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, userId: req.user._id });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    const user = await User.findById(req.user._id);
    const results = await pushCampaignToPlatforms(campaign, user);

    res.json({ success: true, results });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ── Platform API helpers ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// Map our objectives to Meta objectives
const META_OBJECTIVES = {
  awareness: 'OUTCOME_AWARENESS', reach: 'OUTCOME_AWARENESS',
  traffic: 'OUTCOME_TRAFFIC', engagement: 'OUTCOME_ENGAGEMENT',
  app_installs: 'OUTCOME_APP_PROMOTION', video_views: 'OUTCOME_AWARENESS',
  lead_generation: 'OUTCOME_LEADS', messages: 'OUTCOME_ENGAGEMENT',
  conversions: 'OUTCOME_SALES', catalog_sales: 'OUTCOME_SALES',
  store_traffic: 'OUTCOME_TRAFFIC'
};

async function pushCampaignToPlatforms(campaign, user) {
  const pushed = [], failed = [];

  for (const platformData of campaign.platforms) {
    if (platformData.platformCampaignId) continue; // already pushed

    const conn = user.connectedPlatforms?.find(p => p.platform === platformData.platform);
    if (!conn?.accessToken) continue; // not connected

    try {
      if (platformData.platform === 'meta') {
        const body = {
          name: campaign.name,
          objective: META_OBJECTIVES[campaign.objective] || 'OUTCOME_AWARENESS',
          status: campaign.status === 'active' ? 'ACTIVE' : 'PAUSED',
          special_ad_categories: [],
          access_token: conn.accessToken
        };
        if (platformData.budgetType === 'daily' && platformData.budget) {
          body.daily_budget = Math.round(platformData.budget * 100); // Meta uses cents
        } else if (platformData.budget) {
          body.lifetime_budget = Math.round(platformData.budget * 100);
          body.start_time = campaign.startDate ? new Date(campaign.startDate).toISOString() : undefined;
          body.stop_time  = campaign.endDate   ? new Date(campaign.endDate).toISOString()   : undefined;
        }

        const res = await axios.post(
          `https://graph.facebook.com/v19.0/${conn.accountId}/campaigns`,
          body
        );
        platformData.platformCampaignId = res.data.id;
        pushed.push('meta');
      }

      else if (platformData.platform === 'tiktok') {
        const res = await axios.post(
          'https://business-api.tiktok.com/open_api/v1.3/campaign/create/',
          {
            advertiser_id: conn.advertiserId,
            campaign_name: campaign.name,
            objective_type: campaign.objective.toUpperCase(),
            budget_mode: platformData.budgetType === 'daily' ? 'BUDGET_MODE_DAY' : 'BUDGET_MODE_TOTAL',
            budget: platformData.budget || 0,
            operation_status: campaign.status === 'active' ? 'ENABLE' : 'DISABLE'
          },
          { headers: { 'Access-Token': conn.accessToken } }
        );
        platformData.platformCampaignId = String(res.data?.data?.campaign_id);
        pushed.push('tiktok');
      }

      else if (platformData.platform === 'google') {
        // Google Ads campaign creation via GAQL mutation
        pushed.push('google (manual required - see Google Ads UI)');
      }

    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message;
      failed.push({ platform: platformData.platform, error: msg });
      console.error(`[Push ${platformData.platform}]`, msg);
    }
  }

  await campaign.save();
  return { pushed, failed };
}

async function toggleCampaignOnPlatforms(campaign, newStatus, user) {
  const pushed = [], failed = [];

  for (const p of campaign.platforms) {
    if (!p.platformCampaignId) continue;
    const conn = user.connectedPlatforms?.find(c => c.platform === p.platform);
    if (!conn?.accessToken) continue;

    try {
      await togglePlatformCampaign(p.platform, p.platformCampaignId, newStatus, conn);
      pushed.push(p.platform);
    } catch (err) {
      failed.push({ platform: p.platform, error: err.message });
    }
  }
  return { pushed, failed };
}

async function togglePlatformCampaign(platform, campaignId, status, conn) {
  if (platform === 'meta') {
    await axios.post(`https://graph.facebook.com/v19.0/${campaignId}`, {
      status: status === 'active' ? 'ACTIVE' : 'PAUSED',
      access_token: conn.accessToken
    });
  } else if (platform === 'tiktok') {
    await axios.post('https://business-api.tiktok.com/open_api/v1.3/campaign/status/update/', {
      advertiser_id: conn.advertiserId,
      campaign_ids: [campaignId],
      operation_status: status === 'active' ? 'ENABLE' : 'DISABLE'
    }, { headers: { 'Access-Token': conn.accessToken } });
  }
}

async function updatePlatformBudget(platform, campaignId, budget, budgetType, conn) {
  if (platform === 'meta') {
    const body = { access_token: conn.accessToken };
    if (budgetType === 'daily') body.daily_budget = Math.round(budget * 100);
    else body.lifetime_budget = Math.round(budget * 100);
    await axios.post(`https://graph.facebook.com/v19.0/${campaignId}`, body);
  } else if (platform === 'tiktok') {
    await axios.post('https://business-api.tiktok.com/open_api/v1.3/campaign/update/', {
      advertiser_id: conn.advertiserId, campaign_id: campaignId,
      budget_mode: budgetType === 'daily' ? 'BUDGET_MODE_DAY' : 'BUDGET_MODE_TOTAL',
      budget
    }, { headers: { 'Access-Token': conn.accessToken } });
  }
}

async function syncCampaignUpdateToPlatforms(campaign, changes, user) {
  for (const p of campaign.platforms) {
    if (!p.platformCampaignId) continue;
    const conn = user.connectedPlatforms?.find(c => c.platform === p.platform);
    if (!conn?.accessToken) continue;

    try {
      if (p.platform === 'meta') {
        const body = { access_token: conn.accessToken };
        if (changes.name) body.name = changes.name;
        if (Object.keys(body).length > 1) {
          await axios.post(`https://graph.facebook.com/v19.0/${p.platformCampaignId}`, body);
        }
      }
    } catch (err) {
      console.warn(`[Sync update ${p.platform}]`, err.message);
    }
  }
}

module.exports = router;
