const express    = require('express');
const router     = express.Router();
const auth       = require('../middleware/auth');
const User       = require('../models/User');
const { cloudinary, isConfigured, deleteFile, extractPublicId } = require('../utils/cloudinary');

// ── GET profile ───────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -twoFactorSecret -emailOTP -resetPasswordToken -emailVerifyToken');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ── UPDATE profile (name, bio, phone, preferences) ────────────────────────────
router.put('/', auth, async (req, res) => {
  try {
    const allowed = ['name', 'bio', 'phone', 'preferences'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -twoFactorSecret -emailOTP -resetPasswordToken');

    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ message: 'Invalid request. Please check your input.' });
  }
});

// ── UPDATE brand banner ───────────────────────────────────────────────────────
// PATCH /api/profile/brand
// Body: { companyName, welcomeMessage, tagline, companyLogo (base64), coverImage (base64) }
router.patch('/brand', auth, async (req, res) => {
  try {
    const { companyName, welcomeMessage, tagline, companyLogo, coverImage } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.brand) user.brand = {};

    // Text fields
    if (companyName    !== undefined) user.brand.companyName    = companyName;
    if (welcomeMessage !== undefined) user.brand.welcomeMessage = welcomeMessage;
    if (tagline        !== undefined) user.brand.tagline        = tagline;

    // Upload company logo to Cloudinary
    if (companyLogo && companyLogo.startsWith('data:')) {
      try {
        const result = await cloudinary.uploader.upload(companyLogo, {
          folder: `adspulse/brand/${req.user._id}`,
          public_id: 'logo',
          overwrite: true,
          transformation: [{ width: 400, height: 400, crop: 'limit', quality: 'auto' }]
        });
        user.brand.companyLogo = result.secure_url;
      } catch (e) {
        console.error('[Brand logo upload]', e.message);
        return res.status(400).json({ message: 'Logo upload failed: ' + e.message });
      }
    }

    // Upload cover image to Cloudinary
    if (coverImage && coverImage.startsWith('data:')) {
      try {
        const result = await cloudinary.uploader.upload(coverImage, {
          folder: `adspulse/brand/${req.user._id}`,
          public_id: 'cover',
          overwrite: true,
          transformation: [{ width: 1400, height: 400, crop: 'fill', gravity: 'auto', quality: 'auto' }]
        });
        user.brand.coverImage = result.secure_url;
      } catch (e) {
        console.error('[Brand cover upload]', e.message);
        return res.status(400).json({ message: 'Cover image upload failed: ' + e.message });
      }
    }

    user.markModified('brand');
    await user.save();

    res.json({ success: true, brand: user.brand });
  } catch (err) {
    console.error('[Brand update]', err.message);
    res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ── UPLOAD avatar ─────────────────────────────────────────────────────────────
router.patch('/avatar', auth, async (req, res) => {
  try {
    const { avatar } = req.body; // base64 data URL
    if (!avatar || !avatar.startsWith('data:')) {
      return res.status(400).json({ message: 'Invalid image data' });
    }

    const result = await cloudinary.uploader.upload(avatar, {
      folder: `adspulse/avatars`,
      public_id: req.user._id.toString(),
      overwrite: true,
      transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face', quality: 'auto' }]
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: result.secure_url },
      { new: true }
    ).select('-password');

    res.json({ success: true, avatar: result.secure_url, user });
  } catch (err) {
    console.error('[Avatar upload]', err.message);
    res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ── REMOVE brand image (logo or cover) ────────────────────────────────────────
router.delete('/brand/:field', auth, async (req, res) => {
  try {
    const { field } = req.params;
    if (!['companyLogo', 'coverImage'].includes(field)) {
      return res.status(400).json({ message: 'Invalid field' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Delete from Cloudinary
    const publicId = `adspulse/brand/${req.user._id}/${field === 'companyLogo' ? 'logo' : 'cover'}`;
    try { await cloudinary.uploader.destroy(publicId); } catch {}

    user.brand = user.brand || {};
    user.brand[field] = undefined;
    user.markModified('brand');
    await user.save();

    res.json({ success: true });
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

module.exports = router;