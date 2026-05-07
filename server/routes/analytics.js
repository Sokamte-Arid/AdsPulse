const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Campaign = require('../models/Campaign');

// Get aggregated KPIs across all campaigns
router.get('/overview', auth, async (req, res) => {
  try {
    const { startDate, endDate, platforms } = req.query;
    const filter = { userId: req.user._id, status: { $in: ['active', 'completed'] } };

    const campaigns = await Campaign.find(filter);

    const kpis = {
      amountSpent: 0, impressions: 0, cpm: 0, totalClicks: 0,
      ctr: 0, cpc: 0, conversions: 0, totalReach: 0, addToCart: 0
    };

    const platformBreakdown = {};
    let platformCount = {};

    campaigns.forEach(campaign => {
      campaign.platforms.forEach(p => {
        if (platforms && !platforms.includes(p.platform)) return;
        const m = p.metrics;
        kpis.amountSpent += m.amountSpent;
        kpis.impressions += m.impressions;
        kpis.totalClicks += m.totalClicks;
        kpis.conversions += m.conversions;
        kpis.totalReach += m.totalReach;
        kpis.addToCart += m.addToCart;

        if (!platformBreakdown[p.platform]) {
          platformBreakdown[p.platform] = { ...m };
          platformCount[p.platform] = 1;
        } else {
          Object.keys(m).forEach(k => {
            platformBreakdown[p.platform][k] = (platformBreakdown[p.platform][k] || 0) + m[k];
          });
          platformCount[p.platform]++;
        }
      });
    });

    // Derived metrics
    kpis.cpm = kpis.impressions > 0 ? (kpis.amountSpent / kpis.impressions) * 1000 : 0;
    kpis.ctr = kpis.impressions > 0 ? (kpis.totalClicks / kpis.impressions) * 100 : 0;
    kpis.cpc = kpis.totalClicks > 0 ? kpis.amountSpent / kpis.totalClicks : 0;

    // Platform derived metrics
    Object.keys(platformBreakdown).forEach(plt => {
      const pd = platformBreakdown[plt];
      pd.cpm = pd.impressions > 0 ? (pd.amountSpent / pd.impressions) * 1000 : 0;
      pd.ctr = pd.impressions > 0 ? (pd.totalClicks / pd.impressions) * 100 : 0;
      pd.cpc = pd.totalClicks > 0 ? pd.amountSpent / pd.totalClicks : 0;
    });

    res.json({ kpis, platformBreakdown });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get time-series data for a KPI
router.get('/timeseries', auth, async (req, res) => {
  try {
    const { kpi = 'impressions', period = '30d', platform } = req.query;
    const campaigns = await Campaign.find({ userId: req.user._id });

    // Generate mock time-series from history or synthesize from metrics
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
    const series = [];

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayData = { date: date.toISOString().split('T')[0], total: 0 };
      const platformData = {};

      campaigns.forEach(campaign => {
        const filteredPlatforms = platform
          ? campaign.platforms.filter(p => p.platform === platform)
          : campaign.platforms;

        filteredPlatforms.forEach(p => {
          // Use history if available, otherwise distribute metrics over days
          const historyEntry = campaign.metricsHistory?.find(h =>
            h.date?.toISOString().split('T')[0] === dayData.date &&
            (!platform || h.platform === platform)
          );

          const value = historyEntry
            ? historyEntry[kpi] || 0
            : Math.max(0, Math.round((p.metrics[kpi] || 0) / days * (0.7 + Math.random() * 0.6)));

          dayData.total += value;
          platformData[p.platform] = (platformData[p.platform] || 0) + value;
        });
      });

      series.push({ ...dayData, ...platformData });
    }

    res.json(series);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Comparative analytics
router.get('/compare', auth, async (req, res) => {
  try {
    const { period1Start, period1End, period2Start, period2End } = req.query;
    const campaigns = await Campaign.find({ userId: req.user._id });

    const aggregateMetrics = (pStart, pEnd) => {
      const m = { amountSpent: 0, impressions: 0, totalClicks: 0, conversions: 0, totalReach: 0, addToCart: 0 };
      campaigns.forEach(c => {
        const history = c.metricsHistory?.filter(h => {
          if (!h.date) return false;
          const d = new Date(h.date);
          return d >= new Date(pStart) && d <= new Date(pEnd);
        }) || [];

        if (history.length > 0) {
          history.forEach(h => {
            Object.keys(m).forEach(k => { m[k] += h[k] || 0; });
          });
        } else {
          // Fallback: use current metrics proportioned
          c.platforms.forEach(p => {
            Object.keys(m).forEach(k => { m[k] += Math.round((p.metrics[k] || 0) * 0.4); });
          });
        }
      });
      m.cpm = m.impressions > 0 ? (m.amountSpent / m.impressions) * 1000 : 0;
      m.ctr = m.impressions > 0 ? (m.totalClicks / m.impressions) * 100 : 0;
      m.cpc = m.totalClicks > 0 ? m.amountSpent / m.totalClicks : 0;
      return m;
    };

    const period1 = aggregateMetrics(period1Start || new Date(Date.now() - 60 * 86400000), period1End || new Date(Date.now() - 30 * 86400000));
    const period2 = aggregateMetrics(period2Start || new Date(Date.now() - 30 * 86400000), period2End || new Date());

    const changes = {};
    Object.keys(period2).forEach(k => {
      changes[k] = period1[k] > 0 ? ((period2[k] - period1[k]) / period1[k]) * 100 : 0;
    });

    res.json({ period1, period2, changes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Platform performance ranking
router.get('/platform-performance', auth, async (req, res) => {
  try {
    const campaigns = await Campaign.find({ userId: req.user._id, status: 'active' });
    const platforms = {};

    campaigns.forEach(c => {
      c.platforms.forEach(p => {
        if (!platforms[p.platform]) {
          platforms[p.platform] = {
            platform: p.platform,
            amountSpent: 0, impressions: 0, totalClicks: 0,
            conversions: 0, totalReach: 0, ctr: 0, cpc: 0, cpm: 0,
            campaignCount: 0, budget: 0
          };
        }
        const pd = platforms[p.platform];
        pd.amountSpent += p.metrics.amountSpent;
        pd.impressions += p.metrics.impressions;
        pd.totalClicks += p.metrics.totalClicks;
        pd.conversions += p.metrics.conversions;
        pd.totalReach += p.metrics.totalReach;
        pd.budget += p.budget;
        pd.campaignCount++;
      });
    });

    Object.values(platforms).forEach(pd => {
      pd.cpm = pd.impressions > 0 ? (pd.amountSpent / pd.impressions) * 1000 : 0;
      pd.ctr = pd.impressions > 0 ? (pd.totalClicks / pd.impressions) * 100 : 0;
      pd.cpc = pd.totalClicks > 0 ? pd.amountSpent / pd.totalClicks : 0;
      pd.roas = pd.amountSpent > 0 ? pd.conversions / pd.amountSpent * 100 : 0;
    });

    res.json(Object.values(platforms).sort((a, b) => b.impressions - a.impressions));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
