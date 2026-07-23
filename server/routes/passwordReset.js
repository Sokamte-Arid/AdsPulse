const express   = require('express');
const router    = express.Router();
const crypto    = require('crypto');
const bcrypt    = require('bcryptjs');
const { sendEmail } = require('../utils/email');
const User      = require('../models/User');

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    // Generate secure token
    const token     = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to user
    user.passwordResetToken   = token;
    user.passwordResetExpires = expiresAt;
    await user.save();

    // Build reset URL
    const clientUrl  = process.env.CLIENT_URL || 'http://localhost:3000';
    const resetUrl   = `${clientUrl}/reset-password?token=${token}`;
    const fromName   = process.env.SMTP_FROM_NAME || 'AdsPulse';
    const fromEmail  = process.env.SMTP_USER;

    // Send email
    await sendEmail({
      to:      user.email,
      subject: 'Reset your AdsPulse password',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#0f0a1e;font-family:'DM Sans',Arial,sans-serif">
          <div style="max-width:520px;margin:40px auto;padding:0 20px">
            <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:16px 16px 0 0;padding:32px;text-align:center">
              <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
                ⚡
              </div>
              <h1 style="color:white;font-size:22px;font-weight:800;margin:0">AdsPulse</h1>
            </div>
            <div style="background:#1a1035;border-radius:0 0 16px 16px;padding:32px;border:1px solid rgba(124,58,237,0.2);border-top:none">
              <h2 style="color:white;font-size:18px;font-weight:700;margin:0 0 12px">Reset your password</h2>
              <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 24px">
                Hi ${user.name || 'there'},<br><br>
                We received a request to reset your AdsPulse password. Click the button below to choose a new password.
              </p>
              <div style="text-align:center;margin:28px 0">
                <a href="${resetUrl}"
                  style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700">
                  Reset Password
                </a>
              </div>
              <p style="color:#6b7280;font-size:12px;line-height:1.6;margin:20px 0 0;text-align:center">
                This link expires in <strong style="color:#9ca3af">1 hour</strong>.<br>
                If you didn't request this, you can safely ignore this email.<br><br>
                Or copy this link: <a href="${resetUrl}" style="color:#7c3aed;word-break:break-all">${resetUrl}</a>
              </p>
            </div>
            <p style="color:#4b5563;font-size:11px;text-align:center;margin-top:20px">
              © ${new Date().getFullYear()} AdsPulse · kmcom2026.com
            </p>
          </div>
        </body>
        </html>
      `,
    });

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('[Forgot Password]', err.message);
    res.status(500).json({ message: 'Failed to send reset email. Please try again.' });
  }
});

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
router.post('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token is required' });

    const user = await User.findOne({
      passwordResetToken:   token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) return res.status(400).json({ message: 'Reset link is invalid or has expired.' });

    res.json({ valid: true });
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and password are required' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const user = await User.findOne({
      passwordResetToken:   token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) return res.status(400).json({ message: 'Reset link is invalid or has expired.' });

    // Update password
    user.password             = await bcrypt.hash(password, 12);
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('[Reset Password]', err.message);
    res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

module.exports = router;