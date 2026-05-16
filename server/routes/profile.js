const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const auth    = require('../middleware/auth');
const User    = require('../models/User');

// ── GET profile ───────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -twoFactorSecret -emailOTP -passwordResetToken');
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── UPDATE profile ────────────────────────────────────────────────────────────
router.put('/', auth, async (req, res) => {
  try {
    const { name, email, preferences } = req.body;
    const user = await User.findById(req.user._id);

    if (name?.trim())  user.name  = name.trim();

    // If email is changing, check it's not already used
    if (email?.trim() && email.toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) return res.status(400).json({ message: 'Email already in use by another account' });
      user.email = email.toLowerCase().trim();
    }

    if (preferences) {
      user.preferences = { ...user.preferences.toObject?.() || user.preferences, ...preferences };
    }

    await user.save();

    const updated = await User.findById(req.user._id)
      .select('-password -twoFactorSecret -emailOTP -passwordResetToken');
    res.json({ message: 'Profile updated successfully', user: updated });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── CHANGE PASSWORD ───────────────────────────────────────────────────────────
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Both current and new password are required' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters' });

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });

    if (currentPassword === newPassword)
      return res.status(400).json({ message: 'New password must be different from current password' });

    user.password = newPassword;
    await user.save();
    res.json({ message: '✅ Password changed successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── DELETE account ────────────────────────────────────────────────────────────
router.delete('/', auth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Password is required to delete your account' });

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Incorrect password' });

    await User.findByIdAndDelete(req.user._id);
    res.json({ message: 'Account deleted successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
