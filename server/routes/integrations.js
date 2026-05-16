const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const { createNotification } = require('../utils/notifications');

// ── Helper ────────────────────────────────────────────────────────────────────
const updateConnection = async (userId, platform, data) => {
  const user = await User.findById(userId);
  const idx = user.connectedPlatforms.findIndex(p => p.platform === platform);
  if (idx >= 0) Object.assign(user.connectedPlatforms[idx], data);
  else user.connectedPlatforms.push({ platform, ...data });
  await user.save();
  return user;
};

// ── GET connections ───────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  const user = await User.findById(req.user._id).select('connectedPlatforms');
  const safe = (user.connectedPlatforms || []).map(p => ({
    platform: p.platform, accountId: p.accountId, accountName: p.accountName,
    status: p.status, lastSync: p.lastSync, connectedAt: p.connectedAt,
    errorMessage: p.errorMessage, hasToken: !!p.accessToken
  }));
  res.json(safe);
});

// ── CONNECT ───────────────────────────────────────────────────────────────────
router.post('/:platform/connect', auth, async (req, res) => {
  const { platform } = req.params;
  const creds = req.body;
  try {
    let accountInfo = {};

    if (platform === 'meta') {
      const { accessToken, adAccountId } = creds;
      if (!accessToken || !adAccountId)
        return res.status(400).json({ message: 'Access Token and Ad Account ID are required' });

      const normalizedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

      let userName = 'Meta User';
      try {
        const meRes = await axios.get('https://graph.facebook.com/v19.0/me', {
          params: { fields: 'id,name', access_token: accessToken }
        });
        userName = meRes.data.name || userName;
      } catch (meErr) {
        return res.status(400).json({ message: `Invalid Access Token: ${meErr.response?.data?.error?.message || meErr.message}` });
      }

      let accountName = `Meta Ads (${normalizedId})`;
      try {
        const acctRes = await axios.get(`https://graph.facebook.com/v19.0/${normalizedId}`, {
          params: { fields: 'id,name,currency,account_status', access_token: accessToken }
        });
        if (acctRes.data.name) accountName = acctRes.data.name;
      } catch (acctErr) {
        console.warn('[Meta Connect] Ad account fetch warning:', acctErr.response?.data?.error?.message);
      }

      accountInfo = {
        accountId: normalizedId, accountName: `${accountName} · ${userName}`,
        accessToken, status: 'connected', lastSync: new Date(), errorMessage: null
      };
    }

    else if (platform === 'google') {
      const { developerToken, customerId, accessToken, refreshToken } = creds;
      if (!developerToken || !customerId) return res.status(400).json({ message: 'Developer Token and Customer ID are required' });
      accountInfo = { accountId: customerId, accountName: `Google Ads (${customerId})`, accessToken: accessToken || refreshToken, developerToken, customerId, refreshToken: refreshToken || null, status: 'connected', lastSync: new Date(), errorMessage: null };
    }
    else if (platform === 'tiktok') {
      const { accessToken, advertiserId } = creds;
      if (!accessToken || !advertiserId) return res.status(400).json({ message: 'Access Token and Advertiser ID are required' });
      accountInfo = { accountId: advertiserId, accountName: `TikTok Ads (${advertiserId})`, accessToken, advertiserId, status: 'connected', lastSync: new Date(), errorMessage: null };
    }
    else if (platform === 'linkedin') {
      const { accessToken, adAccountId } = creds;
      if (!accessToken || !adAccountId) return res.status(400).json({ message: 'Access Token and Ad Account ID are required' });
      accountInfo = { accountId: adAccountId, accountName: `LinkedIn Ads (${adAccountId})`, accessToken, status: 'connected', lastSync: new Date(), errorMessage: null };
    }
    else if (platform === 'twitter') {
      const { bearerToken, apiKey, apiSecret } = creds;
      if (!bearerToken) return res.status(400).json({ message: 'Bearer Token is required' });
      accountInfo = { accountId: 'twitter', accountName: 'X (Twitter) Ads', accessToken: bearerToken, appId: apiKey || null, appSecret: apiSecret || null, status: 'connected', lastSync: new Date(), errorMessage: null };
    }
    else if (platform === 'snapchat') {
      const { accessToken, adAccountId } = creds;
      if (!accessToken || !adAccountId) return res.status(400).json({ message: 'Access Token and Ad Account ID are required' });
      accountInfo = { accountId: adAccountId, accountName: `Snapchat Ads (${adAccountId})`, accessToken, status: 'connected', lastSync: new Date(), errorMessage: null };
    }
    else if (platform === 'youtube') {
      const { accessToken, refreshToken, clientId } = creds;
      if (!accessToken) return res.status(400).json({ message: 'Access Token is required' });
      accountInfo = { accountId: 'youtube', accountName: 'YouTube Channel', accessToken, refreshToken: refreshToken || null, appId: clientId || null, status: 'connected', lastSync: new Date(), errorMessage: null };
    }
    else {
      return res.status(400).json({ message: `Unknown platform: ${platform}` });
    }

    await updateConnection(req.user._id, platform, accountInfo);
    res.json({ success: true, message: `${platform} connected`, account: { accountId: accountInfo.accountId, accountName: accountInfo.accountName } });
  } catch (err) {
    console.error(`[${platform} Connect Error]`, err.response?.data || err.message);
    const apiError = err.response?.data?.error?.message || err.response?.data?.message || err.message;
    await updateConnection(req.user._id, platform, { status: 'error', errorMessage: apiError }).catch(() => {});
    res.status(400).json({ message: `Failed to connect ${platform}: ${apiError}` });
  }
});

// ── DISCONNECT ────────────────────────────────────────────────────────────────
router.delete('/:platform', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.connectedPlatforms = user.connectedPlatforms.filter(p => p.platform !== req.params.platform);
    await user.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── CHECK PERMISSIONS ─────────────────────────────────────────────────────────
router.get('/:platform/check-permissions', auth, async (req, res) => {
  const { platform } = req.params;
  try {
    const user = await User.findById(req.user._id);
    const conn = user.connectedPlatforms.find(p => p.platform === platform);
    if (!conn) return res.status(404).json({ message: 'Platform not connected' });
    const results = { tokenValid: false, permissions: [], missingPermissions: [], canReadCampaigns: false };
    if (platform === 'meta') {
      try {
        const meRes = await axios.get('https://graph.facebook.com/v19.0/me', { params: { fields: 'id,name', access_token: conn.accessToken } });
        results.tokenValid = true; results.userName = meRes.data.name;
      } catch { results.tokenValid = false; results.error = 'Token invalid or expired'; return res.json(results); }
      try {
        const permRes = await axios.get('https://graph.facebook.com/v19.0/me/permissions', { params: { access_token: conn.accessToken } });
        results.permissions = (permRes.data?.data || []).filter(p => p.status === 'granted').map(p => p.permission);
        results.missingPermissions = ['ads_read', 'ads_management'].filter(p => !results.permissions.includes(p));
      } catch {}
      try {
        await axios.get(`https://graph.facebook.com/v19.0/${conn.accountId}/campaigns`, { params: { fields: 'id,name', limit: 1, access_token: conn.accessToken } });
        results.canReadCampaigns = true;
      } catch (e) { results.campaignError = e.response?.data?.error?.message || e.message; }
    }
    res.json(results);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── SYNC with full debug logging ──────────────────────────────────────────────
router.post('/:platform/sync', auth, async (req, res) => {
  const { platform } = req.params;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[SYNC START] Platform: ${platform} | User: ${req.user.email}`);
  console.log(`${'='.repeat(60)}`);

  try {
    const user = await User.findById(req.user._id);
    const conn = user.connectedPlatforms.find(p => p.platform === platform);

    if (!conn) {
      console.log('[SYNC ERROR] Platform not connected');
      return res.status(404).json({ message: 'Platform not connected. Connect it first.' });
    }
    if (!conn.accessToken) {
      console.log('[SYNC ERROR] No access token stored');
      return res.status(400).json({ message: 'No access token. Please reconnect.' });
    }

    console.log(`[SYNC] Account ID: ${conn.accountId}`);
    console.log(`[SYNC] Token (first 20 chars): ${conn.accessToken.slice(0, 20)}...`);

    let imported = 0, updated = 0, paymentIssues = [];

    // ════════════════════════════════════════════════════════════
    // META SYNC
    // ════════════════════════════════════════════════════════════
    if (platform === 'meta') {

      // Step 1: Verify token still works
      console.log('\n[SYNC Step 1] Verifying token via /me...');
      try {
        const meRes = await axios.get('https://graph.facebook.com/v19.0/me', {
          params: { fields: 'id,name', access_token: conn.accessToken }
        });
        console.log(`[SYNC Step 1] ✅ Token valid. User: ${meRes.data.name} (${meRes.data.id})`);
      } catch (meErr) {
        const msg = meErr.response?.data?.error?.message || meErr.message;
        console.log(`[SYNC Step 1] ❌ Token invalid: ${msg}`);
        await updateConnection(req.user._id, platform, { status: 'error', errorMessage: `Token expired: ${msg}` });
        return res.status(401).json({
          message: `Your Meta access token has expired. Please reconnect: ${msg}`,
          tokenExpired: true
        });
      }

      // Step 2: Fetch campaigns — ALL statuses
      console.log(`\n[SYNC Step 2] Fetching campaigns from ${conn.accountId}...`);
      let metaCampaigns = [];

      // Try multiple approaches to get all campaigns
      const fetchAttempts = [
        // Attempt 1: Standard fetch without status filter
        {
          label: 'No status filter',
          params: {
            fields: 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time',
            limit: 200,
            access_token: conn.accessToken
          }
        },
        // Attempt 2: Explicitly request all statuses
        {
          label: 'All statuses explicit',
          params: {
            fields: 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time',
            effective_status: JSON.stringify(['ACTIVE','PAUSED','DELETED','ARCHIVED','IN_PROCESS','WITH_ISSUES','PENDING_REVIEW','DISAPPROVED','PREAPPROVED','PENDING_BILLING_INFO','CAMPAIGN_PAUSED','ADSET_PAUSED']),
            limit: 200,
            access_token: conn.accessToken
          }
        }
      ];

      for (const attempt of fetchAttempts) {
        if (metaCampaigns.length > 0) break;
        try {
          console.log(`[SYNC Step 2] Trying: ${attempt.label}`);
          const campRes = await axios.get(
            `https://graph.facebook.com/v19.0/${conn.accountId}/campaigns`,
            { params: attempt.params }
          );
          metaCampaigns = campRes.data?.data || [];
          const nextPage = campRes.data?.paging?.next;
          console.log(`[SYNC Step 2] ✅ Found ${metaCampaigns.length} campaigns${nextPage ? ' (more pages available)' : ''}`);

          // Fetch next pages if available
          let nextUrl = nextPage;
          let pageCount = 1;
          while (nextUrl && pageCount < 10) {
            const nextRes = await axios.get(nextUrl);
            const nextData = nextRes.data?.data || [];
            metaCampaigns = metaCampaigns.concat(nextData);
            nextUrl = nextRes.data?.paging?.next;
            pageCount++;
            console.log(`[SYNC Step 2] Fetched page ${pageCount}, total now: ${metaCampaigns.length}`);
          }
        } catch (e) {
          const errMsg = e.response?.data?.error?.message || e.message;
          console.log(`[SYNC Step 2] ❌ Attempt "${attempt.label}" failed: ${errMsg}`);
          if (attempt === fetchAttempts[fetchAttempts.length - 1]) {
            // All attempts failed
            await updateConnection(req.user._id, platform, { status: 'error', errorMessage: errMsg });
            return res.status(400).json({ message: `Could not fetch Meta campaigns: ${errMsg}` });
          }
        }
      }

      if (metaCampaigns.length === 0) {
        console.log('[SYNC Step 2] ⚠️  No campaigns found in this ad account');
        await updateConnection(req.user._id, platform, { lastSync: new Date(), status: 'connected', errorMessage: null });
        return res.json({
          success: true, imported: 0, updated: 0, paymentIssues: 0,
          message: 'Sync complete — no campaigns found in this ad account. Create a campaign in Meta Ads Manager first, then sync again.'
        });
      }

      // Step 3: Log all campaigns found
      console.log('\n[SYNC Step 3] Campaigns found:');
      metaCampaigns.forEach((c, i) => {
        console.log(`  ${i + 1}. "${c.name}" | status: ${c.status} | effective: ${c.effective_status} | id: ${c.id}`);
      });

      // Status mapping
      const statusMap = {
        'ACTIVE': 'active', 'PAUSED': 'paused', 'DELETED': 'paused',
        'ARCHIVED': 'paused', 'CAMPAIGN_PAUSED': 'paused', 'ADSET_PAUSED': 'paused',
        'PENDING_REVIEW': 'draft', 'DISAPPROVED': 'paused', 'PREAPPROVED': 'draft',
        'PENDING_BILLING_INFO': 'paused', 'IN_PROCESS': 'active', 'WITH_ISSUES': 'paused',
      };

      const objectiveMap = {
        BRAND_AWARENESS: 'awareness', REACH: 'reach', LINK_CLICKS: 'traffic',
        POST_ENGAGEMENT: 'engagement', APP_INSTALLS: 'app_installs',
        VIDEO_VIEWS: 'video_views', LEAD_GENERATION: 'lead_generation',
        MESSAGES: 'messages', CONVERSIONS: 'conversions',
        PRODUCT_CATALOG_SALES: 'catalog_sales', STORE_VISITS: 'store_traffic',
        OUTCOME_AWARENESS: 'awareness', OUTCOME_TRAFFIC: 'traffic',
        OUTCOME_ENGAGEMENT: 'engagement', OUTCOME_LEADS: 'lead_generation',
        OUTCOME_SALES: 'conversions', OUTCOME_APP_PROMOTION: 'app_installs'
      };

      // Step 4: Process each campaign
      console.log('\n[SYNC Step 4] Processing campaigns...');
      for (const mc of metaCampaigns) {
        const effectiveStatus = mc.effective_status || mc.status;
        const mappedStatus    = statusMap[effectiveStatus] || 'paused';
        const mappedObj       = objectiveMap[mc.objective] || 'awareness';
        const budget          = parseFloat(mc.daily_budget || mc.lifetime_budget || 0) / 100;

        // Check for payment issues
        if (['WITH_ISSUES', 'PENDING_BILLING_INFO'].includes(effectiveStatus)) {
          console.log(`  ⚠️  Payment issue on "${mc.name}": ${effectiveStatus}`);
          paymentIssues.push({ campaignName: mc.name, issue: effectiveStatus });
        }

        // Fetch insights
        let metrics = { amountSpent:0, impressions:0, cpm:0, totalClicks:0, ctr:0, cpc:0, conversions:0, totalReach:0, addToCart:0 };
        try {
          const insRes = await axios.get(`https://graph.facebook.com/v19.0/${mc.id}/insights`, {
            params: { fields: 'spend,impressions,cpm,clicks,ctr,cpc,reach,actions', date_preset: 'last_30d', access_token: conn.accessToken }
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
            const cart = (ins.actions || []).find(a => a.action_type === 'add_to_cart');
            const conv = (ins.actions || []).find(a => a.action_type === 'purchase');
            metrics.addToCart   = parseInt(cart?.value || 0);
            metrics.conversions = parseInt(conv?.value  || 0);
            console.log(`  📊 "${mc.name}" insights: spent=$${metrics.amountSpent}, impressions=${metrics.impressions}`);
          } else {
            console.log(`  📊 "${mc.name}" has no insights data (no spend in last 30 days)`);
          }
        } catch (insErr) {
          console.log(`  ⚠️  Could not fetch insights for "${mc.name}": ${insErr.response?.data?.error?.message || insErr.message}`);
        }

        const platformData = {
          platform: 'meta', platformCampaignId: mc.id,
          status: mappedStatus, budget,
          budgetType: mc.daily_budget ? 'daily' : 'lifetime',
          objective: mappedObj, metrics
        };

        // Check if campaign already exists in DB
        const existing = await Campaign.findOne({
          userId: req.user._id,
          'platforms.platformCampaignId': mc.id
        });

        if (existing) {
          const pIdx = existing.platforms.findIndex(p => p.platformCampaignId === mc.id);
          if (pIdx >= 0) {
            existing.platforms[pIdx] = { ...existing.platforms[pIdx].toObject(), ...platformData };
            existing.status = mappedStatus;
            if (metrics.impressions > 0 || metrics.amountSpent > 0) {
              existing.metricsHistory = existing.metricsHistory || [];
              existing.metricsHistory.push({ date: new Date(), platform: 'meta', ...metrics });
            }
            await existing.save();
            updated++;
            console.log(`  ✅ Updated: "${mc.name}" → status: ${mappedStatus}`);
          }
        } else {
          await Campaign.create({
            userId: req.user._id, name: mc.name,
            objective: mappedObj, status: mappedStatus,
            startDate: mc.start_time ? new Date(mc.start_time) : undefined,
            endDate:   mc.stop_time  ? new Date(mc.stop_time)  : undefined,
            totalBudget: budget, currency: 'USD',
            platforms: [platformData],
            tags: ['imported', 'meta'],
            notes: effectiveStatus !== 'ACTIVE' ? `Imported from Meta (${effectiveStatus})` : ''
          });
          imported++;
          console.log(`  ✅ Imported: "${mc.name}" → status: ${mappedStatus}`);
        }
      }

      // Send payment notifications
      for (const issue of paymentIssues) {
        await createNotification(req.user._id, {
          type: 'error', category: 'budget',
          title: '❌ Meta Payment Issue',
          message: `Campaign "${issue.campaignName}" is paused due to a payment problem (${issue.issue}). Check your Meta payment method at business.facebook.com`,
          link: '/ad-spend',
          meta: { platform: 'meta', issue: issue.issue }
        });
      }
    }

    // ════════════════════════════════════════════════════════════
    // GOOGLE SYNC
    // ════════════════════════════════════════════════════════════
    else if (platform === 'google') {
      const cleanId = (conn.customerId || conn.accountId).replace(/-/g, '');
      console.log(`[SYNC Google] Customer ID: ${cleanId}`);
      const query = `SELECT campaign.id, campaign.name, campaign.status, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc, metrics.conversions FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.impressions DESC LIMIT 200`;
      try {
        const gRes = await axios.post(
          `https://googleads.googleapis.com/v15/customers/${cleanId}/googleAds:search`,
          { query },
          { headers: { 'developer-token': conn.developerToken, 'Authorization': `Bearer ${conn.accessToken}`, 'login-customer-id': cleanId } }
        );
        const rows = gRes.data?.results || [];
        console.log(`[SYNC Google] Found ${rows.length} campaigns`);
        for (const row of rows) {
          const c = row.campaign, m = row.metrics;
          const spend = (m?.cost_micros || 0) / 1_000_000;
          const metrics = { amountSpent: parseFloat(spend.toFixed(2)), impressions: parseInt(m?.impressions || 0), totalClicks: parseInt(m?.clicks || 0), ctr: parseFloat(((m?.ctr || 0)*100).toFixed(3)), cpc: parseFloat(((m?.average_cpc||0)/1_000_000).toFixed(2)), cpm: m?.impressions>0?parseFloat((spend/m.impressions*1000).toFixed(2)):0, conversions: Math.floor(m?.conversions||0), totalReach: parseInt(m?.impressions||0), addToCart:0 };
          const gStatus = c.status === 'ENABLED' ? 'active' : 'paused';
          const existing = await Campaign.findOne({ userId: req.user._id, 'platforms.platformCampaignId': c.id });
          if (!existing) {
            await Campaign.create({ userId: req.user._id, name: c.name, objective: 'traffic', status: gStatus, totalBudget: spend, currency: 'USD', platforms: [{ platform:'google', platformCampaignId: c.id, status: gStatus, budget: spend, metrics }], tags: ['imported','google'] });
            imported++;
          } else {
            const pIdx = existing.platforms.findIndex(p => p.platformCampaignId === c.id);
            if (pIdx >= 0) { existing.platforms[pIdx].metrics = metrics; existing.platforms[pIdx].status = gStatus; await existing.save(); updated++; }
          }
        }
      } catch (gErr) {
        const gMsg = gErr.response?.data?.error?.message || gErr.message;
        console.log(`[SYNC Google] ❌ Error: ${gMsg}`);
        return res.status(400).json({ message: `Google Ads sync failed: ${gMsg}` });
      }
    }

    // ════════════════════════════════════════════════════════════
    // TIKTOK SYNC
    // ════════════════════════════════════════════════════════════
    else if (platform === 'tiktok') {
      try {
        const ttRes = await axios.get('https://business-api.tiktok.com/open_api/v1.3/campaign/get/', {
          params: { advertiser_id: conn.advertiserId, fields: JSON.stringify(['campaign_id','campaign_name','status','objective_type','budget','budget_mode']) },
          headers: { 'Access-Token': conn.accessToken }
        });
        const campaigns = ttRes.data?.data?.list || [];
        console.log(`[SYNC TikTok] Found ${campaigns.length} campaigns`);
        for (const c of campaigns) {
          const ttStatus = c.status === 'ENABLE' ? 'active' : 'paused';
          const existing = await Campaign.findOne({ userId: req.user._id, 'platforms.platformCampaignId': String(c.campaign_id) });
          if (!existing) {
            await Campaign.create({ userId: req.user._id, name: c.campaign_name, objective: 'awareness', status: ttStatus, totalBudget: c.budget||0, currency: 'USD', platforms: [{ platform:'tiktok', platformCampaignId: String(c.campaign_id), status: ttStatus, budget: c.budget||0, metrics:{ amountSpent:0,impressions:0,cpm:0,totalClicks:0,ctr:0,cpc:0,conversions:0,totalReach:0,addToCart:0 } }], tags: ['imported','tiktok'] });
            imported++;
          }
        }
      } catch (ttErr) {
        return res.status(400).json({ message: `TikTok sync failed: ${ttErr.response?.data?.message || ttErr.message}` });
      }
    }

    // Update last sync
    await updateConnection(req.user._id, platform, { lastSync: new Date(), status: 'connected', errorMessage: null });

    const summary = `Sync complete — ${imported} imported, ${updated} updated${paymentIssues.length > 0 ? `, ⚠️ ${paymentIssues.length} payment issue(s)` : ''}`;
    console.log(`\n[SYNC COMPLETE] ${summary}`);
    console.log('='.repeat(60) + '\n');

    res.json({ success: true, imported, updated, paymentIssues: paymentIssues.length, message: summary });

  } catch (err) {
    console.error(`[SYNC ERROR]`, err.message);
    await updateConnection(req.user._id, platform, { status: 'error', errorMessage: err.message }).catch(() => {});
    res.status(500).json({ message: `Sync failed: ${err.message}` });
  }
});

module.exports = router;
