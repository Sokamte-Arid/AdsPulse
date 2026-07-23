const express      = require('express');
const router       = express.Router();
const axios        = require('axios');
const auth         = require('../middleware/auth');
const User         = require('../models/User');
const InboxMessage = require('../models/InboxMessage');

const WA_API       = 'https://graph.facebook.com/v19.0';
if (!process.env.WHATSAPP_VERIFY_TOKEN) throw new Error('[FATAL] WHATSAPP_VERIFY_TOKEN env var is not set.');
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// ── Helper: get WhatsApp connection for a user ────────────────────────────────
const getWAConn = async (userId) => {
  const user = await User.findById(userId).lean();
  return user?.connectedPlatforms?.find(p => p.platform === 'whatsapp' && p.status === 'connected');
};

// ── Helper: send WhatsApp message ─────────────────────────────────────────────
const sendWhatsAppMessage = async (phoneNumberId, accessToken, to, message) => {
  return axios.post(`${WA_API}/${phoneNumberId}/messages`, {
    messaging_product: 'whatsapp',
    recipient_type:    'individual',
    to,
    type:    'text',
    text:    { preview_url: false, body: message },
  }, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    timeout: 10000,
  });
};

// ── Helper: detect sentiment ──────────────────────────────────────────────────
const detectSentiment = (text = '') => {
  const lower = text.toLowerCase();
  const pos = ['great','love','awesome','amazing','excellent','good','thank','happy','perfect','best','wonderful','fantastic','merci','bien','parfait','super'];
  const neg = ['bad','terrible','awful','hate','worst','horrible','disappointed','useless','scam','fake','poor','refund','waste','nul','mauvais','horrible'];
  const p = pos.filter(w => lower.includes(w)).length;
  const n = neg.filter(w => lower.includes(w)).length;
  return p > n ? 'positive' : n > p ? 'negative' : 'neutral';
};

// ════════════════════════════════════════════════════════════════════════
// WEBHOOK — Meta sends incoming WhatsApp messages here
// ════════════════════════════════════════════════════════════════════════

// GET — Webhook verification (Meta calls this when you set up the webhook)
router.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WhatsApp Webhook] ✅ Verified');
    res.status(200).send(challenge);
  } else {
    console.log('[WhatsApp Webhook] ❌ Verification failed');
    res.sendStatus(403);
  }
});

// POST — Incoming messages from WhatsApp
router.post('/webhook', async (req, res) => {
  res.sendStatus(200); // Always respond 200 immediately

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of (body.entry || [])) {
      const wabaId = entry.id;

      for (const change of (entry.changes || [])) {
        if (change.field !== 'messages') continue;
        const value = change.value;

        for (const msg of (value.messages || [])) {
          if (msg.type !== 'text') continue;

          const from    = msg.from;           // sender's phone number
          const msgId   = msg.id;
          const text    = msg.text?.body || '';
          const contact = (value.contacts || []).find(c => c.wa_id === from);
          const name    = contact?.profile?.name || from;
          const phoneNumberId = value.metadata?.phone_number_id;

          // Find which user owns this WhatsApp number
          const user = await User.findOne({
            connectedPlatforms: {
              $elemMatch: {
                platform:      'whatsapp',
                status:        'connected',
                wabaId:        wabaId,
              }
            }
          }).lean();

          if (!user) {
            // Try to match by phone number ID
            const userByPhone = await User.findOne({
              connectedPlatforms: {
                $elemMatch: {
                  platform: 'whatsapp',
                  status:   'connected',
                  phoneNumberId: phoneNumberId,
                }
              }
            }).lean();
            if (!userByPhone) continue;

            await saveInboxMessage(userByPhone._id, msg, from, name, text, msgId, phoneNumberId);
          } else {
            await saveInboxMessage(user._id, msg, from, name, text, msgId, phoneNumberId);
          }
        }
      }
    }
  } catch (err) {
    console.error('[WhatsApp Webhook] Error:', err.message);
  }
});

const saveInboxMessage = async (userId, msg, from, name, text, msgId, phoneNumberId) => {
  try {
    await InboxMessage.findOneAndUpdate(
      { userId, platform: 'whatsapp', externalId: msgId },
      {
        $setOnInsert: {
          userId,
          platform:   'whatsapp',
          externalId: msgId,
          threadId:   from,
          senderId:   from,
          senderName: name,
          type:       'message',
          message:    text,
          sentiment:  detectSentiment(text),
          status:     'unread',
          platformCreatedAt: new Date(parseInt(msg.timestamp) * 1000),
          // Store phone number ID for replies
          postId: phoneNumberId,
        }
      },
      { upsert: true, new: false }
    );
  } catch (err) {
    if (!err.message.includes('duplicate')) console.error('[WhatsApp Save] Error:', err.message);
  }
};

// ════════════════════════════════════════════════════════════════════════
// CONNECT — User connects their WhatsApp Business number
// ════════════════════════════════════════════════════════════════════════

// POST /api/whatsapp/connect
router.post('/connect', auth, async (req, res) => {
  try {
    const { phoneNumber, accessToken, phoneNumberId, wabaId, displayName } = req.body;

    if (!phoneNumber || !accessToken || !phoneNumberId) {
      return res.status(400).json({ message: 'Phone number, access token, and phone number ID are required' });
    }

    // Verify the token works
    try {
      await axios.get(`${WA_API}/${phoneNumberId}`, {
        params: { fields: 'id,display_phone_number,verified_name', access_token: accessToken },
        timeout: 10000,
      });
    } catch (err) {
      return res.status(400).json({ message: 'Invalid credentials. Please check your access token and phone number ID.' });
    }

    // Save connection
    const user = await User.findById(req.user._id);
    const idx  = user.connectedPlatforms.findIndex(p => p.platform === 'whatsapp');
    const conn = {
      platform:      'whatsapp',
      accountId:     phoneNumberId,
      accountName:   displayName || phoneNumber,
      accessToken,
      phoneNumberId,
      wabaId:        wabaId || '',
      phoneNumber,
      status:        'connected',
      connectedAt:   new Date(),
      lastSync:      new Date(),
      errorMessage:  null,
    };

    if (idx >= 0) Object.assign(user.connectedPlatforms[idx], conn);
    else user.connectedPlatforms.push(conn);
    await user.save();

    res.json({ success: true, message: 'WhatsApp Business connected!', account: { accountId: phoneNumberId, accountName: displayName || phoneNumber } });
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// REPLY — Send a WhatsApp message reply from AdsPulse
// ════════════════════════════════════════════════════════════════════════

// POST /api/whatsapp/reply/:messageId
router.post('/reply/:messageId', auth, async (req, res) => {
  try {
    const { message: replyText } = req.body;
    if (!replyText?.trim()) return res.status(400).json({ message: 'Reply cannot be empty' });

    const msg = await InboxMessage.findOne({ _id: req.params.messageId, userId: req.user._id });
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    const conn = await getWAConn(req.user._id);
    if (!conn) return res.status(400).json({ message: 'WhatsApp not connected' });

    // Send reply via WhatsApp Cloud API
    await sendWhatsAppMessage(conn.phoneNumberId, conn.accessToken, msg.senderId, replyText);

    // Update message in DB
    msg.reply     = replyText;
    msg.repliedAt = new Date();
    msg.status    = 'replied';
    await msg.save();

    res.json(msg);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// SEND — Proactive message (marketing/notification)
// ════════════════════════════════════════════════════════════════════════

// POST /api/whatsapp/send
router.post('/send', auth, async (req, res) => {
  try {
    const { to, message, templateName, templateLanguage } = req.body;
    if (!to) return res.status(400).json({ message: 'Recipient phone number required' });

    const conn = await getWAConn(req.user._id);
    if (!conn) return res.status(400).json({ message: 'WhatsApp not connected' });

    let payload;

    if (templateName) {
      // Send template message (required for first contact)
      payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name:     templateName,
          language: { code: templateLanguage || 'en_US' },
        },
      };
    } else {
      // Send text message (only works if user messaged first within 24h)
      payload = {
        messaging_product: 'whatsapp',
        recipient_type:    'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: message },
      };
    }

    await axios.post(`${WA_API}/${conn.phoneNumberId}/messages`, payload, {
      headers: { Authorization: `Bearer ${conn.accessToken}`, 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    res.json({ success: true, message: 'Message sent' });
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// TEMPLATES — Get message templates
// ════════════════════════════════════════════════════════════════════════

router.get('/templates', auth, async (req, res) => {
  try {
    const conn = await getWAConn(req.user._id);
    if (!conn?.wabaId) return res.json([]);

    const r = await axios.get(`${WA_API}/${conn.wabaId}/message_templates`, {
      params: { access_token: conn.accessToken, limit: 50 },
      timeout: 10000,
    });
    res.json(r.data?.data || []);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ════════════════════════════════════════════════════════════════════════
// TEST — Send test message (developer use)
// ════════════════════════════════════════════════════════════════════════

router.post('/test', auth, async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ message: 'Recipient number required (with country code, e.g. +237...)' });

    const accessToken   = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      return res.status(503).json({ message: 'WhatsApp not configured in server environment' });
    }

    await sendWhatsAppMessage(phoneNumberId, accessToken, to.replace(/\D/g, ''), 'Hello from AdsPulse! 👋 Your WhatsApp integration is working correctly.');

    res.json({ success: true, message: `Test message sent to ${to}` });
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

module.exports = router;