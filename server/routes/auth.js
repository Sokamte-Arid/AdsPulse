// const express = require('express');
// const router = express.Router();
// const jwt = require('jsonwebtoken');
// const bcrypt = require('bcryptjs');
// const mongoose = require('mongoose');
// const User = require('../models/User');
// const authMiddleware = require('../middleware/auth');

// const JWT_SECRET     = process.env.JWT_SECRET     || 'adspulse_dev_secret_2024';
// const JWT_2FA_SECRET = process.env.JWT_2FA_SECRET  || 'adspulse_2fa_temp_secret_2024';

// // ── Helpers ───────────────────────────────────────────────────────────────────
// const signToken    = (userId) => jwt.sign({ userId, verified2FA: true }, JWT_SECRET, { expiresIn: '7d' });
// const signTempToken= (userId) => jwt.sign({ userId, pending2FA: true }, JWT_2FA_SECRET, { expiresIn: '10m' });
// const generateOTP  = () => Math.floor(100000 + Math.random() * 900000).toString();

// async function sendOTPEmail(email, otp, name) {
//   try {
//     if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
//       console.log(`\n[2FA Email OTP] ==================`);
//       console.log(`  To:   ${email}`);
//       console.log(`  Name: ${name}`);
//       console.log(`  Code: ${otp}`);
//       console.log(`  (Configure SMTP_USER and SMTP_PASS in .env to send real emails)`);
//       console.log(`=====================================\n`);
//       return true;
//     }
//     const nodemailer = require('nodemailer');
//     const transporter = nodemailer.createTransport({
//       host: process.env.SMTP_HOST || 'smtp.gmail.com',
//       port: parseInt(process.env.SMTP_PORT || '587'),
//       secure: false,
//       auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
//     });
//     await transporter.sendMail({
//       from: `"AdsPulse" <${process.env.SMTP_USER}>`,
//       to: email,
//       subject: 'AdsPulse — Your verification code',
//       html: `
//         <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f0a1e;color:#e8e0f5;border-radius:16px;">
//           <div style="font-size:32px;margin-bottom:12px;">⚡ AdsPulse</div>
//           <h2 style="color:#c084fc;margin:0 0 16px;">Your verification code</h2>
//           <p style="color:#8b7baa;">Hi ${name}, enter this code to complete sign-in. Expires in 10 minutes.</p>
//           <div style="font-size:40px;font-weight:800;letter-spacing:16px;color:#ffffff;background:#1a1033;padding:24px;border-radius:12px;text-align:center;border:1px solid rgba(124,58,237,0.3);">
//             ${otp}
//           </div>
//           <p style="color:#6b7280;font-size:12px;margin-top:24px;">If you didn't request this, ignore this email.</p>
//         </div>`
//     });
//     return true;
//   } catch (err) {
//     console.error('[Email OTP Error]', err.message);
//     return false;
//   }
// }

// // ── REGISTER ──────────────────────────────────────────────────────────────────
// router.post('/register', async (req, res) => {
//   try {
//     const { name, email, password } = req.body;
//     if (!name || !email || !password) return res.status(400).json({ message: 'All fields are required' });
//     if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
//     if (mongoose.connection.readyState !== 1) return res.status(503).json({ message: 'Database not connected' });

//     const existing = await User.findOne({ email: email.toLowerCase().trim() });
//     if (existing) return res.status(400).json({ message: 'Email already in use' });

//     const user = await User.create({ name: name.trim(), email: email.toLowerCase().trim(), password, role: 'manager' });
//     const token = signToken(user._id);
//     res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, twoFactorEnabled: false } });
//   } catch (err) {
//     console.error('[Register]', err.message);
//     if (err.code === 11000) return res.status(400).json({ message: 'Email already in use' });
//     res.status(500).json({ message: 'Registration failed: ' + err.message });
//   }
// });

// // ── LOGIN (Step 1) ─────────────────────────────────────────────────────────────
// router.post('/login', async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
//     if (mongoose.connection.readyState !== 1) return res.status(503).json({ message: 'Database not connected. Is MongoDB running?' });

//     const user = await User.findOne({ email: email.toLowerCase().trim() });
//     if (!user) return res.status(401).json({ message: 'Invalid email or password' });

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

//     user.lastLogin = new Date();
//     await user.save();

//     // 2FA enabled → send OTP / prompt for TOTP
//     if (user.twoFactorEnabled) {
//       if (user.twoFactorMethod === 'email') {
//         const otp = generateOTP();
//         user.emailOTP = otp;
//         user.emailOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
//         await user.save();
//         await sendOTPEmail(user.email, otp, user.name);
//       }
//       const tempToken = signTempToken(user._id);
//       return res.json({
//         requires2FA: true,
//         method: user.twoFactorMethod,
//         tempToken,
//         message: user.twoFactorMethod === 'email'
//           ? `Verification code sent to ${user.email}`
//           : 'Enter the 6-digit code from your authenticator app'
//       });
//     }

//     const token = signToken(user._id);
//     res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, twoFactorEnabled: false } });
//   } catch (err) {
//     console.error('[Login]', err.message);
//     res.status(500).json({ message: 'Login failed: ' + err.message });
//   }
// });

// // ── VERIFY 2FA (Step 2) ───────────────────────────────────────────────────────
// router.post('/verify-2fa', async (req, res) => {
//   try {
//     const { tempToken, code } = req.body;
//     if (!tempToken || !code) return res.status(400).json({ message: 'Token and code are required' });

//     let decoded;
//     try {
//       decoded = jwt.verify(tempToken, JWT_2FA_SECRET);
//     } catch (e) {
//       return res.status(401).json({ message: '2FA session expired. Please log in again.' });
//     }
//     if (!decoded.pending2FA) return res.status(401).json({ message: 'Invalid 2FA session' });

//     const user = await User.findById(decoded.userId);
//     if (!user) return res.status(401).json({ message: 'User not found' });

//     let valid = false;

//     if (user.twoFactorMethod === 'totp') {
//       const { totp } = require('otplib');
//       // Allow a 1-step window (30 sec before/after) for clock drift
//       totp.options = { window: 1 };
//       valid = totp.verify({ token: code.replace(/\s/g, '').trim(), secret: user.twoFactorSecret });
//     } else {
//       // Email OTP
//       if (user.emailOTP && user.emailOTPExpiry && user.emailOTPExpiry > new Date()) {
//         valid = user.emailOTP === code.trim();
//         if (valid) {
//           user.emailOTP = undefined;
//           user.emailOTPExpiry = undefined;
//           await user.save();
//         }
//       }
//     }

//     if (!valid) return res.status(401).json({ message: 'Invalid or expired verification code. Please try again.' });

//     const token = signToken(user._id);
//     res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, twoFactorEnabled: true } });
//   } catch (err) {
//     console.error('[2FA Verify]', err.message);
//     res.status(500).json({ message: '2FA verification failed: ' + err.message });
//   }
// });

// // ── SETUP 2FA ─────────────────────────────────────────────────────────────────
// router.post('/2fa/setup', authMiddleware, async (req, res) => {
//   try {
//     const { method = 'totp' } = req.body;
//     const user = await User.findById(req.user._id);

//     if (method === 'totp') {
//       const { authenticator } = require('otplib');
//       const secret = authenticator.generateSecret();
//       const serviceName = 'AdsPulse';
//       const otpauth = authenticator.keyuri(user.email, serviceName, secret);
//       const QRCode = require('qrcode');
//       const qrCodeDataURL = await QRCode.toDataURL(otpauth);

//       user.twoFactorSecret = secret;
//       user.twoFactorMethod = 'totp';
//       await user.save();

//       res.json({ secret, qrCode: qrCodeDataURL, method: 'totp', otpauth });
//     } else {
//       // Email OTP setup
//       const otp = generateOTP();
//       user.twoFactorMethod = 'email';
//       user.emailOTP = otp;
//       user.emailOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
//       await user.save();

//       const sent = await sendOTPEmail(user.email, otp, user.name);
//       res.json({
//         method: 'email',
//         message: sent && process.env.SMTP_USER
//           ? `Verification code sent to ${user.email}`
//           : `Verification code printed to server console (configure SMTP to send emails)`
//       });
//     }
//   } catch (err) {
//     console.error('[2FA Setup]', err.message);
//     res.status(500).json({ message: '2FA setup failed: ' + err.message });
//   }
// });

// // ── ENABLE 2FA (confirm code) ─────────────────────────────────────────────────
// router.post('/2fa/enable', authMiddleware, async (req, res) => {
//   try {
//     const { code } = req.body;
//     if (!code) return res.status(400).json({ message: 'Verification code is required' });

//     const user = await User.findById(req.user._id);
//     let valid = false;

//     if (user.twoFactorMethod === 'totp') {
//       if (!user.twoFactorSecret) return res.status(400).json({ message: 'Please run setup first' });
//       const { totp } = require('otplib');
//       totp.options = { window: 1 };
//       valid = totp.verify({ token: code.replace(/\s/g, '').trim(), secret: user.twoFactorSecret });
//     } else {
//       if (user.emailOTP && user.emailOTPExpiry && user.emailOTPExpiry > new Date()) {
//         valid = user.emailOTP === code.trim();
//       }
//     }

//     if (!valid) return res.status(400).json({ message: 'Invalid code. Please check and try again.' });

//     user.twoFactorEnabled = true;
//     user.emailOTP = undefined;
//     user.emailOTPExpiry = undefined;
//     await user.save();

//     res.json({ success: true, message: '2FA enabled successfully. Your account is now more secure.' });
//   } catch (err) {
//     console.error('[2FA Enable]', err.message);
//     res.status(500).json({ message: 'Failed to enable 2FA: ' + err.message });
//   }
// });

// // ── DISABLE 2FA ───────────────────────────────────────────────────────────────
// router.post('/2fa/disable', authMiddleware, async (req, res) => {
//   try {
//     const { password } = req.body;
//     if (!password) return res.status(400).json({ message: 'Password is required' });

//     const user = await User.findById(req.user._id);
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(401).json({ message: 'Incorrect password' });

//     user.twoFactorEnabled = false;
//     user.twoFactorSecret = undefined;
//     user.emailOTP = undefined;
//     user.emailOTPExpiry = undefined;
//     await user.save();

//     res.json({ success: true, message: '2FA disabled successfully' });
//   } catch (err) {
//     res.status(500).json({ message: 'Failed to disable 2FA: ' + err.message });
//   }
// });

// // ── RESEND OTP (email method) ─────────────────────────────────────────────────
// router.post('/2fa/resend-otp', async (req, res) => {
//   try {
//     const { tempToken } = req.body;
//     let decoded;
//     try { decoded = jwt.verify(tempToken, JWT_2FA_SECRET); }
//     catch { return res.status(401).json({ message: 'Session expired. Please log in again.' }); }

//     const user = await User.findById(decoded.userId);
//     if (!user || user.twoFactorMethod !== 'email') return res.status(400).json({ message: 'Invalid request' });

//     const otp = generateOTP();
//     user.emailOTP = otp;
//     user.emailOTPExpiry = new Date(Date.now() + 10