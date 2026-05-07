const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Campaign = require('../models/Campaign');

// ── Helpers ───────────────────────────────────────────────────────────────────
const updateConnection = async (userId, platform, data) => {
  const user = await User.findById(userId);
  const idx = user.connectedPlatforms.findIndex(p => p.platform === platform);
  if (idx >= 0) {
    Object.assign(user.connectedPlatforms[idx], data);
  } else {
    user.connectedPlatforms.push({ platform, ...data });
  }
  await user.save();
  return user;
};

// ── GET all connections ───────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  const user = await User.findById(req.user._id).select('connectedPlatforms');
  const safe = (user.connectedPlatforms || []).map(p => ({
    platform: p.platform, accountId: p.accountId, accountName: p.accountName,
    status: p.status, lastSync: p.lastSync, connectedAt: p.connectedAt,
    errorMessage: p.errorMessage, hasToken: !!p.accessToken
  }));
  res.json(safe);
});

// ── CONNECT / UPDATE a platform ───────────────────────────────────────────────
router.post('/:platform/connect', auth, async (req, res) => {
  const { platform } = req.params;
  const creds = req.body;

  try {
    let accountInfo = {};

    // ── META ──────────────────────────────────────────────────────────────────
    if (platform === 'meta') {
      const { accessToken, adAccountId } = creds;
      if (!accessToken || !adAccountId)
        return res.status(400).json({ message: 'Access Token and Ad Account ID are required' });

      // Normalise adAccountId — must start with act_
      const normalizedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

      // Step 1: Verify the access token by calling /me
      // This only needs basic permissions (no pages_read_engagement)
      let userName = 'Meta User';
      try {
        const meRes = await axios.get('https://graph.facebook.com/v19.0/me', {
          params: { fields: 'id,name', access_token: accessToken }
        });
        userName = meRes.data.name || userName;
      } catch (meErr) {
        const msg = meErr.response?.data?.error?.message || meErr.message;
        return res.status(400).json({ message: `Invalid Access Token: ${msg}` });
      }

      // Step 2: Try fetching the ad account — requires ads_read permission
      // If this fails we still connect (token is valid, ad account perms may be granted later)
      let accountName = `Meta Ads (${normalizedId})`;
      try {
        const acctRes = await axios.get(`https://graph.facebook.com/v19.0/${normalizedId}`, {
          params: { fields: 'id,name,currency,account_status', access_token: accessToken }
        });
        if (acctRes.data.name) accountName = acctRes.data.name;
      } catch (acctErr) {
        const acctMsg = acctErr.response?.data?.error?.message || '';
        console.warn('[Meta] Ad account fetch warning (token still valid):', acctMsg);
        // Don't fail — token verified via /me is enough to store the connection
      }

      accountInfo = {
        accountId: normalizedId,
        accountName: `${accountName} · ${userName}`,
        accessToken, status: 'connected', lastSync: new Date(), errorMessage: null
      };
    }

    // ── GOOGLE ADS ────────────────────────────────────────────────────────────
    else if (platform === 'google') {
      const { clientId, clientSecret, developerToken, customerId, refreshToken, accessToken } = creds;
      if (!developerToken || !customerId)
        return res.status(400).json({ message: 'Developer Token and Customer ID are required' });

      const token = accessToken || refreshToken;
      if (!token)
        return res.status(400).json({ message: 'Access Token or Refresh Token is required' });

      const cleanCustomerId = customerId.replace(/-/g, '');
      let accountName = `Google Ads (${customerId})`;

      try {
        const gRes = await axios.post(
          `https://googleads.googleapis.com/v15/customers/${cleanCustomerId}/googleAds:search`,
          { query: 'SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1' },
          {
            headers: {
              'developer-token': developerToken,
              'Authorization': `Bearer ${token}`,
              'login-customer-id': cleanCustomerId,
              'Content-Type': 'application/json'
            }
          }
        );
        const customer = gRes.data?.results?.[0]?.customer;
        if (customer?.descriptiveName) accountName = customer.descriptiveName;
      } catch (gErr) {
        const gMsg = gErr.response?.data?.error?.message || gErr.message;
        console.warn('[Google] Verify warning:', gMsg);
        // If it's an auth error, reject. Otherwise proceed.
        if (gErr.response?.status === 401 || gErr.response?.status === 403) {
          return res.status(400).json({ message: `Google Ads auth failed: ${gMsg}` });
        }
      }

      accountInfo = {
        accountId: customerId, accountName,
        accessToken: token, developerToken, customerId,
        refreshToken: refreshToken || null,
        status: 'connected', lastSync: new Date(), errorMessage: null
      };
    }

    // ── TIKTOK ────────────────────────────────────────────────────────────────
    else if (platform === 'tiktok') {
      const { appId, accessToken, advertiserId } = creds;
      if (!accessToken || !advertiserId)
        return res.status(400).json({ message: 'Access Token and Advertiser ID are required' });

      let accountName = `TikTok Ads (${advertiserId})`;
      try {
        const ttRes = await axios.get('https://business-api.tiktok.com/open_api/v1.3/user/info/', {
          headers: { 'Access-Token': accessToken }
        });
        if (ttRes.data?.data?.display_name) accountName = ttRes.data.data.display_name;
      } catch (ttErr) {
        const ttMsg = ttErr.response?.data?.message || ttErr.message;
        if (ttErr.response?.data?.code === 40001) {
          return res.status(400).json({ message: `Invalid TikTok Access Token: ${ttMsg}` });
        }
        console.warn('[TikTok] Verify warning:', ttMsg);
      }

      accountInfo = {
        accountId: advertiserId, accountName,
        accessToken, appId: appId || null, advertiserId,
        status: 'connected', lastSync: new Date(), errorMessage: null
      };
    }

    // ── LINKEDIN ──────────────────────────────────────────────────────────────
    else if (platform === 'linkedin') {
      const { accessToken, adAccountId } = creds;
      if (!accessToken || !adAccountId)
        return res.status(400).json({ message: 'Access Token and Ad Account ID are required' });

      let accountName = `LinkedIn Ads (${adAccountId})`;
      try {
        const liRes = await axios.get('https://api.linkedin.com/v2/me', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const firstName = liRes.data.localizedFirstName || '';
        const lastName  = liRes.data.localizedLastName  || '';
        if (firstName || lastName) accountName = `LinkedIn (${firstName} ${lastName}`.trim() + ')';
      } catch (liErr) {
        const liMsg = liErr.response?.data?.message || liErr.message;
        if (liErr.response?.status === 401) {
          return res.status(400).json({ message: `Invalid LinkedIn Access Token: ${liMsg}` });
        }
        console.warn('[LinkedIn] Verify warning:', liMsg);
      }

      accountInfo = {
        accountId: adAccountId, accountName,
        accessToken, status: 'connected', lastSync: new Date(), errorMessage: null
      };
    }

    // ── TWITTER / X ───────────────────────────────────────────────────────────
    else if (platform === 'twitter') {
      const { bearerToken, apiKey, apiSecret } = creds;
      if (!bearerToken)
        return res.status(400).json({ message: 'Bearer Token is required' });

      let accountName = 'X (Twitter) Ads';
      let accountId = 'twitter';
      try {
        const twRes = await axios.get('https://api.twitter.com/2/users/me', {
          headers: { Authorization: `Bearer ${bearerToken}` }
        });
        accountId   = twRes.data?.data?.id    || accountId;
        accountName = twRes.data?.data?.name  || accountName;
      } catch (twErr) {
        const twMsg = twErr.response?.data?.title || twErr.message;
        if (twErr.response?.status === 401) {
          return res.status(400).json({ message: `Invalid Bearer Token: ${twMsg}` });
        }
        console.warn('[Twitter] Verify warning:', twMsg);
      }

      accountInfo = {
        accountId, accountName,
        accessToken: bearerToken, appId: apiKey || null, appSecret: apiSecret || null,
        status: 'connected', lastSync: new Date(), errorMessage: null
      };
    }

    // ── SNAPCHAT ──────────────────────────────────────────────────────────────
    else if (platform === 'snapchat') {
      const { accessToken, adAccountId } = creds;
      if (!accessToken || !adAccountId)
        return res.status(400).json({ message: 'Access Token and Ad Account ID are required' });

      let accountName = `Snapchat Ads (${adAccountId})`;
      try {
        const scRes = await axios.get('https://adsapi.snapchat.com/v1/me', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (scRes.data?.me?.display_name) accountName = scRes.data.me.display_name;
      } catch (scErr) {
        const scMsg = scErr.response?.data?.display_message || scErr.message;
        if (scErr.response?.status === 401) {
          return res.status(400).json({ message: `Invalid Snapchat Access Token: ${scMsg}` });
        }
        console.warn('[Snapchat] Verify warning:', scMsg);
      }

      accountInfo = {
        accountId: adAccountId, accountName,
        accessToken, status: 'connected', lastSync: new Date(), errorMessage: null
      };
    }

    // ── YOUTUBE (via Google OAuth) ────────────────────────────────────────────
    else if (platform === 'youtube') {
      const { accessToken, refreshToken, clientId } = creds;
      if (!accessToken)
        return res.status(400).json({ message: 'Access Token is required' });

      let accountName = 'YouTube Channel';
      let accountId = 'youtube';
      try {
        const ytRes = await axios.get(
          'https://www.googleapis.com/youtube/v3/channels',
          { params: { part: 'snippet', mine: true, access_token: accessToken } }
        );
        const channel = ytRes.data?.items?.[0];
        if (channel) {
          accountId   = channel.id;
          accountName = channel.snippet?.title || accountName;
        }
      } catch (ytErr) {
        const ytMsg = ytErr.response?.data?.error?.message || ytErr.message;
        if (ytErr.response?.status === 401) {
          return res.status(400).json({ message: `Invalid YouTube Access Token: ${ytMsg}` });
        }
        console.warn('[YouTube] Verify warning:', ytMsg);
      }

      accountInfo = {
        accountId, accountName,
        accessToken, refreshToken: refreshToken || null, appId: clientId || null,
        status: 'connected', lastSync: new Date(), errorMessage: null
      };
    }

    else {
      return res.status(400).json({ message: `Unknown platform: ${platform}` });
    }

    await updateConnection(req.user._id, platform, accountInfo);
    const { logAction } = require("../utils/audit");
    await logAction(req.user._id, "platform.connect", "platform", platform, { accountId: accountInfo.accountId }, req);
    res.json({
      success: true,
      message: `${platform} connected successfully`,
      account: { accountId: accountInfo.accountId, accountName: accountInfo.accountName }
    });

  } catch (err) {
    console.error(`[${platform} Connect Error]`, err.response?.data || err.message);
    const apiError = err.response?.data?.error?.message
      || err.response?.data?.message
      || err.message;
    await updateConnection(req.user._id, platform, {
      status: 'error', errorMessage: apiError
    }).catch(() => {});
    res.status(400).json({ message: `Failed to connect ${platform}: ${apiError}` });
  }
});

// ── DISCONNECT ────────────────────────────────────────────────────────────────
router.delete('/:platform', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.connectedPlatforms = user.connectedPlatforms.filter(p => p.platform !== req.params.platform);
    await user.save();
    res.json({ success: true, message: `${req.params.platform} disconnected` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── CHECK PERMISSIONS ──────────────────────────────────────────────────────
router.get("/:platform/check-permissions", auth, async (req, res) => {
  const { platform } = req.params;
  try {
    const user = await User.findById(req.user._id);
    const conn = user.connectedPlatforms.find(p => p.platform === platform);
    if (!conn) return res.status(404).json({ message: "Platform not connected" });
    const results = { tokenValid:false, permissions:[], missingPermissions:[], canReadCampaigns:false, canReadInsights:false };
    if (platform === "meta") {
      try {
        const meRes = await axios.get("https://graph.facebook.com/v19.0/me", { params:{ fields:"id,name", access_token:conn.accessToken } });
        results.tokenValid = true; results.userName = meRes.data.name;
      } catch { results.tokenValid = false; results.error = "Token invalid or expired"; return res.json(results); }
      try {
        const permRes = await axios.get("https://graph.facebook.com/v19.0/me/permissions", { params:{ access_token:conn.accessToken } });
        results.permissions = (permRes.data?.data||[]).filter(p=>p.status==="granted").map(p=>p.permission);
        results.missingPermissions = ["ads_read","ads_management"].filter(p=>!results.permissions.includes(p));
      } catch {}
      try {
        await axios.get(`https://graph.facebook.com/v19.0/${conn.accountId}/campaigns`, { params:{ fields:"id,name", limit:1, access_token:conn.accessToken } });
        results.canReadCampaigns = true;
      } catch(e) { results.campaignError = e.response?.data?.error?.message || e.message; }
    }
    res.json(results);
  } catch(err) { res.status(500).json({ message:err.message }); }
});

// ── SYNC campaigns from a platform ───────────────────────────────────────────
router.post('/:platform/sync', auth, async (req, res) => {
  const { platform } = req.params;
  try {
    const user = await User.findById(req.user._id);
    const conn = user.connectedPlatforms.find(p => p.platform === platform);
    if (!conn) return res.status(404).json({ message: 'Platform not connected. Connect it first.' });
    if (!conn.accessToken) return res.status(400).json({ message: 'No access token stored. Please reconnect.' });

    let imported = [];
    let updated  = 0;

    // ── META SYNC ─────────────────────────────────────────────────────────────
    if (platform === 'meta') {
      const fields = 'name,status,objective,daily_budget,lifetime_budget,start_time,stop_time';
      let metaCampaigns = [];

      try {
        const campRes = await axios.get(
          `https://graph.facebook.com/v19.0/${conn.accountId}/campaigns`,
          { params: { fields, limit: 100, access_token: conn.accessToken } }
        );
        metaCampaigns = campRes.data?.data || [];
      } catch (e) {
        const msg = e.response?.data?.error?.message || e.message;
        return res.status(400).json({ message: `Could not fetch Meta campaigns: ${msg}` });
      }

      const objectiveMap = {
        BRAND_AWARENESS:'awareness', REACH:'reach', LINK_CLICKS:'traffic',
        POST_ENGAGEMENT:'engagement', APP_INSTALLS:'app_installs',
        VIDEO_VIEWS:'video_views', LEAD_GENERATION:'lead_generation',
        MESSAGES:'messages', CONVERSIONS:'conversions',
        PRODUCT_CATALOG_SALES:'catalog_sales', STORE_VISITS:'store_traffic',
        OUTCOME_AWARENESS:'awareness', OUTCOME_TRAFFIC:'traffic',
        OUTCOME_ENGAGEMENT:'engagement', OUTCOME_LEADS:'lead_generation',
        OUTCOME_SALES:'conversions', OUTCOME_APP_PROMOTION:'app_installs'
      };

      for (const mc of metaCampaigns) {
        // Fetch insights for this campaign
        let metrics = { amountSpent:0, impressions:0, cpm:0, totalClicks:0, ctr:0, cpc:0, conversions:0, totalReach:0, addToCart:0 };
        try {
          const insRes = await axios.get(
            `https://graph.facebook.com/v19.0/${mc.id}/insights`,
            { params: { fields:'spend,impressions,cpm,clicks,ctr,cpc,reach,actions', date_preset:'last_30d', access_token: conn.accessToken } }
          );
          const ins = insRes.data?.data?.[0];
          if (ins) {
            metrics.amountSpent = parseFloat(ins.spend || 0);
            metrics.impressions  = parseInt(ins.impressions || 0);
            metrics.cpm          = parseFloat(ins.cpm || 0);
            metrics.totalClicks  = parseInt(ins.clicks || 0);
            metrics.ctr          = parseFloat(ins.ctr || 0);
            metrics.cpc          = parseFloat(ins.cpc || 0);
            metrics.totalReach   = parseInt(ins.reach || 0);
            const cartAction = (ins.actions||[]).find(a => a.action_type === 'add_to_cart');
            const convAction = (ins.actions||[]).find(a => a.action_type === 'purchase');
            metrics.addToCart   = parseInt(cartAction?.value || 0);
            metrics.conversions = parseInt(convAction?.value  || 0);
          }
        } catch (insErr) {
          console.warn(`[Meta] Could not fetch insights for campaign ${mc.id}`);
        }

        const mappedObj = objectiveMap[mc.objective] || 'awareness';
        const mappedStatus = mc.status === 'ACTIVE' ? 'active' : mc.status === 'PAUSED' ? 'paused' : 'draft';
        const budget = parseFloat(mc.daily_budget || mc.lifetime_budget || 0) / 100; // Meta returns cents

        const platformData = {
          platform: 'meta', platformCampaignId: mc.id,
          status: mappedStatus, budget, budgetType: mc.daily_budget ? 'daily' : 'lifetime',
          objective: mappedObj, metrics
        };

        const existing = await Campaign.findOne({ userId: req.user._id, 'platforms.platformCampaignId': mc.id });
        if (existing) {
          const pIdx = existing.platforms.findIndex(p => p.platformCampaignId === mc.id);
          if (pIdx >= 0) {
            existing.platforms[pIdx].metrics = metrics;
            existing.platforms[pIdx].status  = mappedStatus;
            existing.metricsHistory = existing.metricsHistory || [];
            existing.metricsHistory.push({ date: new Date(), platform: 'meta', ...metrics });
            await existing.save();
            updated++;
          }
        } else {
          await Campaign.create({
            userId: req.user._id, name: mc.name,
            objective: mappedObj, status: mappedStatus,
            startDate: mc.start_time ? new Date(mc.start_time) : undefined,
            endDate:   mc.stop_time  ? new Date(mc.stop_time)  : undefined,
            totalBudget: budget, currency: 'USD',
            platforms: [platformData],
            tags: ['imported', 'meta']
          });
          imported.push(mc.name);
        }
      }
    }

    // ── GOOGLE ADS SYNC ───────────────────────────────────────────────────────
    else if (platform === 'google') {
      const cleanId = (conn.customerId || conn.accountId).replace(/-/g, '');
      const query = `
        SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
               metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.ctr,
               metrics.average_cpc, metrics.conversions, metrics.reach_metrics
        FROM campaign
        WHERE segments.date DURING LAST_30_DAYS
        ORDER BY metrics.impressions DESC
        LIMIT 100
      `;
      try {
        const gRes = await axios.post(
          `https://googleads.googleapis.com/v15/customers/${cleanId}/googleAds:search`,
          { query },
          { headers: { 'developer-token': conn.developerToken, 'Authorization': `Bearer ${conn.accessToken}`, 'login-customer-id': cleanId } }
        );
        const rows = gRes.data?.results || [];
        for (const row of rows) {
          const c = row.campaign;
          const m = row.metrics;
          const spend = (m?.cost_micros || 0) / 1_000_000;
          const metrics = {
            amountSpent: parseFloat(spend.toFixed(2)),
            impressions: parseInt(m?.impressions || 0),
            totalClicks: parseInt(m?.clicks || 0),
            ctr:  parseFloat(((m?.ctr || 0) * 100).toFixed(3)),
            cpc:  parseFloat(((m?.average_cpc || 0) / 1_000_000).toFixed(2)),
            cpm:  m?.impressions > 0 ? parseFloat((spend / m.impressions * 1000).toFixed(2)) : 0,
            conversions: Math.floor(m?.conversions || 0),
            totalReach:  parseInt(m?.impressions || 0),
            addToCart:   0
          };
          const existing = await Campaign.findOne({ userId: req.user._id, 'platforms.platformCampaignId': c.id });
          if (!existing) {
            await Campaign.create({
              userId: req.user._id, name: c.name, objective: 'traffic',
              status: c.status === 'ENABLED' ? 'active' : 'paused',
              totalBudget: spend, currency: 'USD',
              platforms: [{ platform:'google', platformCampaignId: c.id, status: c.status==='ENABLED'?'active':'paused', budget: spend, metrics }],
              tags: ['imported', 'google']
            });
            imported.push(c.name);
          } else {
            const pIdx = existing.platforms.findIndex(p => p.platformCampaignId === c.id);
            if (pIdx >= 0) { existing.platforms[pIdx].metrics = metrics; await existing.save(); updated++; }
          }
        }
      } catch (gErr) {
        const gMsg = gErr.response?.data?.error?.message || gErr.message;
        return res.status(400).json({ message: `Google Ads sync failed: ${gMsg}` });
      }
    }

    // ── TIKTOK SYNC ───────────────────────────────────────────────────────────
    else if (platform === 'tiktok') {
      try {
        const ttRes = await axios.get('https://business-api.tiktok.com/open_api/v1.3/campaign/get/', {
          params: { advertiser_id: conn.advertiserId, fields: JSON.stringify(['campaign_id','campaign_name','status','objective_type','budget','budget_mode']) },
          headers: { 'Access-Token': conn.accessToken }
        });
        const campaigns = ttRes.data?.data?.list || [];
        for (const c of campaigns) {
          const existing = await Campaign.findOne({ userId: req.user._id, 'platforms.platformCampaignId': String(c.campaign_id) });
          if (!existing) {
            await Campaign.create({
              userId: req.user._id, name: c.campaign_name, objective: 'awareness',
              status: c.status === 'ENABLE' ? 'active' : 'paused',
              totalBudget: c.budget || 0, currency: 'USD',
              platforms: [{ platform:'tiktok', platformCampaignId: String(c.campaign_id), status: c.status==='ENABLE'?'active':'paused', budget: c.budget||0,
                metrics:{ amountSpent:0,impressions:0,cpm:0,totalClicks:0,ctr:0,cpc:0,conversions:0,totalReach:0,addToCart:0 } }],
              tags: ['imported', 'tiktok']
            });
            imported.push(c.campaign_name);
          }
        }
      } catch (ttErr) {
        const ttMsg = ttErr.response?.data?.message || ttErr.message;
        return res.status(400).json({ message: `TikTok sync failed: ${ttMsg}` });
      }
    }

    // ── LINKEDIN SYNC ─────────────────────────────────────────────────────────
    else if (platform === 'linkedin') {
      try {
        const liRes = await axios.get(
          `https://api.linkedin.com/v2/adCampaignsV2?q=search&search.account.values[0]=urn:li:sponsoredAccount:${conn.accountId}&count=50`,
          { headers: { Authorization: `Bearer ${conn.accessToken}` } }
        );
        const campaigns = liRes.data?.elements || [];
        for (const c of campaigns) {
          const name = c.name || `LinkedIn Campaign ${c.id}`;
          const existing = await Campaign.findOne({ userId: req.user._id, 'platforms.platformCampaignId': String(c.id) });
          if (!existing) {
            await Campaign.create({
              userId: req.user._id, name, objective: 'lead_generation',
              status: c.status === 'ACTIVE' ? 'active' : 'paused',
              totalBudget: c.dailyBudget?.amount || 0, currency: c.dailyBudget?.currencyCode || 'USD',
              platforms: [{ platform:'linkedin', platformCampaignId: String(c.id), status: c.status==='ACTIVE'?'active':'paused',
                budget: c.dailyBudget?.amount||0,
                metrics:{ amountSpent:0,impressions:0,cpm:0,totalClicks:0,ctr:0,cpc:0,conversions:0,totalReach:0,addToCart:0 } }],
              tags: ['imported','linkedin']
            });
            imported.push(name);
          }
        }
      } catch (liErr) {
        const liMsg = liErr.response?.data?.message || liErr.message;
        return res.status(400).json({ message: `LinkedIn sync failed: ${liMsg}` });
      }
    }

    // Update lastSync timestamp
    await updateConnection(req.user._id, platform, { lastSync: new Date(), status: 'connected', errorMessage: null });

    res.json({
      success: true,
      imported: imported.length,
      updated,
      campaigns: imported,
      message: `${platform} sync complete. ${imported.length} new campaign${imported.length!==1?'s':''} imported, ${updated} updated.`
    });

  } catch (err) {
    console.error(`[${platform} Sync Error]`, err.response?.data || err.message);
    await updateConnection(req.user._id, platform, {
      status: 'error', errorMessage: err.message
    }).catch(() => {});
    res.status(500).json({ message: `Sync failed: ${err.message}` });
  }
});

module.exports = router;
