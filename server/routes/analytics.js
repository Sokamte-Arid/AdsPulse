const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const Campaign = require('../models/Campaign');

// ── Helper: parse period into date range ──────────────────────────────────────
function getPeriodDates(period = '30d') {
  const now   = new Date();
  const start = new Date(now);
  if      (period === '7d')  start.setDate(now.getDate() - 7);
  else if (period === '90d') start.setDate(now.getDate() - 90);
  else                        start.setDate(now.getDate() - 30); // default 30d
  return { start, end: now };
}

// ── Overview — KPIs across ALL campaigns (active + paused + completed) ────────
router.get('/overview', auth, async (req, res) => {
  try {
    const { period = '30d', platform } = req.query;

    // ✅ KEY FIX: include ALL statuses, not just 'active'
    const filter = {
      userId: req.user._id,
      status: { $in: ['active', 'paused', 'completed', 'draft'] }
    };

    const campaigns = await Campaign.find(filter);

    // Aggregate KPIs from platform metrics
    const kpis = {
      amountSpent:  0, impressions: 0, cpm:         0,
      totalClicks:  0, ctr:         0, cpc:         0,
      conversions:  0, totalReach:  0, addToCart:   0,
    };

    const platformBreakdown = {};
    let totalImpressions = 0;
    let totalClicks      = 0;
    let totalSpend       = 0;

    for (const campaign of campaigns) {
      for (const p of campaign.platforms || []) {
        // Filter by platform if requested
        if (platform && p.platform !== platform) continue;

        const m = p.metrics || {};
        kpis.amountSpent += m.amountSpent  || 0;
        kpis.impressions += m.impressions  || 0;
        kpis.totalClicks += m.totalClicks  || 0;
        kpis.conversions += m.conversions  || 0;
        kpis.totalReach  += m.totalReach   || 0;
        kpis.addToCart   += m.addToCart    || 0;

        totalImpressions += m.impressions  || 0;
        totalClicks      += m.totalClicks  || 0;
        totalSpend       += m.amountSpent  || 0;

        // Platform breakdown
        if (!platformBreakdown[p.platform]) {
          platformBreakdown[p.platform] = {
            amountSpent:0, impressions:0, totalClicks:0, conversions:0,
            totalReach:0, addToCart:0, cpm:0, ctr:0, cpc:0
          };
        }
        const pb = platformBreakdown[p.platform];
        pb.amountSpent += m.amountSpent || 0;
        pb.impressions += m.impressions || 0;
        pb.totalClicks += m.totalClicks || 0;
        pb.conversions += m.conversions || 0;
        pb.totalReach  += m.totalReach  || 0;
        pb.addToCart   += m.addToCart   || 0;
      }
    }

    // Computed KPIs
    kpis.cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    kpis.ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100  : 0;
    kpis.cpc = totalClicks      > 0 ?  totalSpend / totalClicks               : 0;

    // Round everything
    Object.keys(kpis).forEach(k => {
      kpis[k] = parseFloat((kpis[k] || 0).toFixed(k === 'impressions' || k === 'totalClicks' || k === 'conversions' || k === 'totalReach' || k === 'addToCart' ? 0 : 2));
    });

    // Per-platform computed KPIs
    Object.keys(platformBreakdown).forEach(pl => {
      const pb = platformBreakdown[pl];
      pb.cpm = pb.impressions > 0 ? parseFloat(((pb.amountSpent / pb.impressions) * 1000).toFixed(2)) : 0;
      pb.ctr = pb.impressions > 0 ? parseFloat(((pb.totalClicks  / pb.impressions) * 100).toFixed(3))  : 0;
      pb.cpc = pb.totalClicks > 0 ? parseFloat((pb.amountSpent / pb.totalClicks).toFixed(2))           : 0;
      pb.amountSpent = parseFloat(pb.amountSpent.toFixed(2));
    });

    res.json({
      kpis,
      platformBreakdown,
      campaignCount: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
    });

  } catch (err) {
    console.error('[Analytics Overview]', err.message);
    res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ── Timeseries — KPI over time from metricsHistory ────────────────────────────
router.get('/timeseries', auth, async (req, res) => {
  try {
    const { kpi = 'impressions', period = '30d', platform, campaignId } = req.query;
    const { start } = getPeriodDates(period);

    // Include all statuses
    const filter = { userId: req.user._id, status: { $in: ['active','paused','completed','draft'] } };
    if (campaignId) filter._id = campaignId;
    const campaigns = await Campaign.find(filter);

    // Aggregate by date from metricsHistory
    const byDate = {};

    for (const campaign of campaigns) {
      const history = campaign.metricsHistory || [];
      for (const entry of history) {
        if (!entry.date || new Date(entry.date) < start) continue;
        if (platform && entry.platform !== platform) continue;

        const dateKey = new Date(entry.date).toISOString().split('T')[0];
        if (!byDate[dateKey]) {
          byDate[dateKey] = { date: dateKey, total: 0 };
        }
        byDate[dateKey].total += entry[kpi] || 0;

        // Per-platform
        if (!byDate[dateKey][entry.platform]) byDate[dateKey][entry.platform] = 0;
        byDate[dateKey][entry.platform] += entry[kpi] || 0;
      }
    }

    // Sort by date
    const data = Object.values(byDate).sort((a,b) => new Date(a.date)-new Date(b.date));

    // If no history data, return zeros across period so charts don't break
    if (data.length === 0) {
      const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
      for (let i = days; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        data.push({ date: d.toISOString().split('T')[0], total: 0 });
      }
    }

    res.json(data);
  } catch (err) {
    console.error('[Analytics Timeseries]', err.message);
    res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ── Platform performance ranking ──────────────────────────────────────────────
router.get('/platform-performance', auth, async (req, res) => {
  try {
    // Include active AND paused (paused campaigns still have real metrics)
    const campaigns = await Campaign.find({
      userId: req.user._id,
      status: { $in: ['active', 'paused', 'completed', 'draft'] }
    });

    const byPlatform = {};

    for (const campaign of campaigns) {
      for (const p of campaign.platforms || []) {
        const m = p.metrics || {};
        if (!byPlatform[p.platform]) {
          byPlatform[p.platform] = {
            platform:    p.platform,
            amountSpent: 0, impressions: 0, totalClicks: 0,
            conversions: 0, totalReach:  0, cpm: 0, ctr: 0, cpc: 0,
            campaignCount: 0,
          };
        }
        const pb = byPlatform[p.platform];
        pb.amountSpent += m.amountSpent || 0;
        pb.impressions += m.impressions || 0;
        pb.totalClicks += m.totalClicks || 0;
        pb.conversions += m.conversions || 0;
        pb.totalReach  += m.totalReach  || 0;
        pb.campaignCount++;
      }
    }

    // Compute derived KPIs
    const result = Object.values(byPlatform).map(pb => {
      pb.cpm = pb.impressions > 0 ? parseFloat(((pb.amountSpent / pb.impressions) * 1000).toFixed(2)) : 0;
      pb.ctr = pb.impressions > 0 ? parseFloat(((pb.totalClicks  / pb.impressions) * 100).toFixed(3))  : 0;
      pb.cpc = pb.totalClicks > 0 ? parseFloat((pb.amountSpent  / pb.totalClicks).toFixed(2))          : 0;
      pb.amountSpent = parseFloat(pb.amountSpent.toFixed(2));
      return pb;
    }).sort((a,b) => b.impressions - a.impressions);

    res.json(result);
  } catch (err) {
    console.error('[Analytics Platform Performance]', err.message);
    res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ── Compare two periods ───────────────────────────────────────────────────────
router.get('/compare', auth, async (req, res) => {
  try {
    const { start1, end1, start2, end2, platform, campaignId } = req.query;

    const campaigns = await Campaign.find({
      userId: req.user._id,
      status: { $in: ['active', 'paused', 'completed', 'draft'] }
    });

    function sumPeriod(startStr, endStr) {
      const s = new Date(startStr), e = new Date(endStr);
      const totals = {
        amountSpent:0, impressions:0, totalClicks:0, conversions:0, totalReach:0, addToCart:0,
        videoViews:0, video3SecViews:0, videoP25:0, videoP50:0, videoP75:0, videoP100:0,
        thruPlays:0, avgWatchTime:0
      };

      for (const campaign of campaigns) {
        for (const entry of campaign.metricsHistory || []) {
          const d = new Date(entry.date);
          if (d < s || d > e) continue;
          if (platform && entry.platform !== platform) continue;
          totals.amountSpent    += entry.amountSpent    || 0;
          totals.impressions    += entry.impressions    || 0;
          totals.totalClicks    += entry.totalClicks    || 0;
          totals.conversions    += entry.conversions    || 0;
          totals.totalReach     += entry.totalReach     || 0;
          totals.addToCart      += entry.addToCart      || 0;
          totals.videoViews     += entry.videoViews     || 0;
          totals.video3SecViews += entry.video3SecViews || 0;
          totals.videoP25       += entry.videoP25       || 0;
          totals.videoP50       += entry.videoP50       || 0;
          totals.videoP75       += entry.videoP75       || 0;
          totals.videoP100      += entry.videoP100      || 0;
          totals.thruPlays      += entry.thruPlays      || 0;
          totals.avgWatchTime   += entry.avgWatchTime   || 0;
        }
      }

      totals.cpm = totals.impressions > 0 ? (totals.amountSpent / totals.impressions) * 1000 : 0;
      totals.ctr = totals.impressions > 0 ? (totals.totalClicks  / totals.impressions) * 100  : 0;
      totals.cpc = totals.totalClicks  > 0 ?  totals.amountSpent / totals.totalClicks         : 0;

      Object.keys(totals).forEach(k => { totals[k] = parseFloat((totals[k]||0).toFixed(2)); });
      return totals;
    }

    const period1 = sumPeriod(start1, end1);
    const period2 = sumPeriod(start2, end2);

    // Calculate % change
    const changes = {};
    Object.keys(period1).forEach(k => {
      const p1 = period1[k] || 0, p2 = period2[k] || 0;
      changes[k] = p1 > 0 ? parseFloat((((p2 - p1) / p1) * 100).toFixed(1)) : p2 > 0 ? 100 : 0;
    });

    res.json({ period1, period2, changes });
  } catch (err) {
    console.error('[Analytics Compare]', err.message);
    res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});



// ── GET /api/analytics/compare/timeseries ─────────────────────────────────────
// Returns day-by-day data for two periods of a single campaign for chart overlay
router.get('/compare/timeseries', auth, async (req, res) => {
  try {
    const { campaignId, start1, end1, start2, end2, metric = 'amountSpent' } = req.query;
    if (!campaignId) return res.status(400).json({ message: 'campaignId is required' });

    const campaign = await Campaign.findOne({ _id: campaignId, userId: req.user._id });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    function getDailyData(startStr, endStr) {
      const s = new Date(startStr), e = new Date(endStr);
      const days = {};
      // init all days in range to 0
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        days[d.toISOString().split('T')[0]] = 0;
      }
      for (const entry of campaign.metricsHistory || []) {
        const day = new Date(entry.date).toISOString().split('T')[0];
        if (days[day] !== undefined) {
          days[day] += entry[metric] || 0;
        }
      }
      return Object.entries(days).map(([date, value], i) => ({
        day: i + 1, date, value: parseFloat((value || 0).toFixed(2))
      }));
    }

    const period1 = getDailyData(start1, end1);
    const period2 = getDailyData(start2, end2);

    // Normalize to same length for chart overlay
    const maxLen = Math.max(period1.length, period2.length);
    const chartData = Array.from({ length: maxLen }, (_, i) => ({
      day:    i + 1,
      period1: period1[i]?.value ?? null,
      period2: period2[i]?.value ?? null,
      date1:   period1[i]?.date  ?? null,
      date2:   period2[i]?.date  ?? null,
    }));

    res.json({ chartData, campaignName: campaign.name, metric });
  } catch (err) {
    console.error('[Route Error]', err.message);
    res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ── GET /api/analytics/video ──────────────────────────────────────────────────
// Returns aggregated video metrics across all campaigns, per platform
router.get('/video', auth, async (req, res) => {
  try {
    const { period = '30d', platform } = req.query;
    const userId = req.user._id;

    const campaigns = await Campaign.find({ userId }).lean();

    const totals = {
      videoViews: 0, video3SecViews: 0, videoP25: 0, videoP50: 0,
      videoP75: 0, videoP100: 0, thruPlays: 0, avgWatchTime: 0,
      cpv: 0, videoViewRate: 0, completionRate: 0, amountSpent: 0,
    };

    const byPlatform = {};

    campaigns.forEach(c => {
      c.platforms.forEach(p => {
        if (platform && p.platform !== platform) return;
        const m = p.metrics || {};
        if (!m.videoViews && !m.video3SecViews) return; // skip non-video

        if (!byPlatform[p.platform]) {
          byPlatform[p.platform] = { ...totals, platform: p.platform, campaigns: 0 };
        }
        const bp = byPlatform[p.platform];

        bp.campaigns++;
        bp.videoViews     += m.videoViews     || 0;
        bp.video3SecViews += m.video3SecViews || 0;
        bp.videoP25       += m.videoP25       || 0;
        bp.videoP50       += m.videoP50       || 0;
        bp.videoP75       += m.videoP75       || 0;
        bp.videoP100      += m.videoP100      || 0;
        bp.thruPlays      += m.thruPlays      || 0;
        bp.avgWatchTime   += m.avgWatchTime   || 0;
        bp.amountSpent    += m.amountSpent    || 0;

        totals.videoViews     += m.videoViews     || 0;
        totals.video3SecViews += m.video3SecViews || 0;
        totals.videoP25       += m.videoP25       || 0;
        totals.videoP50       += m.videoP50       || 0;
        totals.videoP75       += m.videoP75       || 0;
        totals.videoP100      += m.videoP100      || 0;
        totals.thruPlays      += m.thruPlays      || 0;
        totals.avgWatchTime   += m.avgWatchTime   || 0;
        totals.amountSpent    += m.amountSpent    || 0;
      });
    });

    // Compute derived metrics for totals
    const platformCount = Object.keys(byPlatform).length || 1;
    totals.cpv            = totals.videoViews   > 0 ? parseFloat((totals.amountSpent / totals.videoViews).toFixed(4))           : 0;
    totals.videoViewRate  = totals.videoViews   > 0 ? parseFloat(((totals.video3SecViews / totals.videoViews) * 100).toFixed(2)) : 0;
    totals.completionRate = totals.videoViews   > 0 ? parseFloat(((totals.videoP100 / totals.videoViews) * 100).toFixed(2))      : 0;
    totals.avgWatchTime   = parseFloat((totals.avgWatchTime / platformCount).toFixed(1));

    // Compute derived per platform
    const platformStats = Object.values(byPlatform).map(bp => ({
      ...bp,
      cpv:            bp.videoViews > 0 ? parseFloat((bp.amountSpent / bp.videoViews).toFixed(4))            : 0,
      videoViewRate:  bp.videoViews > 0 ? parseFloat(((bp.video3SecViews / bp.videoViews) * 100).toFixed(2)) : 0,
      completionRate: bp.videoViews > 0 ? parseFloat(((bp.videoP100 / bp.videoViews) * 100).toFixed(2))      : 0,
      avgWatchTime:   parseFloat((bp.avgWatchTime / (bp.campaigns || 1)).toFixed(1)),
      // Watch depth funnel as percentages
      funnel: {
        p3sec: bp.videoViews > 0 ? parseFloat(((bp.video3SecViews / bp.videoViews) * 100).toFixed(1)) : 0,
        p25:   bp.videoViews > 0 ? parseFloat(((bp.videoP25 / bp.videoViews) * 100).toFixed(1))       : 0,
        p50:   bp.videoViews > 0 ? parseFloat(((bp.videoP50 / bp.videoViews) * 100).toFixed(1))       : 0,
        p75:   bp.videoViews > 0 ? parseFloat(((bp.videoP75 / bp.videoViews) * 100).toFixed(1))       : 0,
        p100:  bp.videoViews > 0 ? parseFloat(((bp.videoP100 / bp.videoViews) * 100).toFixed(1))      : 0,
      },
    }));

    // Overall funnel
    const funnel = {
      p3sec: totals.videoViews > 0 ? parseFloat(((totals.video3SecViews / totals.videoViews) * 100).toFixed(1)) : 0,
      p25:   totals.videoViews > 0 ? parseFloat(((totals.videoP25 / totals.videoViews) * 100).toFixed(1))       : 0,
      p50:   totals.videoViews > 0 ? parseFloat(((totals.videoP50 / totals.videoViews) * 100).toFixed(1))       : 0,
      p75:   totals.videoViews > 0 ? parseFloat(((totals.videoP75 / totals.videoViews) * 100).toFixed(1))       : 0,
      p100:  totals.videoViews > 0 ? parseFloat(((totals.videoP100 / totals.videoViews) * 100).toFixed(1))      : 0,
    };

    res.json({ totals, funnel, byPlatform: platformStats });

  } catch (err) {
    console.error('[Route Error]', err.message);
    res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

module.exports = router;
