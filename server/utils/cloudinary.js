const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// ── Configure Cloudinary ──────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

function isConfigured() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY    &&
    process.env.CLOUDINARY_API_SECRET
  );
}

// ── Storage configs ───────────────────────────────────────────────────────────

// Ad creatives (images + videos)
const creativeStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype.startsWith('video/');
    return {
      folder:         `adspulse/${req.user._id}/creatives`,
      resource_type:  isVideo ? 'video' : 'image',
      allowed_formats:['jpg','jpeg','png','gif','webp','mp4','mov','avi','mkv'],
      transformation: isVideo ? [] : [{ quality:'auto', fetch_format:'auto' }],
      public_id:      `creative_${Date.now()}`,
    };
  },
});

// Profile avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'adspulse/avatars',
    resource_type:  'image',
    allowed_formats:['jpg','jpeg','png','webp'],
    transformation: [{ width:400, height:400, crop:'fill', gravity:'face', quality:'auto' }],
    public_id:      (req) => `avatar_${req.user._id}`,
    overwrite:      true,
  },
});

// ── Multer upload instances ───────────────────────────────────────────────────
const uploadCreative = multer({
  storage: creativeStorage,
  limits:  { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/quicktime','video/avi','video/x-matroska'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`File type not supported: ${file.mimetype}`));
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images are allowed for avatars'));
  },
});

// ── Local fallback storage (when Cloudinary not configured) ───────────────────
const path = require('path');
const fs   = require('fs');
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads', req.user?._id?.toString() || 'general');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
  },
});

const uploadLocal = multer({
  storage: localStorage,
  limits:  { fileSize: 500 * 1024 * 1024 },
});

// ── Smart upload — uses Cloudinary if configured, local otherwise ─────────────
function getUploader(type = 'creative') {
  if (!isConfigured()) {
    console.warn('[Upload] Cloudinary not configured — using local storage');
    return uploadLocal;
  }
  return type === 'avatar' ? uploadAvatar : uploadCreative;
}

// ── Delete a file from Cloudinary ────────────────────────────────────────────
async function deleteFile(publicId, resourceType = 'image') {
  if (!isConfigured() || !publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log(`[Cloudinary] Deleted: ${publicId}`);
  } catch (err) {
    console.warn('[Cloudinary] Delete failed:', err.message);
  }
}

// ── Get public_id from a Cloudinary URL ───────────────────────────────────────
function extractPublicId(url) {
  if (!url || !url.includes('cloudinary')) return null;
  try {
    const parts   = url.split('/upload/');
    const withExt = parts[1]?.split('/').slice(1).join('/'); // remove version
    return withExt?.replace(/\.[^.]+$/, ''); // remove extension
  } catch { return null; }
}

// ── Generate optimized URL ────────────────────────────────────────────────────
function optimizeUrl(url, options = {}) {
  if (!url || !url.includes('cloudinary')) return url;
  const { width, height, quality = 'auto', format = 'auto' } = options;
  const transforms = [`q_${quality}`, `f_${format}`];
  if (width)  transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  return url.replace('/upload/', `/upload/${transforms.join(',')}/`);
}

module.exports = {
  cloudinary,
  isConfigured,
  getUploader,
  uploadCreative,
  uploadAvatar,
  uploadLocal,
  deleteFile,
  extractPublicId,
  optimizeUrl,
};
