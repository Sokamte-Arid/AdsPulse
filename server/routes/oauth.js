const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const auth    = require('../middleware/auth');

const crypto = require('crypto');

// ── Nonce store — maps a short-lived random token to a userId ─────────────────
// Avoids putting the JWT in the URL (browser history / server logs risk).
const nonceStore = new Map(); // nonce → { userId, expiresAt }

function createNonce(userId) {
  const nonce = crypto.randomBytes(24).toString('hex');
  nonceStore.set(nonce, { userId, expiresAt: Date.now() + 10 * 60 * 1000 }); // 10 min TTL
  // Clean up expired nonces periodically
  for (const [k, v] of nonceStore) {
    if (v.expiresAt < Date.now()) nonceStore.delete(k);
  }
  return nonce;
}

function consumeNonce(nonce) {
  const entry = nonceStore.get(nonce);
  if (!entry) throw new Error('Invalid or expired nonce');
  if (entry.expiresAt < Date.now()) { nonceStore.delete(nonce); throw new Error('Nonce expired'); }
  nonceStore.delete(nonce); // one-time use
  return entry.userId;
}

const META_APP_ID       = process.env.META_APP_ID;
const META_APP_SECRET   = process.env.META_APP_SECRET;
const META_REDIRECT_URI = process.env.META_REDIRECT_URI || 'http://localhost:5000/api/oauth/meta/callback';
const CLIENT_URL        = process.env.CLIENT_URL || 'http://localhost:3000';
const JWT_SECRET        = process.env.JWT_SECRET; // validated at startup in middleware/auth.js

const upsertConnection = async (userId, platform, data) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  const idx = user.connectedPlatforms.findIndex(p => p.platform === platform);
  if (idx >= 0) Object.assign(user.connectedPlatforms[idx], data);
  else user.connectedPlatforms.push({ platform, ...data });
  await user.save();
};

// ── GET /api/oauth/meta/init ──────────────────────────────────────────────────
router.get('/meta/init', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: 'Missing auth token' });

  let userId;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload.userId) throw new Error('Invalid token structure');
    userId = payload.userId;
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
  }

  const state = createNonce(userId);

  const scopes = [
    'ads_read',
    'ads_management',
    'business_management',
    'pages_read_engagement',
    'pages_manage_metadata',
    'instagram_basic',
    'instagram_manage_comments',
    'instagram_manage_messages',
    'public_profile',
  ].join(',');

  const url = 'https://www.facebook.com/v19.0/dialog/oauth'
    + `?client_id=${META_APP_ID}`
    + `&redirect_uri=${encodeURIComponent(META_REDIRECT_URI)}`
    + `&scope=${encodeURIComponent(scopes)}`
    + `&state=${state}`
    + `&response_type=code`;

  res.json({ url });
});

// ── GET /api/oauth/meta/callback ──────────────────────────────────────────────
router.get('/meta/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.redirect(`${CLIENT_URL}/oauth-success?oauth=error&message=${encodeURIComponent(error_description || 'Connection cancelled')}`);
  }

  if (!code || !state) {
    return res.redirect(`${CLIENT_URL}/oauth-success?oauth=error&message=Missing+code+or+state`);
  }

  // Consume nonce → userId (nonce is a one-time random token, never the JWT)
  let userId;
  try {
    userId = consumeNonce(state);
  } catch (e) {
    console.error('[Meta OAuth] Invalid state:', e.message);
    return res.redirect(`${CLIENT_URL}/oauth-success?oauth=error&message=Invalid+session.+Please+log+in+again.`);
  }

  try {
    // Exchange code → short-lived token
    const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: { client_id: META_APP_ID, client_secret: META_APP_SECRET, redirect_uri: META_REDIRECT_URI, code },
      timeout: 15000,
    });
    const shortToken = tokenRes.data.access_token;

    // Exchange → long-lived token (~60 days)
    const longRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: { grant_type: 'fb_exchange_token', client_id: META_APP_ID, client_secret: META_APP_SECRET, fb_exchange_token: shortToken },
      timeout: 15000,
    });
    const longToken = longRes.data.access_token;
    const expiresAt = new Date(Date.now() + (longRes.data.expires_in || 5184000) * 1000);

    // Get user info
    const meRes = await axios.get('https://graph.facebook.com/v19.0/me', {
      params: { fields: 'id,name,email', access_token: longToken },
      timeout: 15000,
    });
    const metaUser = meRes.data;

    // Get ad accounts
    const acctRes = await axios.get('https://graph.facebook.com/v19.0/me/adaccounts', {
      params: { fields: 'id,name,currency,account_status', access_token: longToken },
      timeout: 15000,
    });
    const adAccounts = acctRes.data?.data || [];

    if (adAccounts.length === 0) {
      return res.redirect(`${CLIENT_URL}/oauth-success?oauth=error&message=No+ad+accounts+found.+Please+create+a+Meta+Ads+account+first.`);
    }

    const activeAccount = adAccounts.find(a => a.account_status === 1) || adAccounts[0];

    // Save to DB
    await upsertConnection(userId, 'meta', {
      accountId:      activeAccount.id,
      accountName:    `${activeAccount.name} · ${metaUser.name}`,
      accessToken:    longToken,
      tokenExpiresAt: expiresAt,
      metaUserId:     metaUser.id,
      adAccounts:     adAccounts.map(a => ({ id: a.id, name: a.name, status: a.account_status })),
      status:         'connected',
      lastSync:       null,
      errorMessage:   null,
      connectedAt:    new Date(),
    });

    console.log(`[Meta OAuth] ✅ Connected: ${metaUser.name} → ${activeAccount.name}`);

    // Redirect to oauth-success page — no token in URL
    res.redirect(
      `${CLIENT_URL}/oauth-success`
      + `?oauth=success`
      + `&platform=meta`
      + `&account=${encodeURIComponent(activeAccount.name)}`
    );

  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.error('[Meta OAuth] Error:', msg);
    res.redirect(`${CLIENT_URL}/oauth-success?oauth=error&message=${encodeURIComponent(msg)}`);
  }
});

// ── GET /api/oauth/meta/accounts ──────────────────────────────────────────────
router.get('/meta/accounts', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const conn = user.connectedPlatforms.find(p => p.platform === 'meta');
    if (!conn) return res.status(404).json({ message: 'Meta not connected' });
    const acctRes = await axios.get('https://graph.facebook.com/v19.0/me/adaccounts', {
      params: { fields: 'id,name,currency,account_status', access_token: conn.accessToken },
      timeout: 15000,
    });
    res.json(acctRes.data?.data || []);
  } catch (err) {
    res.status(400).json({ message: 'Failed to connect platform. Please try again.' });
  }
});

// ── POST /api/oauth/meta/switch-account ───────────────────────────────────────
router.post('/meta/switch-account', auth, async (req, res) => {
  try {
    const { adAccountId } = req.body;
    const user = await User.findById(req.user._id);
    const conn = user.connectedPlatforms.find(p => p.platform === 'meta');
    if (!conn) return res.status(404).json({ message: 'Meta not connected' });
    const acctRes = await axios.get(`https://graph.facebook.com/v19.0/${adAccountId}`, {
      params: { fields: 'id,name,account_status', access_token: conn.accessToken },
      timeout: 15000,
    });
    await upsertConnection(req.user._id, 'meta', { accountId: acctRes.data.id, accountName: acctRes.data.name });
    res.json({ success: true, accountId: acctRes.data.id, accountName: acctRes.data.name });
  } catch (err) {
    res.status(400).json({ message: 'Failed to connect platform. Please try again.' });
  }
});

module.exports = router;