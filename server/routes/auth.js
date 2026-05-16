const express  = require('express');
const router   = express.Router();
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const mongoose = require('mongoose');
const User     = require('../models/User');
const authMiddleware = require('../middleware/auth');

const JWT_SECRET     = process.env.JWT_SECRET     || 'adspulse_dev_secret_2024';
const JWT_2FA_SECRET = process.env.JWT_2FA_SECRET || 'adspulse_2fa_temp_secret_2024';

// ── Token helpers ─────────────────────────────────────────────────────────────
const signToken     = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
const signTempToken = (userId) => jwt.sign({ userId, pending2FA: true }, JWT_2FA_SECRET, { expiresIn: '15m' });
const generateOTP   = () => Math.floor(100000 + Math.random() * 900000).toString();

// ── TOTP verify ───────────────────────────────────────────────────────────────
function verifyTOTP(inputToken, secret) {
  try {
    const { authenticator } = require('otplib');
    authenticator.options = { window: 2 };
    return authenticator.verify({ token: inputToken.replace(/\s/g,'').trim(), secret });
  } catch { return false; }
}

// ── Email sender ──────────────────────────────────────────────────────────────
async function sendEmail(to, subject, html) {
  console.log(`\n[EMAIL] → ${to} | ${subject}`);
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('[EMAIL] SMTP not configured — email not sent');
    return false;
  }
  try {
    const nodemailer  = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await transporter.sendMail({ from:`"AdsPulse" <${process.env.SMTP_USER}>`, to, subject, html });
    console.log(`[EMAIL] ✅ Sent to ${to}`);
    return true;
  } catch (err) {
    console.error('[EMAIL Error]', err.message);
    return false;
  }
}

// ── Send verification email ───────────────────────────────────────────────────
async function sendVerificationEmail(user, token) {
  const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║        EMAIL VERIFICATION LINK               ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  To:   ${user.email.padEnd(37)}║`);
  console.log(`║  Name: ${user.name.padEnd(37)}║`);
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  ${verifyUrl.slice(0,45).padEnd(45)}║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('Full URL:', verifyUrl, '\n');

  return sendEmail(
    user.email,
    'AdsPulse — Please verify your email',
    `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f5f3ff;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:32px;text-align:center;">
        <div style="font-size:40px;margin-bottom:8px;">⚡</div>
        <div style="font-size:24px;font-weight:800;color:white;margin:0;">AdsPulse</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:4px;">Cross-Platform Ads Management</div>
      </div>
      <div style="padding:32px;background:white;">
        <h2 style="font-size:20px;font-weight:800;color:#1e1030;margin:0 0 12px;">
          Welcome, ${user.name.split(' ')[0]}! 👋
        </h2>
        <p style="font-size:14px;color:#6b7280;line-height:1.7;margin:0 0 8px;">
          Thanks for signing up. Please verify your email address to activate your account and get started.
        </p>
        <p style="font-size:13px;color:#9ca3af;margin:0 0 24px;">
          This link expires in <strong>24 hours</strong>.
        </p>
        <a href="${verifyUrl}"
          style="display:block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;text-decoration:none;padding:14px 24px;border-radius:10px;text-align:center;font-weight:700;font-size:15px;margin-bottom:20px;">
          ✓ Verify My Email →
        </a>
        <div style="padding:12px;background:#f9fafb;border-radius:8px;word-break:break-all;font-size:11px;color:#9ca3af;margin-bottom:16px;">
          ${verifyUrl}
        </div>
        <p style="font-size:12px;color:#9ca3af;margin:0;">
          If you didn't create an AdsPulse account, you can safely ignore this email.
        </p>
      </div>
    </div>
    `
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REGISTER — sends verification email
// ══════════════════════════════════════════════════════════════════════════════
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields are required' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    if (mongoose.connection.readyState !== 1)
      return res.status(503).json({ message: 'Database not connected' });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      // If registered but not verified, resend the email
      if (!existing.emailVerified) {
        const token    = crypto.randomBytes(32).toString('hex');
        const hashed   = crypto.createHash('sha256').update(token).digest('hex');
        existing.emailVerifyToken  = hashed;
        existing.emailVerifyExpiry = new Date(Date.now() + 24 * 3600000);
        await existing.save();
        await sendVerificationEmail(existing, token);
        return res.status(400).json({
          message: 'This email is registered but not verified. A new verification link has been sent.',
          resent: true
        });
      }
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Generate verification token
    const verifyToken  = crypto.randomBytes(32).toString('hex');
    const hashedToken  = crypto.createHash('sha256').update(verifyToken).digest('hex');

    const user = await User.create({
      name:               name.trim(),
      email:              email.toLowerCase().trim(),
      password,
      role:               'manager',
      emailVerified:      false,
      emailVerifyToken:   hashedToken,
      emailVerifyExpiry:  new Date(Date.now() + 24 * 3600000)
    });

    // Send verification email
    const emailSent = await sendVerificationEmail(user, verifyToken);

    res.status(201).json({
      requiresVerification: true,
      emailSent,
      email: user.email,
      message: emailSent
        ? `Account created! Check ${user.email} for a verification link.`
        : `Account created! Check your server terminal for the verification link (SMTP not configured).`,
      welcome: {
        isNew:    true,
        message:  `Welcome to AdsPulse, ${user.name.split(' ')[0]}! 🎉`,
        subtitle: 'Check your email to verify your account and get started.'
      }
    });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Email already in use' });
    res.status(500).json({ message: 'Registration failed: ' + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// VERIFY EMAIL — handles the link from the email
// ══════════════════════════════════════════════════════════════════════════════
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Verification token is required' });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      emailVerifyToken:  hashedToken,
      emailVerifyExpiry: { $gt: new Date() }
    });

    if (!user) {
      // Check if already verified
      const alreadyVerified = await User.findOne({ emailVerifyToken: hashedToken });
      if (alreadyVerified?.emailVerified) {
        return res.json({
          alreadyVerified: true,
          message: 'Email already verified. You can log in.'
        });
      }
      return res.status(400).json({
        message: 'Verification link is invalid or has expired (24 hour limit). Please register again or request a new link.'
      });
    }

    // Mark as verified
    user.emailVerified     = true;
    user.emailVerifyToken  = undefined;
    user.emailVerifyExpiry = undefined;
    await user.save();

    // Auto-login after verification
    const authToken = signToken(user._id);

    console.log(`[Email Verify] ✅ Verified: ${user.email}`);
    res.json({
      success:  true,
      token:    authToken,
      user:     { id: user._id, name: user.name, email: user.email, role: user.role, twoFactorEnabled: user.twoFactorEnabled },
      welcome:  { isNew: true, message: `Email verified! Welcome, ${user.name.split(' ')[0]}! 🎉`, subtitle: 'Your account is ready. Start by connecting a platform or creating a campaign.' }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// RESEND VERIFICATION EMAIL
// ══════════════════════════════════════════════════════════════════════════════
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always return success to prevent email enumeration
    const successMsg = 'If that email has a pending verification, a new link has been sent.';
    if (!user || user.emailVerified) return res.json({ message: successMsg });

    // Generate new token
    const verifyToken  = crypto.randomBytes(32).toString('hex');
    const hashedToken  = crypto.createHash('sha256').update(verifyToken).digest('hex');
    user.emailVerifyToken  = hashedToken;
    user.emailVerifyExpiry = new Date(Date.now() + 24 * 3600000);
    await user.save();

    await sendVerificationEmail(user, verifyToken);
    res.json({ message: successMsg });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN — blocks unverified emails
// ══════════════════════════════════════════════════════════════════════════════
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });
    if (mongoose.connection.readyState !== 1)
      return res.status(503).json({ message: 'Database not connected. Is MongoDB running?' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    // Block unverified accounts
    if (!user.emailVerified) {
      return res.status(403).json({
        message: 'Please verify your email before logging in.',
        requiresVerification: true,
        email: user.email
      });
    }

    user.lastLogin = new Date();
    await user.save();

    // 2FA
    if (user.twoFactorEnabled) {
      const tempToken = signTempToken(user._id);
      if (user.twoFactorMethod === 'email') {
        const otp = generateOTP();
        user.emailOTP = otp; user.emailOTPExpiry = new Date(Date.now() + 15*60000);
        await user.save();
        await sendOTPEmail(user.email, otp, user.name);
      }
      return res.json({
        requires2FA: true, method: user.twoFactorMethod, tempToken,
        message: user.twoFactorMethod === 'email' ? `Code sent to ${user.email}` : 'Enter your authenticator code'
      });
    }

    const token = signToken(user._id);
    const hour  = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const firstName = user.name.split(' ')[0];

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, twoFactorEnabled: false },
      welcome: { isNew: false, message: `${greeting}, ${firstName}! 👋`, subtitle: 'Welcome back to AdsPulse.' }
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed: ' + err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// VERIFY 2FA
// ══════════════════════════════════════════════════════════════════════════════
router.post('/verify-2fa', async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) return res.status(400).json({ message: 'Token and code are required' });

    let decoded;
    try { decoded = jwt.verify(tempToken, JWT_2FA_SECRET); }
    catch (e) { return res.status(401).json({ message: e.name === 'TokenExpiredError' ? '2FA session expired.' : 'Invalid session.' }); }
    if (!decoded.pending2FA) return res.status(401).json({ message: 'Invalid 2FA session.' });

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: 'User not found.' });

    let valid = false;
    if (user.twoFactorMethod === 'totp') {
      if (!user.twoFactorSecret) return res.status(400).json({ message: 'Authenticator not set up. Set up 2FA again.' });
      valid = verifyTOTP(code, user.twoFactorSecret);
    } else {
      if (!user.emailOTP || !user.emailOTPExpiry) return res.status(400).json({ message: 'No active code. Request a new one.' });
      if (new Date() > new Date(user.emailOTPExpiry)) return res.status(400).json({ message: 'Code expired. Click Resend.' });
      valid = user.emailOTP === code.trim();
      if (valid) { user.emailOTP = undefined; user.emailOTPExpiry = undefined; await user.save(); }
    }

    if (!valid) return res.status(401).json({ message: user.twoFactorMethod === 'totp' ? 'Invalid code. Check your phone time is set to automatic.' : 'Incorrect code.' });

    const token = signToken(user._id);
    const hour  = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, twoFactorEnabled: true },
      welcome: { isNew: false, message: `${greeting}, ${user.name.split(' ')[0]}! 👋`, subtitle: 'Welcome back to AdsPulse.' }
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── 2FA Setup / Enable / Disable / Resend OTP ────────────────────────────────
router.post('/2fa/setup', authMiddleware, async (req, res) => {
  try {
    const { method = 'totp' } = req.body;
    const user = await User.findById(req.user._id);
    if (method === 'totp') {
      const { authenticator } = require('otplib');
      authenticator.options = { window: 2 };
      const secret = authenticator.generateSecret();
      const QRCode = require('qrcode');
      const qrCode = await QRCode.toDataURL(authenticator.keyuri(user.email, 'AdsPulse', secret));
      user.twoFactorSecret = secret; user.twoFactorMethod = 'totp';
      await user.save();
      res.json({ secret, qrCode, method: 'totp', manualEntry: { account: user.email, key: secret, issuer: 'AdsPulse' } });
    } else {
      const otp = generateOTP();
      user.twoFactorMethod = 'email'; user.emailOTP = otp;
      user.emailOTPExpiry = new Date(Date.now() + 15*60000);
      await user.save();
      await sendOTPEmail(user.email, otp, user.name);
      res.json({ method: 'email', message: 'Code sent — check email or server terminal' });
    }
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/2fa/enable', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id);
    let valid = false;
    if (user.twoFactorMethod === 'totp') {
      if (!user.twoFactorSecret) return res.status(400).json({ message: 'No secret. Please set up again.' });
      valid = verifyTOTP(code, user.twoFactorSecret);
    } else {
      if (!user.emailOTP || !user.emailOTPExpiry || new Date() > new Date(user.emailOTPExpiry))
        return res.status(400).json({ message: 'Code expired. Please set up again.' });
      valid = user.emailOTP === code.trim();
    }
    if (!valid) return res.status(400).json({ message: user.twoFactorMethod === 'totp' ? 'Invalid code.' : 'Incorrect code.' });
    user.twoFactorEnabled = true; user.emailOTP = undefined; user.emailOTPExpiry = undefined;
    await user.save();
    res.json({ success: true, message: '✅ Two-factor authentication enabled.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/2fa/disable', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Incorrect password' });
    user.twoFactorEnabled = false; user.twoFactorSecret = undefined;
    user.emailOTP = undefined; user.emailOTPExpiry = undefined;
    await user.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/2fa/resend-otp', async (req, res) => {
  try {
    const { tempToken } = req.body;
    let decoded;
    try { decoded = jwt.verify(tempToken, JWT_2FA_SECRET); }
    catch { return res.status(401).json({ message: 'Session expired. Please log in again.' }); }
    const user = await User.findById(decoded.userId);
    if (!user || user.twoFactorMethod !== 'email') return res.status(400).json({ message: 'Invalid request' });
    const otp = generateOTP();
    user.emailOTP = otp; user.emailOTPExpiry = new Date(Date.now() + 15*60000);
    await user.save();
    await sendOTPEmail(user.email, otp, user.name);
    res.json({ message: 'New code sent — check email or server terminal' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Forgot / Reset Password ───────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase().trim() });
    const successMsg = 'If an account exists with that email, a reset link has been sent.';
    if (!user) return res.json({ message: successMsg });

    const resetToken  = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken  = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpiry = new Date(Date.now() + 3600000);
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    console.log('\n[PASSWORD RESET]', resetUrl, '\n');

    await sendEmail(user.email, 'AdsPulse — Reset your password', `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f5f3ff;border-radius:16px;">
        <h2 style="color:#7c3aed;">Reset Your Password</h2>
        <p style="color:#6b7280;">Hi ${user.name}, click below to reset your password (expires in 1 hour):</p>
        <a href="${resetUrl}" style="display:block;background:#7c3aed;color:white;text-decoration:none;padding:14px;border-radius:10px;text-align:center;font-weight:700;margin:20px 0;">Reset Password →</a>
        <p style="color:#9ca3af;font-size:12px;">If you didn't request this, ignore this email.</p>
      </div>`
    );
    res.json({ message: successMsg });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.body;
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user   = await User.findOne({ passwordResetToken: hashed, passwordResetExpiry: { $gt: new Date() } });
    if (!user) return res.status(400).json({ message: 'Reset link is invalid or expired.' });
    res.json({ valid: true, email: user.email, name: user.name });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and password are required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user   = await User.findOne({ passwordResetToken: hashed, passwordResetExpiry: { $gt: new Date() } });
    if (!user) return res.status(400).json({ message: 'Reset link is invalid or expired.' });
    user.password = password; user.passwordResetToken = undefined; user.passwordResetExpiry = undefined;
    await user.save();
    const authToken = signToken(user._id);
    res.json({ message: 'Password reset successfully.', token: authToken, user: { id: user._id, name: user.name, email: user.email, role: user.role }, welcome: { isNew: false, message: `Password updated, ${user.name.split(' ')[0]}! ✅`, subtitle: 'You are now logged in.' } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Both fields are required' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    const user    = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });
    if (currentPassword === newPassword) return res.status(400).json({ message: 'New password must be different' });
    user.password = newPassword;
    await user.save();
    res.json({ message: '✅ Password changed successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── ME ────────────────────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -twoFactorSecret -emailOTP -passwordResetToken -emailVerifyToken');
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── OTP email helper ──────────────────────────────────────────────────────────
async function sendOTPEmail(email, otp, name) {
  console.log(`\n[2FA OTP] Code for ${email}: ${otp}\n`);
  return sendEmail(email, `AdsPulse — Verification code: ${otp}`, `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f0a1e;border-radius:16px;">
      <h2 style="color:#c084fc;">⚡ AdsPulse — 2FA Code</h2>
      <p style="color:#8b7baa;">Hi ${name},</p>
      <div style="font-size:44px;font-weight:900;letter-spacing:16px;color:#fff;background:#1a1033;padding:24px;border-radius:12px;text-align:center;border:2px solid rgba(124,58,237,0.4);">
        ${otp}
      </div>
      <p style="color:#6b7280;font-size:12px;margin-top:16px;">Expires in 15 minutes.</p>
    </div>`
  );
}

module.exports = router;
