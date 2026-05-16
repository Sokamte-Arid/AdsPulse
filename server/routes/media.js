const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const MediaFile = require('../models/MediaFile');
const { getUploader, deleteFile, extractPublicId, isConfigured } = require('../utils/cloudinary');

// ── GET all media for user ────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { type, campaignId, page = 1, limit = 20 } = req.query;
    const filter = { userId: req.user._id };
    if (type)       filter.type       = type;
    if (campaignId) filter.campaignId = campaignId;

    const total = await MediaFile.countDocuments(filter);
    const files = await MediaFile.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ files, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── UPLOAD file ───────────────────────────────────────────────────────────────
router.post('/upload', auth, (req, res) => {
  const uploader = getUploader('creative');

  uploader.single('file')(req, res, async (err) => {
    if (err) {
      console.error('[Upload Error]', err.message);
      return res.status(400).json({ message: err.message });
    }
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    try {
      const isVideo = req.file.mimetype?.startsWith('video/');
      const using   = isConfigured() ? 'cloudinary' : 'local';

      // Build URL
      let url, publicId, thumbnailUrl;
      if (isConfigured()) {
        url          = req.file.path;        // Cloudinary URL
        publicId     = req.file.filename;    // Cloudinary public_id
        thumbnailUrl = isVideo
          ? req.file.path.replace('/upload/', '/upload/so_0,w_400,h_300,c_fill/')
          : req.file.path.replace('/upload/', '/upload/w_400,h_300,c_fill,q_auto/');
      } else {
        // Local storage
        const host = `${req.protocol}://${req.get('host')}`;
        url          = `${host}/uploads/${req.user._id}/${req.file.filename}`;
        publicId     = null;
        thumbnailUrl = isVideo ? null : url;
      }

      const media = await MediaFile.create({
        userId:       req.user._id,
        campaignId:   req.body.campaignId || null,
        name:         req.file.originalname,
        type:         isVideo ? 'video' : 'image',
        mimeType:     req.file.mimetype,
        size:         req.file.size,
        url,
        thumbnailUrl,
        cloudinaryPublicId: publicId,
        storage:      using,
        tags:         req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : [],
      });

      console.log(`[Upload] ✅ ${req.file.originalname} → ${using} (${(req.file.size/1024/1024).toFixed(2)}MB)`);
      res.status(201).json(media);

    } catch (dbErr) {
      console.error('[Upload DB Error]', dbErr.message);
      res.status(500).json({ message: dbErr.message });
    }
  });
});

// ── UPLOAD avatar ─────────────────────────────────────────────────────────────
router.post('/avatar', auth, (req, res) => {
  const uploader = getUploader('avatar');

  uploader.single('avatar')(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    try {
      const url = isConfigured() ? req.file.path : `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

      // Update user avatar
      const User = require('../models/User');
      await User.findByIdAndUpdate(req.user._id, { avatar: url });

      res.json({ url, message: 'Avatar updated successfully' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
});

// ── DELETE file ───────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const file = await MediaFile.findOne({ _id: req.params.id, userId: req.user._id });
    if (!file) return res.status(404).json({ message: 'File not found' });

    // Delete from Cloudinary if stored there
    if (file.cloudinaryPublicId) {
      await deleteFile(file.cloudinaryPublicId, file.type === 'video' ? 'video' : 'image');
    } else if (file.storage === 'local') {
      // Delete local file
      const path = require('path');
      const fs   = require('fs');
      const localPath = path.join(__dirname, '../uploads', req.user._id.toString(), path.basename(file.url));
      fs.unlink(localPath, () => {}); // ignore error if already gone
    }

    await file.deleteOne();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET storage status ────────────────────────────────────────────────────────
router.get('/status', auth, async (req, res) => {
  const totalFiles = await MediaFile.countDocuments({ userId: req.user._id });
  const totalSize  = await MediaFile.aggregate([
    { $match: { userId: req.user._id } },
    { $group: { _id: null, total: { $sum: '$size' } } }
  ]);

  res.json({
    configured:  isConfigured(),
    storage:     isConfigured() ? 'cloudinary' : 'local',
    totalFiles,
    totalSizeBytes: totalSize[0]?.total || 0,
    totalSizeMB:   ((totalSize[0]?.total || 0) / 1024 / 1024).toFixed(2),
    cloudName:   isConfigured() ? process.env.CLOUDINARY_CLOUD_NAME : null,
  });
});

module.exports = router;
