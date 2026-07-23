const express  = require('express');
const { notify } = require('../utils/notify');
const router   = express.Router();
const auth     = require('../middleware/auth');
const Revenue  = require('../models/Revenue');
const Campaign = require('../models/Campaign');

// ── Helper: get ad spend for a campaign/platform ──────────────────────────────
const getAdSpend = async (userId, campaignId, platform) => {
  if (!campaignId) return 0;
  const campaign = await Campaign.findOne({ _id: campaignId, userId }).lean();
  if (!campaign) return 0;
  if (platform && platform !== 'other' && platform !== 'direct') {
    const p = campaign.platforms?.find(p => p.platform === platform);
    return p?.metrics?.amountSpent || 0;
  }
  return campaign.platforms?.reduce((s, p) => s + (p.metrics?.amountSpent || 0), 0) || 0;
};

// ── GET /api/revenue ──────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { platform, campaignId, period = '30d' } = req.query;
    const filter = { userId: req.user._id };
    if (platform && platform !== 'all') filter.platform = platform;
    if (campaignId) filter.campaignId = campaignId;

    // Date filter
    const periodDays = { '7d':7, '30d':30, '90d':90, '1y':365 };
    if (periodDays[period]) {
      filter.createdAt = { $gte: new Date(Date.now() - periodDays[period] * 86400000) };
    }

    const entries = await Revenue.find(filter).sort({ createdAt: -1 }).lean();

    // Attach virtual fields manually since lean() skips virtuals
    const withVirtuals = entries.map(e => ({
      ...e,
      roi:  e.adSpend > 0 ? ((e.amount - e.adSpend) / e.adSpend * 100).toFixed(1) : null,
      roas: e.adSpend > 0 ? (e.amount / e.adSpend).toFixed(2) : null,
    }));

    res.json(withVirtuals);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ── GET /api/revenue/summary ──────────────────────────────────────────────────
router.get('/summary', auth, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const periodDays = { '7d':7, '30d':30, '90d':90, '1y':365 };
    const since = periodDays[period]
      ? new Date(Date.now() - periodDays[period] * 86400000)
      : new Date(0);

    const entries = await Revenue.find({
      userId: req.user._id,
      createdAt: { $gte: since },
    }).lean();

    // Get total ad spend from campaigns
    const campaigns = await Campaign.find({
      userId: req.user._id,
      status: { $in: ['active', 'paused', 'completed'] },
    }).lean();

    const totalAdSpend = campaigns.reduce((s, c) =>
      s + (c.platforms?.reduce((ps, p) => ps + (p.metrics?.amountSpent || 0), 0) || 0), 0);

    const totalRevenue    = entries.reduce((s, e) => s + e.amount, 0);
    const totalConversions = entries.reduce((s, e) => s + (e.conversions || 0), 0);
    const roi  = totalAdSpend > 0 ? ((totalRevenue - totalAdSpend) / totalAdSpend * 100) : null;
    const roas = totalAdSpend > 0 ? (totalRevenue / totalAdSpend) : null;
    const profit = totalRevenue - totalAdSpend;

    // Per-platform breakdown
    const byPlatform = {};
    entries.forEach(e => {
      if (!byPlatform[e.platform]) byPlatform[e.platform] = { revenue:0, adSpend:0, conversions:0 };
      byPlatform[e.platform].revenue     += e.amount;
      byPlatform[e.platform].adSpend     += e.adSpend || 0;
      byPlatform[e.platform].conversions += e.conversions || 0;
    });

    // Add platform ad spend from campaigns
    campaigns.forEach(c => {
      c.platforms?.forEach(p => {
        if (!byPlatform[p.platform]) byPlatform[p.platform] = { revenue:0, adSpend:0, conversions:0 };
        byPlatform[p.platform].adSpend += p.metrics?.amountSpent || 0;
      });
    });

    const platformBreakdown = Object.entries(byPlatform).map(([platform, data]) => ({
      platform,
      revenue:     data.revenue,
      adSpend:     data.adSpend,
      conversions: data.conversions,
      roi:  data.adSpend > 0 ? ((data.revenue - data.adSpend) / data.adSpend * 100).toFixed(1) : null,
      roas: data.adSpend > 0 ? (data.revenue / data.adSpend).toFixed(2) : null,
      profit: data.revenue - data.adSpend,
    }));

    // Monthly trend (last 6 months)
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const month = d.toLocaleString('en', { month: 'short', year: '2-digit' });
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const monthEntries = entries.filter(e => {
        const ed = new Date(e.createdAt);
        return ed >= monthStart && ed <= monthEnd;
      });
      trend.push({
        month,
        revenue: monthEntries.reduce((s, e) => s + e.amount, 0),
        adSpend: monthEntries.reduce((s, e) => s + (e.adSpend || 0), 0),
      });
    }

    res.json({
      totalRevenue,
      totalAdSpend,
      totalConversions,
      profit,
      roi,
      roas,
      entriesCount: entries.length,
      platformBreakdown,
      trend,
    });
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ── POST /api/revenue ─────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { campaignId, platform, amount, currency, source, description, conversions, period } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Amount must be greater than 0' });

    // Auto-fetch ad spend
    const adSpend = await getAdSpend(req.user._id, campaignId, platform);

    // Get campaign name
    let campaignName = '';
    if (campaignId) {
      const campaign = await Campaign.findOne({ _id: campaignId, userId: req.user._id }).lean();
      campaignName = campaign?.name || '';
    }

    const entry = await Revenue.create({
      userId: req.user._id,
      campaignId:   campaignId   || undefined,
      campaignName: campaignName || undefined,
      platform:     platform     || 'other',
      amount:       Number(amount),
      currency:     currency     || 'USD',
      source:       source       || 'sales',
      description:  description  || '',
      conversions:  Number(conversions) || 0,
      period,
      adSpend,
    });

    notify.revenueAdded(req.user._id, Number(amount), currency || 'USD').catch(() => {});
    res.status(201).json({
      ...entry.toJSON(),
      roi:  adSpend > 0 ? ((amount - adSpend) / adSpend * 100).toFixed(1) : null,
      roas: adSpend > 0 ? (amount / adSpend).toFixed(2) : null,
    });
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ── PUT /api/revenue/:id ──────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const entry = await Revenue.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: req.body },
      { new: true }
    );
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    res.json(entry);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ── DELETE /api/revenue/:id ───────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    await Revenue.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true });
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

module.exports = router;