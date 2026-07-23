const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const auth    = require('../middleware/auth');
const User    = require('../models/User');
const Post    = require('../models/Post');

// ── Helper: upsert a post (avoid duplicates on re-sync) ──────────────────────
async function upsertPost(userId, platformPostId, platform, data) {
  const existing = await Post.findOne({ userId, 'platforms.postId': platformPostId });
  if (existing) {
    // Update metrics only
    const pIdx = existing.platforms.findIndex(p => p.postId === platformPostId);
    if (pIdx >= 0) {
      existing.platforms[pIdx].likes       = data.likes       || existing.platforms[pIdx].likes;
      existing.platforms[pIdx].comments    = data.comments    || existing.platforms[pIdx].comments;
      existing.platforms[pIdx].shares      = data.shares      || existing.platforms[pIdx].shares;
      existing.platforms[pIdx].reach       = data.reach       || existing.platforms[pIdx].reach;
      existing.platforms[pIdx].impressions = data.impressions || existing.platforms[pIdx].impressions;
      await existing.save();
    }
    return { action: 'updated', post: existing };
  }

  // Create new imported post
  const post = await Post.create({
    userId,
    caption:     data.caption    || '',
    mediaUrls:   data.mediaUrls  || [],
    link:        data.link       || '',
    platforms: [{
      platform,
      status:      'published',
      postId:      platformPostId,
      postUrl:     data.postUrl  || '',
      publishedAt: data.publishedAt,
      likes:       data.likes       || 0,
      comments:    data.comments    || 0,
      shares:      data.shares      || 0,
      reach:       data.reach       || 0,
      impressions: data.impressions || 0,
    }],
    status:      'published',
    publishedAt: data.publishedAt,
    scheduledAt: data.publishedAt,
    label:       data.label || `Imported from ${platform}`,
    notes:       `Automatically imported from ${platform}`,
    isAd:        false,
    imported:    true,
  });

  return { action: 'created', post };
}

// ══════════════════════════════════════════════════════════════════════════════
// SYNC HISTORY — import past posts from all platforms
// ══════════════════════════════════════════════════════════════════════════════
router.post('/sync-history', auth, async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user?.connectedPlatforms?.length) {
    return res.status(400).json({ message: 'No platforms connected. Connect a platform first.' });
  }

  const results = {};
  const errors  = {};

  for (const conn of user.connectedPlatforms) {
    if (conn.status !== 'connected' || !conn.accessToken) continue;

    console.log(`\n[PostHistory] Syncing ${conn.platform} for ${user.email}...`);
    try {
      let imported = 0, updated = 0;

      // ── META (Facebook Page) ─────────────────────────────────────────────
      if (conn.platform === 'meta') {
        // Get managed pages
        const pagesRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
          params: { fields: 'id,name,access_token', access_token: conn.accessToken }
        });
        const pages = pagesRes.data?.data || [];

        if (pages.length === 0) {
          errors.meta = 'No Facebook Pages found. Create or connect a Facebook Page first.';
          continue;
        }

        for (const page of pages) {
          console.log(`[PostHistory] Fetching posts from Facebook Page: ${page.name}`);
          try {
            let url = `https://graph.facebook.com/v19.0/${page.id}/posts`;
            let hasMore = true;
            let pageCount = 0;

            while (hasMore && pageCount < 5) { // max 5 pages = ~250 posts
              const postsRes = await axios.get(url, {
                params: {
                  fields: 'id,message,story,full_picture,created_time,permalink_url,likes.summary(true),comments.summary(true),shares',
                  limit:  50,
                  access_token: page.access_token
                }
              });

              const fbPosts = postsRes.data?.data || [];
              for (const p of fbPosts) {
                const caption = p.message || p.story || '';
                if (!caption && !p.full_picture) continue; // skip empty posts

                const result = await upsertPost(req.user._id, p.id, 'meta', {
                  caption,
                  mediaUrls:   p.full_picture ? [{ url: p.full_picture, type: 'image' }] : [],
                  postUrl:     p.permalink_url || `https://facebook.com/${p.id}`,
                  publishedAt: new Date(p.created_time),
                  likes:       p.likes?.summary?.total_count       || 0,
                  comments:    p.comments?.summary?.total_count    || 0,
                  shares:      p.shares?.count                     || 0,
                  label:       `FB: ${caption.slice(0,40) || 'Post'}`,
                });

                if (result.action === 'created') imported++;
                else updated++;
              }

              // Next page
              const nextUrl = postsRes.data?.paging?.next;
              if (nextUrl && fbPosts.length > 0) { url = nextUrl; pageCount++; }
              else hasMore = false;
            }
          } catch (pageErr) {
            console.warn(`[PostHistory] Meta page ${page.name} error:`, pageErr.message);
          }
        }

        // Also fetch Instagram posts if Instagram is connected to the same app
        try {
          const igAccountsRes = await axios.get('https://graph.facebook.com/v19.0/me/instagram_accounts', {
            params: { fields: 'id,username', access_token: conn.accessToken }
          });
          const igAccounts = igAccountsRes.data?.data || [];

          for (const igAccount of igAccounts) {
            const igRes = await axios.get(`https://graph.facebook.com/v19.0/${igAccount.id}/media`, {
              params: {
                fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
                limit:  50,
                access_token: conn.accessToken
              }
            });
            const igPosts = igRes.data?.data || [];
            for (const p of igPosts) {
              if (!p.caption && !p.media_url) continue;
              const result = await upsertPost(req.user._id, p.id, 'instagram', {
                caption:     p.caption || '',
                mediaUrls:   p.media_url ? [{ url: p.media_url, type: p.media_type==='VIDEO'?'video':'image' }] : [],
                postUrl:     p.permalink || '',
                publishedAt: new Date(p.timestamp),
                likes:       p.like_count     || 0,
                comments:    p.comments_count || 0,
                label:       `IG: ${(p.caption||'').slice(0,40)||'Post'}`,
              });
              if (result.action==='created') imported++;
              else updated++;
            }
          }
        } catch {}

        results.meta = { imported, updated };
        console.log(`[PostHistory] Meta: ${imported} imported, ${updated} updated`);
      }

      // ── TWITTER / X ──────────────────────────────────────────────────────
      else if (conn.platform === 'twitter') {
        try {
          // Get user ID first
          const meRes = await axios.get('https://api.twitter.com/2/users/me', {
            params: { 'user.fields': 'id,name,username' },
            headers: { Authorization: `Bearer ${conn.accessToken}` }
          });
          const twitterUserId = meRes.data?.data?.id;
          if (!twitterUserId) throw new Error('Could not get Twitter user ID');

          console.log(`[PostHistory] Fetching tweets for user ${meRes.data?.data?.username}`);

          const tweetsRes = await axios.get(`https://api.twitter.com/2/users/${twitterUserId}/tweets`, {
            params: {
              max_results: 100,
              'tweet.fields': 'created_at,text,public_metrics,entities,attachments',
              expansions: 'attachments.media_keys',
              'media.fields': 'url,preview_image_url,type',
            },
            headers: { Authorization: `Bearer ${conn.accessToken}` }
          });

          const tweets = tweetsRes.data?.data || [];
          const media  = tweetsRes.data?.includes?.media || [];

          for (const t of tweets) {
            const tweetMedia = [];
            if (t.attachments?.media_keys) {
              t.attachments.media_keys.forEach(key => {
                const m = media.find(med => med.media_key === key);
                if (m) tweetMedia.push({ url: m.url || m.preview_image_url, type: m.type==='video'?'video':'image' });
              });
            }

            const result = await upsertPost(req.user._id, t.id, 'twitter', {
              caption:     t.text || '',
              mediaUrls:   tweetMedia,
              postUrl:     `https://twitter.com/i/web/status/${t.id}`,
              publishedAt: new Date(t.created_at),
              likes:       t.public_metrics?.like_count    || 0,
              comments:    t.public_metrics?.reply_count   || 0,
              shares:      t.public_metrics?.retweet_count || 0,
              reach:       t.public_metrics?.impression_count || 0,
              label:       `X: ${(t.text||'').slice(0,40)}`,
            });
            if (result.action==='created') imported++;
            else updated++;
          }

          results.twitter = { imported, updated };
          console.log(`[PostHistory] Twitter: ${imported} imported, ${updated} updated`);
        } catch (err) {
          errors.twitter = err.response?.data?.detail || err.message;
          console.warn('[PostHistory] Twitter error:', err.message);
        }
      }

      // ── LINKEDIN ─────────────────────────────────────────────────────────
      else if (conn.platform === 'linkedin') {
        try {
          // Get person URN
          const meRes = await axios.get('https://api.linkedin.com/v2/me', {
            headers: { Authorization: `Bearer ${conn.accessToken}` }
          });
          const personUrn = `urn:li:person:${meRes.data.id}`;

          const postsRes = await axios.get('https://api.linkedin.com/v2/ugcPosts', {
            params: {
              q:       'authors',
              authors: `List(${encodeURIComponent(personUrn)})`,
              count:   100,
            },
            headers: {
              Authorization: `Bearer ${conn.accessToken}`,
              'X-Restli-Protocol-Version': '2.0.0',
              'LinkedIn-Version': '202304',
            }
          });

          const liPosts = postsRes.data?.elements || [];
          console.log(`[PostHistory] LinkedIn: found ${liPosts.length} posts`);

          for (const p of liPosts) {
            const content  = p.specificContent?.['com.linkedin.ugc.ShareContent'];
            const caption  = content?.shareCommentary?.text || '';
            const postId   = p.id || '';
            const mediaUrl = content?.media?.[0]?.originalUrl || '';

            const result = await upsertPost(req.user._id, postId, 'linkedin', {
              caption,
              mediaUrls:   mediaUrl ? [{ url: mediaUrl, type: 'image' }] : [],
              postUrl:     `https://www.linkedin.com/feed/update/${postId}`,
              publishedAt: p.created?.time ? new Date(p.created.time) : new Date(),
              likes:       p.socialDetail?.totalSocialActivityCounts?.numLikes     || 0,
              comments:    p.socialDetail?.totalSocialActivityCounts?.numComments  || 0,
              shares:      p.socialDetail?.totalSocialActivityCounts?.numShares    || 0,
              label:       `LI: ${caption.slice(0,40)||'Post'}`,
            });
            if (result.action==='created') imported++;
            else updated++;
          }

          results.linkedin = { imported, updated };
          console.log(`[PostHistory] LinkedIn: ${imported} imported, ${updated} updated`);
        } catch (err) {
          errors.linkedin = err.response?.data?.message || err.message;
          console.warn('[PostHistory] LinkedIn error:', err.message);
        }
      }

      // ── TIKTOK ───────────────────────────────────────────────────────────
      else if (conn.platform === 'tiktok') {
        try {
          const ttRes = await axios.get('https://open.tiktokapis.com/v2/video/list/', {
            params: {
              fields: 'id,title,video_description,create_time,share_url,like_count,comment_count,share_count,view_count,cover_image_url',
            },
            headers: { Authorization: `Bearer ${conn.accessToken}` }
          });

          const videos = ttRes.data?.data?.videos || [];
          console.log(`[PostHistory] TikTok: found ${videos.length} videos`);

          for (const v of videos) {
            const result = await upsertPost(req.user._id, v.id, 'tiktok', {
              caption:     v.video_description || v.title || '',
              mediaUrls:   v.cover_image_url ? [{ url: v.cover_image_url, type: 'image' }] : [],
              postUrl:     v.share_url || '',
              publishedAt: new Date(v.create_time * 1000),
              likes:       v.like_count    || 0,
              comments:    v.comment_count || 0,
              shares:      v.share_count   || 0,
              reach:       v.view_count    || 0,
              label:       `TT: ${(v.video_description||v.title||'').slice(0,40)}`,
            });
            if (result.action==='created') imported++;
            else updated++;
          }

          results.tiktok = { imported, updated };
          console.log(`[PostHistory] TikTok: ${imported} imported, ${updated} updated`);
        } catch (err) {
          errors.tiktok = err.response?.data?.message || err.message;
          console.warn('[PostHistory] TikTok error:', err.message);
        }
      }

      // ── YOUTUBE ──────────────────────────────────────────────────────────
      else if (conn.platform === 'youtube') {
        try {
          // Get channel uploads playlist
          const channelRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
            params: { part: 'contentDetails,snippet', mine: true },
            headers: { Authorization: `Bearer ${conn.accessToken}` }
          });
          const channel          = channelRes.data?.items?.[0];
          const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads;
          if (!uploadsPlaylistId) throw new Error('No uploads playlist found');

          const videosRes = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
            params: {
              part:       'snippet,contentDetails',
              playlistId: uploadsPlaylistId,
              maxResults: 50,
            },
            headers: { Authorization: `Bearer ${conn.accessToken}` }
          });

          const videos = videosRes.data?.items || [];
          console.log(`[PostHistory] YouTube: found ${videos.length} videos`);

          // Get stats for all videos in one call
          const videoIds = videos.map(v => v.contentDetails?.videoId).filter(Boolean).join(',');
          let statsMap = {};
          if (videoIds) {
            const statsRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
              params: { part: 'statistics', id: videoIds },
              headers: { Authorization: `Bearer ${conn.accessToken}` }
            });
            statsRes.data?.items?.forEach(v => { statsMap[v.id] = v.statistics; });
          }

          for (const v of videos) {
            const videoId  = v.contentDetails?.videoId;
            const snippet  = v.snippet;
            const stats    = statsMap[videoId] || {};
            const thumb    = snippet?.thumbnails?.high?.url || snippet?.thumbnails?.default?.url;

            const result = await upsertPost(req.user._id, videoId, 'youtube', {
              caption:     snippet?.title || '',
              mediaUrls:   thumb ? [{ url: thumb, type: 'image' }] : [],
              postUrl:     `https://youtube.com/watch?v=${videoId}`,
              publishedAt: new Date(snippet?.publishedAt || v.contentDetails?.videoPublishedAt),
              likes:       parseInt(stats.likeCount    || 0),
              comments:    parseInt(stats.commentCount || 0),
              reach:       parseInt(stats.viewCount    || 0),
              label:       `YT: ${(snippet?.title||'').slice(0,40)}`,
            });
            if (result.action==='created') imported++;
            else updated++;
          }

          results.youtube = { imported, updated };
          console.log(`[PostHistory] YouTube: ${imported} imported, ${updated} updated`);
        } catch (err) {
          errors.youtube = err.response?.data?.error?.message || err.message;
          console.warn('[PostHistory] YouTube error:', err.message);
        }
      }

      // ── SNAPCHAT ─────────────────────────────────────────────────────────
      else if (conn.platform === 'snapchat') {
        try {
          const storiesRes = await axios.get('https://adsapi.snapchat.com/v1/me/stories', {
            headers: { Authorization: `Bearer ${conn.accessToken}` }
          });
          const stories = storiesRes.data?.stories || [];
          console.log(`[PostHistory] Snapchat: found ${stories.length} stories`);

          for (const s of stories) {
            const result = await upsertPost(req.user._id, s.id, 'snapchat', {
              caption:     s.title || s.description || 'Snap Story',
              mediaUrls:   s.thumbnail_url ? [{ url: s.thumbnail_url, type: 'image' }] : [],
              postUrl:     s.share_url || '',
              publishedAt: new Date(s.created_at || Date.now()),
              reach:       s.impressions || 0,
              label:       `Snap: ${(s.title||'Story').slice(0,40)}`,
            });
            if (result.action==='created') imported++;
            else updated++;
          }

          results.snapchat = { imported, updated };
        } catch (err) {
          errors.snapchat = err.message;
          console.warn('[PostHistory] Snapchat error:', err.message);
        }
      }

    } catch (err) {
      errors[conn.platform] = err.message;
      console.error(`[PostHistory] ${conn.platform} fatal error:`, err.message);
    }
  }

  // Build summary
  const totalImported = Object.values(results).reduce((s,r) => s+(r.imported||0), 0);
  const totalUpdated  = Object.values(results).reduce((s,r) => s+(r.updated||0),  0);

  console.log(`\n[PostHistory] Sync complete: ${totalImported} imported, ${totalUpdated} updated`);
  if (Object.keys(errors).length) {
    console.log('[PostHistory] Errors:', errors);
  }

  res.json({
    success: true,
    results,
    errors,
    totalImported,
    totalUpdated,
    message: `Sync complete — ${totalImported} posts imported, ${totalUpdated} updated${
      Object.keys(errors).length ? `. Some platforms had issues: ${Object.keys(errors).join(', ')}` : ''
    }`,
  });
});

// ── GET sync status (how many imported posts per platform) ────────────────────
router.get('/status', auth, async (req, res) => {
  try {
    const counts = await Post.aggregate([
      { $match: { userId: req.user._id, imported: true } },
      { $unwind: '$platforms' },
      { $group: { _id: '$platforms.platform', count: { $sum: 1 }, lastImported: { $max: '$createdAt' } } },
    ]);
    res.json(counts);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' }); }
});

module.exports = router;
