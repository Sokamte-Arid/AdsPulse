const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const MediaFile = require('../models/MediaFile');

// Setup upload directory
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  destination: (req, file, cb) => {
    const userDir = path.join(uploadDir, req.user._id.toString());
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random()*1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/quicktime','video/avi','video/webm'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('File type not allowed'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB

// Upload file
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const isVideo = req.file.mimetype.startsWith('video/');
    const mediaFile = await MediaFile.create({
      userId: req.user._id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/api/media/file/${req.user._id}/${req.file.filename}`,
      path: req.file.path,
      type: isVideo ? 'video' : 'image',
      campaignId: req.body.campaignId || undefined,
      tags: req.body.tags ? req.body.tags.split(',') : []
    });
    res.status(201).json({ success: true, file: mediaFile });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Serve file
router.get('/file/:userId/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.userId, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });
  res.sendFile(filePath);
});

// List user media
router.get('/', auth, async (req, res) => {
  try {
    const files = await MediaFile.find({ userId: req.user._id })
      .sort({ createdAt: -1 }).limit(100);
    res.json(files);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Delete file
router.delete('/:id', auth, async (req, res) => {
  try {
    const file = await MediaFile.findOne({ _id: req.params.id, userId: req.user._id });
    if (!file) return res.status(404).json({ message: 'File not found' });
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    await file.deleteOne();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
