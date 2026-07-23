const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const auth    = require('../middleware/auth');
const Post    = require('../models/Post');
const User    = require('../models/User');
const { createNotification } = require('../utils/notifications');
const { getUploader }        = require('../utils/cloudinary');

// ══════════════════════════════════════════════════════════════════════════════
// META — Facebook Page
// ══════════════════════════════════════════════════════════════════════════════
async function publishToMeta(post, conn) {
  try {
    // Get page access token
    const pagesRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
      params: { fields:'id,name,access_token', access_token: conn.accessToken }
    });
    const page = pagesRes.data?.data?.[0];
    if (!page) throw new Error('No Facebook Page found. Create or connect a Facebook Page first.');

    const images = post.mediaUrls?.filter(m => m.type === 'image') || [];
    const videos = post.mediaUrls?.filter(m => m.type === 'video') || [];

    // ── Video post ────────────────────────────────────────────────────────
    if (videos.length > 0) {
      const res = await axios.post(
        `https://graph.facebook.com/v19.0/${page.id}/videos`,
        {
          file_url:    videos[0].url,
          description: post.caption,
          access_token:page.access_token,
        }
      );
      return {
        success: true,
        postId:  res.data.id,
        postUrl: `https://facebook.com/${res.data.id}`
      };
    }

    // ── Single image post ─────────────────────────────────────────────────
    if (images.length === 1) {
      const res = await axios.post(
        `https://graph.facebook.com/v19.0/${page.id}/photos`,
        {
          url:          images[0].url,  // Cloudinary URL — FB fetches it
          caption:      post.caption,
          access_token: page.access_token,
        }
      );
      return {
        success: true,
        postId:  res.data.post_id || res.data.id,
        postUrl: `https://facebook.com/${res.data.post_id || res.data.id}`
      };
    }

    // ── Multiple images — upload each as unpublished, then post together ──
    if (images.length > 1) {
      const photoIds = [];
      for (const img of images) {
        const uploadRes = await axios.post(
          `https://graph.facebook.com/v19.0/${page.id}/photos`,
          {
            url:          img.url,
            published:    false,          // don't publish individually
            access_token: page.access_token,
          }
        );
        photoIds.push({ media_fbid: uploadRes.data.id });
      }

      const res = await axios.post(
        `https://graph.facebook.com/v19.0/${page.id}/feed`,
        {
          message:          post.caption,
          attached_media:   JSON.stringify(photoIds),
          access_token:     page.access_token,
        }
      );
      return {
        success: true,
        postId:  res.data.id,
        postUrl: `https://facebook.com/${res.data.id}`
      };
    }

    // ── Text only ─────────────────────────────────────────────────────────
    const res = await axios.post(
      `https://graph.facebook.com/v19.0/${page.id}/feed`,
      { message: post.caption, access_token: page.access_token }
    );
    return {
      success: true,
      postId:  res.data.id,
      postUrl: `https://facebook.com/${res.data.id}`
    };

  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.error('[Post Meta]', msg);
    return { success: false, error: msg };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// INSTAGRAM — via Facebook Graph API
// ══════════════════════════════════════════════════════════════════════════════
async function publishToInstagram(post, conn) {
  try {
    // Get Instagram Business Account ID
    const pagesRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
      params: { fields:'id,name,access_token,instagram_business_account', access_token: conn.accessToken }
    });

    let igAccountId = null, pageToken = null;
    for (const page of pagesRes.data?.data || []) {
      if (page.instagram_business_account?.id) {
        igAccountId = page.instagram_business_account.id;
        pageToken   = page.access_token;
        break;
      }
    }

    if (!igAccountId) {
      throw new Error('No Instagram Business Account found. Connect an Instagram Business Account to your Facebook Page.');
    }

    const images = post.mediaUrls?.filter(m => m.type === 'image') || [];
    const videos = post.mediaUrls?.filter(m => m.type === 'video') || [];

    // ── Video (Reel) ──────────────────────────────────────────────────────
    if (videos.length > 0) {
      // Step 1: Create media container
      const containerRes = await axios.post(
        `https://graph.facebook.com/v19.0/${igAccountId}/media`,
        {
          media_type:   'REELS',
          video_url:    videos[0].url,
          caption:      post.caption,
          access_token: pageToken || conn.accessToken,
        }
      );
      const containerId = containerRes.data.id;

      // Step 2: Wait for container to be ready
      await new Promise(r => setTimeout(r, 5000));

      // Step 3: Publish
      const publishRes = await axios.post(
        `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`,
        { creation_id: containerId, access_token: pageToken || conn.accessToken }
      );
      return {
        success: true,
        postId:  publishRes.data.id,
        postUrl: `https://instagram.com/p/${publishRes.data.id}`
      };
    }

    // ── Multiple images — Carousel ────────────────────────────────────────
    if (images.length > 1) {
      // Step 1: Create individual image containers
      const childIds = [];
      for (const img of images) {
        const childRes = await axios.post(
          `https://graph.facebook.com/v19.0/${igAccountId}/media`,
          {
            image_url:    img.url,
            is_carousel_item: true,
            access_token: pageToken || conn.accessToken,
          }
        );
        childIds.push(childRes.data.id);
      }

      // Step 2: Create carousel container
      const carouselRes = await axios.post(
        `https://graph.facebook.com/v19.0/${igAccountId}/media`,
        {
          media_type:  'CAROUSEL',
          children:    childIds.join(','),
          caption:     post.caption,
          access_token:pageToken || conn.accessToken,
        }
      );

      // Step 3: Publish carousel
      const publishRes = await axios.post(
        `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`,
        { creation_id: carouselRes.data.id, access_token: pageToken || conn.accessToken }
      );
      return {
        success: true,
        postId:  publishRes.data.id,
        postUrl: `https://instagram.com/p/${publishRes.data.id}`
      };
    }

    // ── Single image ──────────────────────────────────────────────────────
    if (images.length === 1) {
      // Step 1: Create media container
      const containerRes = await axios.post(
        `https://graph.facebook.com/v19.0/${igAccountId}/media`,
        {
          image_url:    images[0].url,
          caption:      post.caption,
          access_token: pageToken || conn.accessToken,
        }
      );

      // Step 2: Publish
      const publishRes = await axios.post(
        `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`,
        { creation_id: containerRes.data.id, access_token: pageToken || conn.accessToken }
      );
      return {
        success: true,
        postId:  publishRes.data.id,
        postUrl: `https://instagram.com/p/${publishRes.data.id}`
      };
    }

    // ── Text only — Instagram doesn't support text-only posts ────────────
    throw new Error('Instagram requires at least one image or video. Text-only posts are not supported on Instagram.');

  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.error('[Post Instagram]', msg);
    return { success: false, error: msg };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// TWITTER / X
// ══════════════════════════════════════════════════════════════════════════════
async function publishToTwitter(post, conn) {
  try {
    const body = { text: post.caption };

    // Twitter v2 media upload requires v1.1 upload endpoint + OAuth 1.0a
    // For simplicity we post text + note about media
    if (post.mediaUrls?.length > 0) {
      // Append image URL to tweet text if present
      // Full media upload requires OAuth 1.0a which needs consumer keys
      // For now append the URL — users with OAuth 1.0a tokens can upload media
      const mediaUrl = post.mediaUrls[0].url;
      body.text = `${post.caption}\n${mediaUrl}`.slice(0, 280);
    }

    const res = await axios.post('https://api.twitter.com/2/tweets', body, {
      headers: { Authorization: `Bearer ${conn.accessToken}` }
    });

    const tweetId = res.data?.data?.id;
    return {
      success: true,
      postId:  tweetId,
      postUrl: `https://twitter.com/i/web/status/${tweetId}`
    };
  } catch (err) {
    const msg = err.response?.data?.detail || err.response?.data?.title || err.message;
    console.error('[Post Twitter]', msg);
    return { success: false, error: msg };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// LINKEDIN
// ══════════════════════════════════════════════════════════════════════════════
async function publishToLinkedIn(post, conn) {
  try {
    const meRes = await axios.get('https://api.linkedin.com/v2/me', {
      headers: { Authorization: `Bearer ${conn.accessToken}` }
    });
    const authorUrn = `urn:li:person:${meRes.data.id}`;

    const images = post.mediaUrls?.filter(m => m.type === 'image') || [];

    // ── Post with image ───────────────────────────────────────────────────
    if (images.length > 0) {
      // Step 1: Register upload
      const registerRes = await axios.post(
        'https://api.linkedin.com/v2/assets?action=registerUpload',
        {
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner:   authorUrn,
            serviceRelationships: [{
              relationshipType: 'OWNER',
              identifier:       'urn:li:userGeneratedContent'
            }]
          }
        },
        {
          headers: {
            Authorization:               `Bearer ${conn.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          }
        }
      );

      const uploadUrl = registerRes.data?.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
      const assetUrn  = registerRes.data?.value?.asset;

      // Step 2: Upload image binary from Cloudinary URL
      const imgBuffer = await axios.get(images[0].url, { responseType:'arraybuffer' });
      await axios.put(uploadUrl, imgBuffer.data, {
        headers: {
          Authorization:  `Bearer ${conn.accessToken}`,
          'Content-Type': 'image/jpeg',
        }
      });

      // Step 3: Create post with image
      const res = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        {
          author:         authorUrn,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary:    { text: post.caption },
              shareMediaCategory: 'IMAGE',
              media: [{
                status:      'READY',
                description: { text: post.caption.slice(0,200) },
                media:       assetUrn,
                title:       { text: post.label || 'Post' }
              }]
            }
          },
          visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
        },
        {
          headers: {
            Authorization:               `Bearer ${conn.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          }
        }
      );
      const postId = res.headers['x-restli-id'] || res.data?.id;
      return {
        success: true,
        postId,
        postUrl: `https://www.linkedin.com/feed/update/${postId}`
      };
    }

    // ── Text only ─────────────────────────────────────────────────────────
    const res = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      {
        author:         authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary:    { text: post.caption },
            shareMediaCategory: 'NONE',
          }
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
      },
      {
        headers: {
          Authorization:               `Bearer ${conn.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        }
      }
    );
    const postId = res.headers['x-restli-id'] || res.data?.id;
    return {
      success: true,
      postId,
      postUrl: `https://www.linkedin.com/feed/update/${postId}`
    };

  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data?.serviceErrorCode || err.message;
    console.error('[Post LinkedIn]', msg);
    return { success: false, error: msg };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PUBLISH DISPATCHER
// ══════════════════════════════════════════════════════════════════════════════
async function publishPost(post, userId) {
  const user = await User.findById(userId);
  let anySuccess = false, anyFail = false;

  for (const p of post.platforms) {
    const conn = user.connectedPlatforms?.find(
      c => c.platform === p.platform && c.status === 'connected'
    );

    if (!conn) {
      p.status = 'failed';
      p.error  = `${p.platform} not connected. Go to Integrations to connect it.`;
      anyFail  = true;
      continue;
    }

    let result;
    if      (p.platform === 'meta')      result = await publishToMeta(post, conn);
    else if (p.platform === 'instagram') result = await publishToInstagram(post, conn);
    else if (p.platform === 'twitter')   result = await publishToTwitter(post, conn);
    else if (p.platform === 'linkedin')  result = await publishToLinkedIn(post, conn);
    else result = { success:false, error:`${p.platform} organic posting not yet supported` };

    if (result.success) {
      p.status      = 'published';
      p.postId      = result.postId;
      p.postUrl     = result.postUrl;
      p.publishedAt = new Date();
      anySuccess    = true;
    } else {
      p.status = 'failed';
      p.error  = result.error;
      anyFail  = true;
    }
  }

  post.status      = anySuccess && !anyFail ? 'published' : anySuccess ? 'partially_published' : 'failed';
  post.publishedAt = anySuccess ? new Date() : undefined;
  await post.save();

  // Notifications
  const published = post.platforms.filter(p=>p.status==='published').map(p=>p.platform).join(', ');
  const failed    = post.platforms.filter(p=>p.status==='failed');

  if (anySuccess) {
    await createNotification(userId, {
      type:'success', category:'campaign',
      title:'✅ Post Published',
      message:`Your post was published to: ${published}`,
      link:'/planner'
    });
  }
  if (anyFail) {
    const failMsg = failed.map(p=>`${p.platform}: ${p.error}`).join(' | ');
    await createNotification(userId, {
      type:'error', category:'campaign',
      title:'❌ Some Posts Failed',
      message: failMsg.slice(0,200),
      link:'/planner'
    });
  }

  return post;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

router.get('/', auth, async (req, res) => {
  try {
    const { start, end, status, platform } = req.query;
    const filter = { userId: req.user._id };
    if (start || end) {
      filter.$or = [
        { scheduledAt: { ...(start&&{$gte:new Date(start)}), ...(end&&{$lte:new Date(end)}) } },
        { publishedAt: { ...(start&&{$gte:new Date(start)}), ...(end&&{$lte:new Date(end)}) } },
        { createdAt:   { ...(start&&{$gte:new Date(start)}), ...(end&&{$lte:new Date(end)}) } },
      ];
    }
    if (status)   filter.status = status;
    if (platform) filter['platforms.platform'] = platform;
    const posts = await Post.find(filter).sort({ scheduledAt:1, createdAt:-1 }).limit(500);
    res.json(posts);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findOne({ _id:req.params.id, userId:req.user._id });
    if (!post) return res.status(404).json({ message:'Post not found' });
    res.json(post);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { caption, mediaUrls, link, hashtags, platforms, scheduledAt, timezone, label, notes, publishNow } = req.body;
    if (!caption?.trim()) return res.status(400).json({ message:'Caption is required' });
    if (!platforms?.length) return res.status(400).json({ message:'Select at least one platform' });

    const post = await Post.create({
      userId:     req.user._id,
      caption:    caption.trim(),
      mediaUrls:  mediaUrls || [],
      link, hashtags: hashtags||[],
      platforms:  platforms.map(p=>({ platform:p, status:'pending' })),
      scheduledAt:scheduledAt ? new Date(scheduledAt) : undefined,
      timezone:   timezone||'UTC',
      status:     scheduledAt ? 'scheduled' : 'draft',
      label, notes,
    });

    if (publishNow || !scheduledAt) {
      await publishPost(post, req.user._id);
    }

    res.status(201).json(post);
  } catch (err) {
    console.error('[Post Create]', err.message);
    res.status(400).json({ message: 'Invalid request. Please check your input.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findOne({ _id:req.params.id, userId:req.user._id });
    if (!post) return res.status(404).json({ message:'Post not found' });
    if (['published','partially_published'].includes(post.status))
      return res.status(400).json({ message:'Cannot edit a published post' });
    const { caption, mediaUrls, hashtags, platforms, scheduledAt, label, notes } = req.body;
    if (caption)     post.caption     = caption.trim();
    if (mediaUrls)   post.mediaUrls   = mediaUrls;
    if (hashtags)    post.hashtags    = hashtags;
    if (platforms)   post.platforms   = platforms.map(p=>({ platform:p, status:'pending' }));
    if (scheduledAt) { post.scheduledAt = new Date(scheduledAt); post.status = 'scheduled'; }
    if (label   !== undefined) post.label = label;
    if (notes   !== undefined) post.notes = notes;
    await post.save();
    res.json(post);
  } catch (err) { res.status(400).json({ message: 'Invalid request. Please check your input.' }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findOne({ _id:req.params.id, userId:req.user._id });
    if (!post) return res.status(404).json({ message:'Post not found' });
    await post.deleteOne();
    res.json({ success:true });
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' }); }
});

router.post('/:id/publish', auth, async (req, res) => {
  try {
    const post = await Post.findOne({ _id:req.params.id, userId:req.user._id });
    if (!post) return res.status(404).json({ message:'Post not found' });
    if (post.status === 'published') return res.status(400).json({ message:'Already published' });
    await publishPost(post, req.user._id);
    res.json(post);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' }); }
});

// Media upload
router.post('/upload-media', auth, (req, res) => {
  const uploader = getUploader('creative');
  uploader.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ message: 'Invalid request. Please check your input.' });
    if (!req.file) return res.status(400).json({ message:'No file uploaded' });
    const isVideo = req.file.mimetype?.startsWith('video/');
    const url     = req.file.path || `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ url, type: isVideo?'video':'image', publicId: req.file.filename });
  });
});

module.exports = router;
module.exports.publishPost = publishPost;
