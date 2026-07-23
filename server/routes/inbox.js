const express      = require('express');
const router       = express.Router();
const axios        = require('axios');
const auth         = require('../middleware/auth');
const User         = require('../models/User');
const InboxMessage = require('../models/InboxMessage');
const Campaign     = require('../models/Campaign');

// ── Helper: get Meta connection ───────────────────────────────────────────────
const getMetaConn = async (userId) => {
  const user = await User.findById(userId).lean();
  return user?.connectedPlatforms?.find(p => p.platform === 'meta' && p.status === 'connected');
};

// ── Helper: detect sentiment (simple keyword based) ──────────────────────────
const detectSentiment = (text) => {
  const lower = text.toLowerCase();
  const positive = ['great','love','awesome','amazing','excellent','good','thank','happy','perfect','best','wonderful','fantastic'];
  const negative = ['bad','terrible','awful','hate','worst','horrible','disappointed','useless','scam','fake','poor','refund','waste'];
  const posCount = positive.filter(w => lower.includes(w)).length;
  const negCount = negative.filter(w => lower.includes(w)).length;
  if (posCount > negCount) return 'positive';
  if (negCount > posCount) return 'negative';
  return 'neutral';
};

// ── POST /api/inbox/sync ──────────────────────────────────────────────────────
// Fetch new messages from all connected platforms
router.post('/sync', auth, async (req, res) => {
  const results = { synced: 0, platforms: [], errors: [] };

  try {
    const metaConn = await getMetaConn(req.user._id);

    if (metaConn?.accessToken) {
      try {
        // Get ad account's campaigns comments
        const accountId = metaConn.accountId?.replace('act_', '');
        const campaigns = await Campaign.find({
          userId: req.user._id,
          'platforms.platform': 'meta',
        }).lean();

        let metaCount = 0;

        for (const campaign of campaigns.slice(0, 10)) {
          const metaPlatform = campaign.platforms?.find(p => p.platform === 'meta');
          if (!metaPlatform?.externalCampaignId) continue;

          try {
            // Get ad sets for this campaign
            const adSetsRes = await axios.get(
              `https://graph.facebook.com/v19.0/${metaPlatform.externalCampaignId}/adsets`,
              { params: { fields: 'id,name', access_token: metaConn.accessToken }, timeout: 8000 }
            );

            for (const adSet of (adSetsRes.data?.data || []).slice(0, 3)) {
              // Get ads
              const adsRes = await axios.get(
                `https://graph.facebook.com/v19.0/${adSet.id}/ads`,
                { params: { fields: 'id,name,creative', access_token: metaConn.accessToken }, timeout: 8000 }
              );

              for (const ad of (adsRes.data?.data || []).slice(0, 3)) {
                try {
                  // Get post comments
                  const creative = ad.creative;
                  if (!creative?.effective_object_story_id) continue;

                  const commentsRes = await axios.get(
                    `https://graph.facebook.com/v19.0/${creative.effective_object_story_id}/comments`,
                    { params: { fields: 'id,message,from,created_time,like_count', limit: 25, access_token: metaConn.accessToken }, timeout: 8000 }
                  );

                  for (const comment of (commentsRes.data?.data || [])) {
                    try {
                      await InboxMessage.findOneAndUpdate(
                        { userId: req.user._id, platform: 'meta', externalId: comment.id },
                        {
                          $setOnInsert: {
                            userId:     req.user._id,
                            platform:   'meta',
                            externalId: comment.id,
                            threadId:   creative.effective_object_story_id,
                            senderId:   comment.from?.id,
                            senderName: comment.from?.name || 'Facebook User',
                            type:       'comment',
                            message:    comment.message,
                            postId:     creative.effective_object_story_id,
                            campaignId: campaign._id,
                            campaignName: campaign.name,
                            sentiment:  detectSentiment(comment.message),
                            status:     'unread',
                            platformCreatedAt: new Date(comment.created_time),
                          }
                        },
                        { upsert: true, new: false }
                      );
                      metaCount++;
                    } catch (dupErr) { /* skip duplicates */ }
                  }
                } catch {}
              }
            }
          } catch {}
        }

        // Also get page messages if page is connected
        try {
          const pagesRes = await axios.get(
            'https://graph.facebook.com/v19.0/me/accounts',
            { params: { fields: 'id,name,access_token', access_token: metaConn.accessToken }, timeout: 8000 }
          );

          for (const page of (pagesRes.data?.data || []).slice(0, 2)) {
            const convRes = await axios.get(
              `https://graph.facebook.com/v19.0/${page.id}/conversations`,
              { params: { fields: 'id,snippet,updated_time,participants', access_token: page.access_token }, timeout: 8000 }
            );

            for (const conv of (convRes.data?.data || []).slice(0, 20)) {
              const participant = conv.participants?.data?.find(p => p.id !== page.id);
              if (!participant) continue;

              // Get messages in conversation
              const msgRes = await axios.get(
                `https://graph.facebook.com/v19.0/${conv.id}/messages`,
                { params: { fields: 'id,message,from,created_time', limit: 5, access_token: page.access_token }, timeout: 8000 }
              );

              for (const msg of (msgRes.data?.data || [])) {
                if (msg.from?.id === page.id) continue; // skip own messages
                try {
                  await InboxMessage.findOneAndUpdate(
                    { userId: req.user._id, platform: 'meta', externalId: msg.id },
                    {
                      $setOnInsert: {
                        userId:     req.user._id,
                        platform:   'meta',
                        externalId: msg.id,
                        threadId:   conv.id,
                        senderId:   msg.from?.id,
                        senderName: msg.from?.name || participant.name || 'Facebook User',
                        type:       'message',
                        message:    msg.message,
                        postMessage: conv.snippet,
                        sentiment:  detectSentiment(msg.message || ''),
                        status:     'unread',
                        platformCreatedAt: new Date(msg.created_time),
                      }
                    },
                    { upsert: true, new: false }
                  );
                  metaCount++;
                } catch {}
              }
            }
          }
        } catch {}

        results.synced += metaCount;
        results.platforms.push({ platform: 'meta', count: metaCount });
      } catch (err) {
        results.errors.push({ platform: 'meta', error: err.message });
      }
    }


    // ── Instagram sync ────────────────────────────────────────────────────────
    const igConn = await (async () => {
      const user = await User.findById(req.user._id).lean();
      return user?.connectedPlatforms?.find(p => p.platform === 'instagram' && p.status === 'connected');
    })();

    if (igConn?.accessToken && igConn?.accountId) {
      try {
        let igCount = 0;

        // Get recent Instagram media
        const mediaRes = await axios.get(`https://graph.facebook.com/v19.0/${igConn.accountId}/media`, {
          params: { fields: 'id,caption,media_type,permalink,timestamp', limit: 20, access_token: igConn.accessToken },
          timeout: 10000
        });

        for (const post of (mediaRes.data?.data || []).slice(0, 10)) {
          try {
            // Get comments on this post
            const commRes = await axios.get(`https://graph.facebook.com/v19.0/${post.id}/comments`, {
              params: { fields: 'id,text,username,timestamp,replies{id,text,username,timestamp}', limit: 25, access_token: igConn.accessToken },
              timeout: 8000
            });

            for (const comment of (commRes.data?.data || [])) {
              try {
                await InboxMessage.findOneAndUpdate(
                  { userId: req.user._id, platform: 'instagram', externalId: comment.id },
                  {
                    $setOnInsert: {
                      userId:     req.user._id,
                      platform:   'instagram',
                      externalId: comment.id,
                      threadId:   post.id,
                      senderName: comment.username || 'Instagram User',
                      type:       'comment',
                      message:    comment.text,
                      postId:     post.id,
                      postUrl:    post.permalink,
                      postMessage: post.caption?.substring(0, 100),
                      sentiment:  detectSentiment(comment.text || ''),
                      status:     'unread',
                      platformCreatedAt: new Date(comment.timestamp),
                    }
                  },
                  { upsert: true, new: false }
                );
                igCount++;
              } catch {}
            }
          } catch {}
        }

        // Get Instagram DMs
        try {
          const dmRes = await axios.get(`https://graph.facebook.com/v19.0/${igConn.accountId}/conversations`, {
            params: { fields: 'id,messages{id,text,from,created_time}', limit: 20, access_token: igConn.accessToken },
            timeout: 10000
          });

          for (const conv of (dmRes.data?.data || []).slice(0, 20)) {
            for (const msg of (conv.messages?.data || []).slice(0, 5)) {
              if (msg.from?.id === igConn.accountId) continue;
              try {
                await InboxMessage.findOneAndUpdate(
                  { userId: req.user._id, platform: 'instagram', externalId: msg.id },
                  {
                    $setOnInsert: {
                      userId:     req.user._id,
                      platform:   'instagram',
                      externalId: msg.id,
                      threadId:   conv.id,
                      senderName: msg.from?.username || msg.from?.name || 'Instagram User',
                      type:       'message',
                      message:    msg.text,
                      sentiment:  detectSentiment(msg.text || ''),
                      status:     'unread',
                      platformCreatedAt: new Date(msg.created_time),
                    }
                  },
                  { upsert: true, new: false }
                );
                igCount++;
              } catch {}
            }
          }
        } catch {}

        results.synced += igCount;
        results.platforms.push({ platform: 'instagram', count: igCount });
      } catch (err) {
        results.errors.push({ platform: 'instagram', error: err.message });
      }
    }

    res.json(results);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ── GET /api/inbox ────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { platform, status, type, sentiment, search, page = 1, limit = 30 } = req.query;
    const filter = { userId: req.user._id };

    if (platform && platform !== 'all') filter.platform = platform;
    if (status   && status   !== 'all') filter.status   = status;
    if (type     && type     !== 'all') filter.type      = type;
    if (sentiment && sentiment !== 'all') filter.sentiment = sentiment;
    if (search) filter.message = { $regex: search, $options: 'i' };

    const total    = await InboxMessage.countDocuments(filter);
    const messages = await InboxMessage.find(filter)
      .sort({ platformCreatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({ messages, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ── GET /api/inbox/stats ──────────────────────────────────────────────────────
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const [total, unread, replied, positive, negative, byPlatform] = await Promise.all([
      InboxMessage.countDocuments({ userId }),
      InboxMessage.countDocuments({ userId, status: 'unread' }),
      InboxMessage.countDocuments({ userId, status: 'replied' }),
      InboxMessage.countDocuments({ userId, sentiment: 'positive' }),
      InboxMessage.countDocuments({ userId, sentiment: 'negative' }),
      InboxMessage.aggregate([
        { $match: { userId: new (require('mongoose').Types.ObjectId)(userId) } },
        { $group: { _id: '$platform', count: { $sum: 1 }, unread: { $sum: { $cond: [{ $eq: ['$status','unread'] }, 1, 0] } } } }
      ]),
    ]);

    res.json({ total, unread, replied, positive, negative, byPlatform });
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ── PUT /api/inbox/:id/status ─────────────────────────────────────────────────
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const msg = await InboxMessage.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status },
      { new: true }
    );
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    res.json(msg);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ── POST /api/inbox/:id/reply ─────────────────────────────────────────────────
router.post('/:id/reply', auth, async (req, res) => {
  try {
    const { message: replyText } = req.body;
    if (!replyText?.trim()) return res.status(400).json({ message: 'Reply cannot be empty' });

    const msg = await InboxMessage.findOne({ _id: req.params.id, userId: req.user._id });
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    if (msg.platform === 'meta') {
      const metaConn = await getMetaConn(req.user._id);
      if (!metaConn?.accessToken) return res.status(400).json({ message: 'Meta not connected' });

      // Reply to comment
      if (msg.type === 'comment') {
        await axios.post(
          `https://graph.facebook.com/v19.0/${msg.externalId}/comments`,
          { message: replyText },
          { params: { access_token: metaConn.accessToken }, timeout: 10000 }
        );
      }
      // Reply to message (requires page token)
      else if (msg.type === 'message' && msg.threadId) {
        const pagesRes = await axios.get(
          'https://graph.facebook.com/v19.0/me/accounts',
          { params: { fields: 'id,access_token', access_token: metaConn.accessToken }, timeout: 8000 }
        );
        const page = pagesRes.data?.data?.[0];
        if (page) {
          await axios.post(
            `https://graph.facebook.com/v19.0/${msg.threadId}/messages`,
            { message: replyText },
            { params: { access_token: page.access_token }, timeout: 10000 }
          );
        }
      }
    }

    // Instagram comment reply
    else if (msg.platform === 'instagram') {
      const igConn = await (async () => {
        const user = await User.findById(req.user._id).lean();
        return user?.connectedPlatforms?.find(p => p.platform === 'instagram' && p.status === 'connected');
      })();
      if (igConn?.accessToken) {
        await axios.post(
          `https://graph.facebook.com/v19.0/${msg.externalId}/replies`,
          { message: replyText },
          { params: { access_token: igConn.accessToken }, timeout: 10000 }
        );
      }
    }

    // Save reply locally
    msg.reply     = replyText;
    msg.repliedAt = new Date();
    msg.status    = 'replied';
    await msg.save();

    res.json(msg);
  } catch (err) {
    const apiMsg = err.response?.data?.error?.message || err.message;
    res.status(500).json({ message: apiMsg });
  }
});


// ── POST /api/inbox/:id/send-dm ───────────────────────────────────────────────
// Send a private DM to a commenter (moves conversation to private)
router.post('/:id/send-dm', auth, async (req, res) => {
  try {
    const { message: dmText } = req.body;
    if (!dmText?.trim()) return res.status(400).json({ message: 'Message cannot be empty' });

    const msg = await InboxMessage.findOne({ _id: req.params.id, userId: req.user._id });
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    if (msg.platform === 'meta') {
      const metaConn = await getMetaConn(req.user._id);
      if (!metaConn?.accessToken) return res.status(400).json({ message: 'Meta not connected' });

      // Get page token
      const pagesRes = await axios.get(
        'https://graph.facebook.com/v19.0/me/accounts',
        { params: { fields: 'id,access_token', access_token: metaConn.accessToken }, timeout: 8000 }
      );
      const page = pagesRes.data?.data?.[0];
      if (!page) return res.status(400).json({ message: 'No Facebook page found' });

      // Send private DM to the commenter
      await axios.post(
        `https://graph.facebook.com/v19.0/${page.id}/messages`,
        {
          recipient: { id: msg.senderId },
          message:   { text: dmText },
          messaging_type: 'RESPONSE',
        },
        { params: { access_token: page.access_token }, timeout: 10000 }
      );
    } else if (msg.platform === 'instagram') {
      const igConn = await (async () => {
        const user = await User.findById(req.user._id).lean();
        return user?.connectedPlatforms?.find(p => p.platform === 'instagram' && p.status === 'connected');
      })();
      if (!igConn?.accessToken) return res.status(400).json({ message: 'Instagram not connected' });

      // Send Instagram DM
      await axios.post(
        `https://graph.facebook.com/v19.0/${igConn.accountId}/messages`,
        {
          recipient: { id: msg.senderId },
          message:   { text: dmText },
        },
        { params: { access_token: igConn.accessToken }, timeout: 10000 }
      );
    } else {
      return res.status(400).json({ message: `DM not supported for ${msg.platform}` });
    }

    // Save as a sent DM record
    msg.dmSent    = true;
    msg.dmText    = dmText;
    msg.dmSentAt  = new Date();
    await msg.save();

    res.json({ success: true, message: 'DM sent successfully' });
  } catch (err) {
    const apiMsg = err.response?.data?.error?.message || err.message;
    res.status(500).json({ message: apiMsg });
  }
});

// ── POST /api/inbox/:id/ai-reply ──────────────────────────────────────────────
// Generate an AI suggested reply using Claude
router.post('/:id/ai-reply', auth, async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ message: 'AI not configured' });
    }

    const msg = await InboxMessage.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    const user = await User.findById(req.user._id).lean();
    const brandName = user?.brand?.companyName || 'our business';

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        system: `You are a social media manager for ${brandName}. Write a professional, friendly, and concise reply to this ${msg.platform} ${msg.type}. Keep it under 150 words. Be genuine and helpful. Do not use hashtags unless it's a comment reply. Do not add any explanation or preamble — just the reply text itself.`,
        messages: [{ role: 'user', content: `Customer ${msg.type}: "${msg.message}"\n\nWrite a reply:` }],
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const suggestion = response.data.content[0].text.trim();
    res.json({ suggestion });
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ── DELETE /api/inbox/:id ─────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    await InboxMessage.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true });
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ── PUT /api/inbox/bulk ───────────────────────────────────────────────────────
router.put('/bulk', auth, async (req, res) => {
  try {
    const { ids, status } = req.body;
    await InboxMessage.updateMany(
      { _id: { $in: ids }, userId: req.user._id },
      { status }
    );
    res.json({ success: true });
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

module.exports = router;