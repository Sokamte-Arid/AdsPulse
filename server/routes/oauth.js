const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');
const User = require('../models/User');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';

// ── Helper: save platform connection ─────────────────────────────────────────
const saveConnection = async (userId, platform, data) => {
  const user = await User.findById(userId);
  const idx = user.connectedPlatforms.findIndex(p => p.platform === platform);
  if (idx >= 0) Object.assign(user.connectedPlatforms[idx], data);
  else user.connectedPlatforms.push({ platform, ...data });
  await user.save();
};

// ── Helper: build state param ─────────────────────────────────────────────────
const buildState = (userId, extra = {}) =>
  Buffer.from(JSON.stringify({ userId: userId.toString(), ts: Date.now(), ...extra })).toString('base64url');

const parseState = (state) => {
  try { return JSON.parse(Buffer.from(state, 'base64url').toString()); }
  catch { return null; }
};

const stateValid = (stateData) =>
  stateData && Date.now() - stateData.ts < 15 * 60 * 1000; // 15 min

// ── Helper: redirect with error ───────────────────────────────────────────────
const errRedirect = (res, platform, msg) =>
  res.redirect(`${CLIENT_URL}/connect?error=${platform}_${encodeURIComponent(msg)}`);

const okRedirect = (res, platform, accountName) =>
  res.redirect(`${CLIENT_URL}/connect?success=${platform}&account=${encodeURIComponent(accountName || '')}`);

// ══════════════════════════════════════════════════════════════════════════════
// STATUS — which OAuth providers are configured
// ══════════════════════════════════════════════════════════════════════════════
router.get('/status', auth, (req, res) => {
  res.json({
    meta:      { configured: !!(process.env.META_APP_ID      && process.env.META_APP_SECRET) },
    linkedin:  { configured: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) },
    google:    { configured: !!(process.env.GOOGLE_CLIENT_ID   && process.env.GOOGLE_CLIENT_SECRET) },
    tiktok:    { configured: !!(process.env.TIKTOK_CLIENT_KEY  && process.env.TIKTOK_CLIENT_SECRET) },
    twitter:   { configured: !!(process.env.TWITTER_CLIENT_ID  && process.env.TWITTER_CLIENT_SECRET) },
    snapchat:  { configured: !!(process.env.SNAPCHAT_CLIENT_ID && process.env.SNAPCHAT_CLIENT_SECRET) },
    youtube:   { configured: !!(process.env.GOOGLE_CLIENT_ID   && process.env.GOOGLE_CLIENT_SECRET) },
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// META (FACEBOOK & INSTAGRAM)
// ══════════════════════════════════════════════════════════════════════════════
router.get('/meta/authorize', auth, (req, res) => {
  if (!process.env.META_APP_ID)
    return res.status(400).json({ message: 'META_APP_ID not set in server/.env' });

  const state = buildState(req.user._id, { adAccountId: req.query.adAccountId || '' });
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: `${SERVER_URL}/api/oauth/meta/callback`,
    scope: 'ads_read,ads_management,business_management,public_profile',
    response_type: 'code',
    state
  });
  res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
});

router.get('/meta/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  if (error) return errRedirect(res, 'meta', error_description || error);

  const stateData = parseState(state);
  if (!stateValid(stateData)) return errRedirect(res, 'meta', 'Session expired. Please try again.');

  try {
    // Exchange code → short token
    const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: { client_id: process.env.META_APP_ID, client_secret: process.env.META_APP_SECRET, redirect_uri: `${SERVER_URL}/api/oauth/meta/callback`, code }
    });
    const shortToken = tokenRes.data.access_token;

    // Exchange short → long-lived (60 days)
    const longRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: { grant_type: 'fb_exchange_token', client_id: process.env.META_APP_ID, client_secret: process.env.META_APP_SECRET, fb_exchange_token: shortToken }
    });
    const longToken = longRes.data.access_token;
    const tokenExpiry = new Date(Date.now() + (longRes.data.expires_in || 5184000) * 1000);

    // Get user
    const meRes = await axios.get('https://graph.facebook.com/v19.0/me', { params: { fields: 'id,name', access_token: longToken } });
    const userName = meRes.data.name;

    // Get ad accounts
    let finalAccountId = stateData.adAccountId;
    let accountName = 'Meta Ads';

    if (!finalAccountId) {
      const acctRes = await axios.get('https://graph.facebook.com/v19.0/me/adaccounts', {
        params: { fields: 'id,name,account_status', access_token: longToken }
      });
      const accounts = (acctRes.data?.data || []).filter(a => a.account_status === 1); // active only

      if (accounts.length === 0) return errRedirect(res, 'meta', 'No active ad accounts found on this Facebook account.');
      if (accounts.length === 1) {
        finalAccountId = accounts[0].id;
        accountName = accounts[0].name;
      } else {
        // Multiple accounts — show picker
        const encoded = encodeURIComponent(JSON.stringify(accounts.map(a => ({ id: a.id, name: a.name }))));
        return res.redirect(`${CLIENT_URL}/connect?meta_accounts=${encoded}&meta_token=${encodeURIComponent(longToken)}&meta_user=${encodeURIComponent(userName)}&meta_expiry=${tokenExpiry.toISOString()}&meta_uid=${stateData.userId}`);
      }
    }

    await saveConnection(stateData.userId, 'meta', {
      accountId: finalAccountId, accountName: `${accountName} · ${userName}`,
      accessToken: longToken, tokenExpiry, status: 'connected', lastSync: null, errorMessage: null
    });

    okRedirect(res, 'meta', accountName);
  } catch (err) {
    console.error('[Meta OAuth]', err.response?.data || err.message);
    errRedirect(res, 'meta', err.response?.data?.error?.message || err.message);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GOOGLE ADS + YOUTUBE (same OAuth app)
// ══════════════════════════════════════════════════════════════════════════════
router.get('/google/authorize', auth, (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID)
    return res.status(400).json({ message: 'GOOGLE_CLIENT_ID not set in server/.env' });

  const state = buildState(req.user._id, { platform: 'google' });
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${SERVER_URL}/api/oauth/google/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/userinfo.profile',
    access_type: 'offline',   // gets refresh token
    prompt: 'consent',        // always show consent to ensure refresh token
    state
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get('/youtube/authorize', auth, (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID)
    return res.status(400).json({ message: 'GOOGLE_CLIENT_ID not set in server/.env' });

  const state = buildState(req.user._id, { platform: 'youtube' });
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${SERVER_URL}/api/oauth/google/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/userinfo.profile',
    access_type: 'offline',
    prompt: 'consent',
    state
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return errRedirect(res, 'google', error);

  const stateData = parseState(state);
  if (!stateValid(stateData)) return errRedirect(res, 'google', 'Session expired.');
  const platform = stateData.platform || 'google';

  try {
    // Exchange code → tokens
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code, client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${SERVER_URL}/api/oauth/google/callback`,
      grant_type: 'authorization_code'
    });
    const { access_token, refresh_token, expires_in } = tokenRes.data;
    const tokenExpiry = new Date(Date.now() + (expires_in || 3600) * 1000);

    // Get user profile
    const profileRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const userName = profileRes.data.name || profileRes.data.email || 'Google User';

    let accountId = 'google', accountName = `Google Ads (${userName})`;

    if (platform === 'google' && process.env.GOOGLE_ADS_DEVELOPER_TOKEN) {
      // Try to get Google Ads customer ID
      try {
        const adsRes = await axios.get('https://googleads.googleapis.com/v15/customers:listAccessibleCustomers', {
          headers: { Authorization: `Bearer ${access_token}`, 'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN }
        });
        const customers = adsRes.data?.resourceNames || [];
        if (customers.length > 0) {
          accountId = customers[0].replace('customers/', '');
          accountName = `Google Ads (${accountId})`;
        }
      } catch (adsErr) {
        console.warn('[Google OAuth] Could not fetch customer IDs:', adsErr.message);
      }
    }

    if (platform === 'youtube') {
      try {
        const ytRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
          params: { part: 'snippet', mine: true },
          headers: { Authorization: `Bearer ${access_token}` }
        });
        const channel = ytRes.data?.items?.[0];
        if (channel) { accountId = channel.id; accountName = channel.snippet?.title || accountName; }
      } catch {}
    }

    await saveConnection(stateData.userId, platform, {
      accountId, accountName: `${accountName} · ${userName}`,
      accessToken: access_token, refreshToken: refresh_token || null,
      tokenExpiry, developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || null,
      customerId: accountId, status: 'connected', lastSync: null, errorMessage: null
    });

    okRedirect(res, platform, accountName);
  } catch (err) {
    console.error('[Google OAuth]', err.response?.data || err.message);
    errRedirect(res, platform, err.response?.data?.error_description || err.message);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// TIKTOK FOR BUSINESS
// ══════════════════════════════════════════════════════════════════════════════
router.get('/tiktok/authorize', auth, (req, res) => {
  if (!process.env.TIKTOK_CLIENT_KEY)
    return res.status(400).json({ message: 'TIKTOK_CLIENT_KEY not set in server/.env' });

  const state = buildState(req.user._id);
  const params = new URLSearchParams({
    app_id: process.env.TIKTOK_CLIENT_KEY,
    redirect_uri: `${SERVER_URL}/api/oauth/tiktok/callback`,
    state,
    scope: 'campaign.read,adgroup.read,ad.read,report.task.create,report.task.read'
  });
  res.redirect(`https://business-api.tiktok.com/portal/auth?${params}`);
});

router.get('/tiktok/callback', async (req, res) => {
  const { auth_code, state, error } = req.query;
  if (error) return errRedirect(res, 'tiktok', error);

  const stateData = parseState(state);
  if (!stateValid(stateData)) return errRedirect(res, 'tiktok', 'Session expired.');

  try {
    // Exchange auth_code for access token
    const tokenRes = await axios.post('https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/', {
      app_id: process.env.TIKTOK_CLIENT_KEY,
      secret: process.env.TIKTOK_CLIENT_SECRET,
      auth_code,
      grant_type: 'authorization_code'
    });

    const data = tokenRes.data?.data;
    if (!data?.access_token) throw new Error(tokenRes.data?.message || 'No access token returned');

    const accessToken = data.access_token;
    const tokenExpiry = new Date(Date.now() + (data.expires_in || 7776000) * 1000); // default 90 days

    // Get advertiser accounts
    let advertiserId = '', accountName = 'TikTok Ads';
    try {
      const advRes = await axios.get('https://business-api.tiktok.com/open_api/v1.3/oauth2/advertiser/get/', {
        params: { app_id: process.env.TIKTOK_CLIENT_KEY, secret: process.env.TIKTOK_CLIENT_SECRET, access_token: accessToken }
      });
      const advertisers = advRes.data?.data?.list || [];
      if (advertisers.length > 0) {
        advertiserId = String(advertisers[0].advertiser_id);
        accountName  = advertisers[0].advertiser_name || accountName;
      }
    } catch (advErr) {
      console.warn('[TikTok OAuth] Could not fetch advertisers:', advErr.message);
    }

    await saveConnection(stateData.userId, 'tiktok', {
      accountId: advertiserId || 'tiktok', accountName,
      accessToken, advertiserId, tokenExpiry,
      status: 'connected', lastSync: null, errorMessage: null
    });

    okRedirect(res, 'tiktok', accountName);
  } catch (err) {
    console.error('[TikTok OAuth]', err.response?.data || err.message);
    errRedirect(res, 'tiktok', err.response?.data?.message || err.message);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// LINKEDIN
// ══════════════════════════════════════════════════════════════════════════════
router.get('/linkedin/authorize', auth, (req, res) => {
  if (!process.env.LINKEDIN_CLIENT_ID)
    return res.status(400).json({ message: 'LINKEDIN_CLIENT_ID not set in server/.env' });

  const state = buildState(req.user._id);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: `${SERVER_URL}/api/oauth/linkedin/callback`,
    scope: 'r_ads r_ads_reporting rw_ads r_basicprofile',
    state
  });
  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
});

router.get('/linkedin/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  if (error) return errRedirect(res, 'linkedin', error_description || error);

  const stateData = parseState(state);
  if (!stateValid(stateData)) return errRedirect(res, 'linkedin', 'Session expired.');

  try {
    const tokenRes = await axios.post('https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: `${SERVER_URL}/api/oauth/linkedin/callback`, client_id: process.env.LINKEDIN_CLIENT_ID, client_secret: process.env.LINKEDIN_CLIENT_SECRET }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenRes.data.access_token;
    const tokenExpiry = new Date(Date.now() + (tokenRes.data.expires_in || 5184000) * 1000);

    const profileRes = await axios.get('https://api.linkedin.com/v2/me', { headers: { Authorization: `Bearer ${accessToken}` } });
    const userName = `${profileRes.data.localizedFirstName || ''} ${profileRes.data.localizedLastName || ''}`.trim();

    let adAccountId = '', accountName = `LinkedIn Ads (${userName})`;
    try {
      const adRes = await axios.get('https://api.linkedin.com/v2/adAccountsV2?q=search&search.type.values[0]=BUSINESS&search.status.values[0]=ACTIVE', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const accounts = adRes.data?.elements || [];
      if (accounts.length > 0) {
        adAccountId = accounts[0].id?.replace('urn:li:sponsoredAccount:', '') || '';
        accountName = accounts[0].name || accountName;
      }
    } catch {}

    await saveConnection(stateData.userId, 'linkedin', {
      accountId: adAccountId || 'linkedin', accountName: `${accountName} · ${userName}`,
      accessToken, tokenExpiry, status: 'connected', lastSync: null, errorMessage: null
    });

    okRedirect(res, 'linkedin', accountName);
  } catch (err) {
    console.error('[LinkedIn OAuth]', err.response?.data || err.message);
    errRedirect(res, 'linkedin', err.response?.data?.message || err.message);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// TWITTER / X
// ══════════════════════════════════════════════════════════════════════════════
router.get('/twitter/authorize', auth, (req, res) => {
  if (!process.env.TWITTER_CLIENT_ID)
    return res.status(400).json({ message: 'TWITTER_CLIENT_ID not set in server/.env' });

  const state = buildState(req.user._id);
  // Twitter OAuth2 PKCE
  const codeVerifier  = require('crypto').randomBytes(32).toString('base64url');
  const codeChallenge = require('crypto').createHash('sha256').update(codeVerifier).digest('base64url');

  // Store verifier temporarily (in-memory — fine for single instance)
  global._twitterVerifiers = global._twitterVerifiers || {};
  global._twitterVerifiers[state] = codeVerifier;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.TWITTER_CLIENT_ID,
    redirect_uri: `${SERVER_URL}/api/oauth/twitter/callback`,
    scope: 'tweet.read users.read offline.access ads:read ads:write',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });
  res.redirect(`https://twitter.com/i/oauth2/authorize?${params}`);
});

router.get('/twitter/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return errRedirect(res, 'twitter', error);

  const stateData = parseState(state);
  if (!stateValid(stateData)) return errRedirect(res, 'twitter', 'Session expired.');

  const codeVerifier = global._twitterVerifiers?.[state];
  if (!codeVerifier) return errRedirect(res, 'twitter', 'Code verifier not found. Please try again.');
  delete global._twitterVerifiers[state];

  try {
    const credentials = Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64');
    const tokenRes = await axios.post('https://api.twitter.com/2/oauth2/token',
      new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: `${SERVER_URL}/api/oauth/twitter/callback`, code_verifier: codeVerifier }),
      { headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token, expires_in } = tokenRes.data;
    const tokenExpiry = new Date(Date.now() + (expires_in || 7200) * 1000);

    // Get user info
    const userRes = await axios.get('https://api.twitter.com/2/users/me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const twitterUser = userRes.data?.data;
    const userName = twitterUser?.name || 'X User';
    const userId2  = twitterUser?.id   || 'twitter';

    await saveConnection(stateData.userId, 'twitter', {
      accountId: userId2, accountName: `X Ads · ${userName}`,
      accessToken: access_token, refreshToken: refresh_token || null,
      tokenExpiry, status: 'connected', lastSync: null, errorMessage: null
    });

    okRedirect(res, 'twitter', userName);
  } catch (err) {
    console.error('[Twitter OAuth]', err.response?.data || err.message);
    errRedirect(res, 'twitter', err.response?.data?.error_description || err.message);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// SNAPCHAT
// ══════════════════════════════════════════════════════════════════════════════
router.get('/snapchat/authorize', auth, (req, res) => {
  if (!process.env.SNAPCHAT_CLIENT_ID)
    return res.status(400).json({ message: 'SNAPCHAT_CLIENT_ID not set in server/.env' });

  const state = buildState(req.user._id);
  const params = new URLSearchParams({
    client_id: process.env.SNAPCHAT_CLIENT_ID,
    redirect_uri: `${SERVER_URL}/api/oauth/snapchat/callback`,
    response_type: 'code',
    scope: 'snapchat-marketing-api',
    state
  });
  res.redirect(`https://accounts.snapchat.com/login/oauth2/authorize?${params}`);
});

router.get('/snapchat/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return errRedirect(res, 'snapchat', error);

  const stateData = parseState(state);
  if (!stateValid(stateData)) return errRedirect(res, 'snapchat', 'Session expired.');

  try {
    const credentials = Buffer.from(`${process.env.SNAPCHAT_CLIENT_ID}:${process.env.SNAPCHAT_CLIENT_SECRET}`).toString('base64');
    const tokenRes = await axios.post('https://accounts.snapchat.com/login/oauth2/access_token',
      new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: `${SERVER_URL}/api/oauth/snapchat/callback` }),
      { headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token, expires_in } = tokenRes.data;
    const tokenExpiry = new Date(Date.now() + (expires_in || 1800) * 1000);

    // Get user + ad accounts
    let accountName = 'Snapchat Ads', adAccountId = '';
    try {
      const meRes = await axios.get('https://adsapi.snapchat.com/v1/me', { headers: { Authorization: `Bearer ${access_token}` } });
      accountName = meRes.data?.me?.display_name || accountName;

      const orgsRes = await axios.get('https://adsapi.snapchat.com/v1/me/organizations', { headers: { Authorization: `Bearer ${access_token}` } });
      const orgId = orgsRes.data?.organizations?.[0]?.organization?.id;
      if (orgId) {
        const acctRes = await axios.get(`https://adsapi.snapchat.com/v1/organizations/${orgId}/adaccounts`, { headers: { Authorization: `Bearer ${access_token}` } });
        const accounts = acctRes.data?.adaccounts || [];
        if (accounts.length > 0) {
          adAccountId = accounts[0].adaccount?.id || '';
          accountName = accounts[0].adaccount?.name || accountName;
        }
      }
    } catch {}

    await saveConnection(stateData.userId, 'snapchat', {
      accountId: adAccountId || 'snapchat', accountName,
      accessToken: access_token, refreshToken: refresh_token || null,
      tokenExpiry, status: 'connected', lastSync: null, errorMessage: null
    });

    okRedirect(res, 'snapchat', accountName);
  } catch (err) {
    console.error('[Snapchat OAuth]', err.response?.data || err.message);
    errRedirect(res, 'snapchat', err.response?.data?.display_message || err.message);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// TOKEN REFRESH (auto-refresh expired tokens)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/refresh/:platform', auth, async (req, res) => {
  const { platform } = req.params;
  try {
    const user = await User.findById(req.user._id);
    const conn = user.connectedPlatforms.find(p => p.platform === platform);
    if (!conn?.refreshToken) return res.status(400).json({ message: 'No refresh token stored. Please reconnect.' });

    let newAccessToken, newExpiry;

    if (platform === 'google' || platform === 'youtube') {
      const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
        grant_type: 'refresh_token', refresh_token: conn.refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET
      });
      newAccessToken = tokenRes.data.access_token;
      newExpiry = new Date(Date.now() + (tokenRes.data.expires_in || 3600) * 1000);
    }

    else if (platform === 'twitter') {
      const creds = Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64');
      const tokenRes = await axios.post('https://api.twitter.com/2/oauth2/token',
        new URLSearchParams({ grant_type: 'refresh_token', refresh_token: conn.refreshToken }),
        { headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      newAccessToken = tokenRes.data.access_token;
      newExpiry = new Date(Date.now() + (tokenRes.data.expires_in || 7200) * 1000);
      if (tokenRes.data.refresh_token) conn.refreshToken = tokenRes.data.refresh_token;
    }

    else if (platform === 'snapchat') {
      const creds = Buffer.from(`${process.env.SNAPCHAT_CLIENT_ID}:${process.env.SNAPCHAT_CLIENT_SECRET}`).toString('base64');
      const tokenRes = await axios.post('https://accounts.snapchat.com/login/oauth2/access_token',
        new URLSearchParams({ grant_type: 'refresh_token', refresh_token: conn.refreshToken }),
        { headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      newAccessToken = tokenRes.data.access_token;
      newExpiry = new Date(Date.now() + (tokenRes.data.expires_in || 1800) * 1000);
    }

    else {
      return res.status(400).json({ message: `Auto-refresh not supported for ${platform}. Please reconnect.` });
    }

    conn.accessToken  = newAccessToken;
    conn.tokenExpiry  = newExpiry;
    conn.status       = 'connected';
    conn.errorMessage = null;
    await user.save();

    console.log(`[OAuth Refresh] ✅ ${platform} token refreshed for ${req.user.email}`);
    res.json({ success: true, tokenExpiry: newExpiry });

  } catch (err) {
    console.error(`[OAuth Refresh ${platform}]`, err.message);
    res.status(400).json({ message: `Token refresh failed: ${err.message}. Please reconnect.` });
  }
});

module.exports = router;
