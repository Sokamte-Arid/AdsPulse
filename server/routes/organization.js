const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const auth    = require('../middleware/auth');
const Organization = require('../models/Organization');
const User    = require('../models/User');
const { createNotification } = require('../utils/notifications');

// ── Email sender ──────────────────────────────────────────────────────────────
async function sendInvitationEmail(toEmail, inviterName, orgName, role, token) {
  const acceptUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/accept-invite?token=${token}`;

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║           TEAM INVITATION                    ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  To:    ${toEmail.padEnd(36)} ║`);
  console.log(`║  Org:   ${orgName.padEnd(36)} ║`);
  console.log(`║  Role:  ${role.padEnd(36)} ║`);
  console.log(`║  Link:  ${acceptUrl.slice(0,36).padEnd(36)} ║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('Full invite URL:', acceptUrl, '\n');

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { sent: false, reason: 'SMTP not configured' };
  }
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await transporter.sendMail({
      from: `"AdsPulse" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `${inviterName} invited you to join ${orgName} on AdsPulse`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;background:#f5f3ff;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:32px;text-align:center;">
            <div style="font-size:36px;margin-bottom:8px;">⚡</div>
            <div style="font-size:24px;font-weight:800;color:white;">AdsPulse</div>
          </div>
          <div style="padding:32px;background:white;">
            <h2 style="color:#1e1030;margin:0 0 12px;">You've been invited! 🎉</h2>
            <p style="color:#6b7280;line-height:1.7;margin:0 0 20px;">
              <strong style="color:#1e1030;">${inviterName}</strong> invited you to join
              <strong style="color:#7c3aed;">${orgName}</strong> as
              <strong style="color:#1e1030;text-transform:capitalize;">${role}</strong>.
            </p>
            <a href="${acceptUrl}" style="display:block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;text-decoration:none;padding:14px 24px;border-radius:10px;text-align:center;font-weight:700;font-size:15px;margin-bottom:16px;">
              Accept Invitation →
            </a>
            <p style="font-size:12px;color:#9ca3af;margin:0;">
              Link expires in 7 days. If you don't have an account yet, you'll be prompted to create one.
            </p>
          </div>
        </div>`
    });
    return { sent: true };
  } catch (err) {
    console.error('[Invite Email Error]', err.message);
    return { sent: false, reason: err.message };
  }
}

// ── Helper: check if user is owner or admin of org ────────────────────────────
function userIsOwnerOrAdmin(org, userId) {
  const userIdStr = userId.toString();
  // Check ownerId
  if (org.ownerId?.toString() === userIdStr) return true;
  // Check members array
  const member = org.members.find(m => m.userId?.toString() === userIdStr);
  return member && ['owner', 'admin'].includes(member.role);
}

function userIsOwner(org, userId) {
  const userIdStr = userId.toString();
  if (org.ownerId?.toString() === userIdStr) return true;
  const member = org.members.find(m => m.userId?.toString() === userIdStr);
  return member && member.role === 'owner';
}

// ── GET my organization ───────────────────────────────────────────────────────
router.get('/my', auth, async (req, res) => {
  try {
    const org = await Organization.findOne({
      $or: [{ ownerId: req.user._id }, { 'members.userId': req.user._id }]
    }).populate('members.userId', 'name email role lastLogin createdAt');
    res.json(org || null);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── CREATE organization ───────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { name, currency, timezone } = req.body;
    if (!name) return res.status(400).json({ message: 'Organization name is required' });

    const existing = await Organization.findOne({
      $or: [{ ownerId: req.user._id }, { 'members.userId': req.user._id }]
    });
    if (existing) return res.status(400).json({ message: 'You are already part of an organization' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
    const org  = await Organization.create({
      name: name.trim(), slug, ownerId: req.user._id,
      members: [{ userId: req.user._id, role: 'owner', joinedAt: new Date() }],
      settings: { currency: currency || 'USD', timezone: timezone || 'UTC' }
    });
    res.status(201).json(org);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── GET members + pending invites ─────────────────────────────────────────────
router.get('/my/members', auth, async (req, res) => {
  try {
    const org = await Organization.findOne({
      $or: [{ ownerId: req.user._id }, { 'members.userId': req.user._id }]
    }).populate('members.userId', 'name email role lastLogin createdAt');
    if (!org) return res.status(404).json({ message: 'No organization found' });

    // Filter out expired invites older than 7 days from display
    const activeInvites = (org.pendingInvites || []).filter(i =>
      !i.expiresAt || new Date(i.expiresAt) > new Date(Date.now() - 86400000)
    );

    res.json({ members: org.members, pendingInvites: activeInvites });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── INVITE member ─────────────────────────────────────────────────────────────
router.post('/my/invite', auth, async (req, res) => {
  try {
    const { email, role = 'viewer' } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    if (!['admin', 'manager', 'viewer'].includes(role))
      return res.status(400).json({ message: 'Role must be admin, manager or viewer' });

    const org = await Organization.findOne({
      $or: [{ ownerId: req.user._id }, { 'members.userId': req.user._id }]
    });
    if (!org) return res.status(404).json({ message: 'No organization found. Create one first.' });

    // Check permission
    if (!userIsOwnerOrAdmin(org, req.user._id))
      return res.status(403).json({ message: 'Only owners and admins can invite members' });

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already a member
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const alreadyMember = org.members.some(m => m.userId?.toString() === existingUser._id.toString());
      if (alreadyMember) return res.status(400).json({ message: `${email} is already a member of this organization` });
    }

    // Remove old invite for same email if exists (allows re-inviting with different role)
    org.pendingInvites = (org.pendingInvites || []).filter(i => i.email !== normalizedEmail);

    // Create new invite token
    const token     = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 86400000);
    org.pendingInvites.push({ email: normalizedEmail, role, token, expiresAt });
    await org.save();

    // Send in-app notification if user already exists
    if (existingUser) {
      await createNotification(existingUser._id, {
        type: 'info', category: 'system',
        title: '👥 Team Invitation',
        message: `${req.user.name} invited you to join "${org.name}" as ${role}.`,
        link: `/accept-invite?token=${token}`,
        meta: { token, orgName: org.name, role }
      });
    }

    // Send email
    const emailResult = await sendInvitationEmail(normalizedEmail, req.user.name, org.name, role, token);
    const acceptUrl   = `${process.env.CLIENT_URL || 'http://localhost:3000'}/accept-invite?token=${token}`;

    res.json({
      success:   true,
      emailSent: emailResult.sent,
      acceptUrl: process.env.NODE_ENV !== 'production' ? acceptUrl : undefined,
      message:   emailResult.sent
        ? `✅ Invitation sent to ${email}`
        : `Invitation created for ${email}. Copy the link below to share manually.`
    });
  } catch (err) {
    console.error('[Invite Error]', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── RESEND invitation ─────────────────────────────────────────────────────────
router.post('/my/invite/resend', auth, async (req, res) => {
  try {
    const { email } = req.body;
    const org = await Organization.findOne({
      $or: [{ ownerId: req.user._id }, { 'members.userId': req.user._id }]
    });
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    if (!userIsOwnerOrAdmin(org, req.user._id))
      return res.status(403).json({ message: 'Only owners and admins can resend invitations' });

    const invite = org.pendingInvites?.find(i => i.email === email.toLowerCase());
    if (!invite) return res.status(404).json({ message: 'Invitation not found' });

    invite.expiresAt = new Date(Date.now() + 7 * 86400000);
    await org.save();

    const emailResult = await sendInvitationEmail(email, req.user.name, org.name, invite.role, invite.token);
    const acceptUrl   = `${process.env.CLIENT_URL || 'http://localhost:3000'}/accept-invite?token=${invite.token}`;

    res.json({
      success: true, emailSent: emailResult.sent,
      acceptUrl: process.env.NODE_ENV !== 'production' ? acceptUrl : undefined,
      message: emailResult.sent ? `Invitation resent to ${email}` : 'Invitation refreshed. Copy the link to share.'
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── CANCEL invitation ─────────────────────────────────────────────────────────
router.delete('/my/invite/:email', auth, async (req, res) => {
  try {
    const org = await Organization.findOne({
      $or: [{ ownerId: req.user._id }, { 'members.userId': req.user._id }]
    });
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    if (!userIsOwnerOrAdmin(org, req.user._id))
      return res.status(403).json({ message: 'Only owners and admins can cancel invitations' });

    org.pendingInvites = (org.pendingInvites || []).filter(
      i => i.email !== decodeURIComponent(req.params.email).toLowerCase()
    );
    await org.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── ACCEPT invitation ─────────────────────────────────────────────────────────
router.post('/accept-invite', auth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token is required' });

    const org = await Organization.findOne({ 'pendingInvites.token': token });
    if (!org) return res.status(404).json({ message: 'Invalid or expired invitation link' });

    const invite = org.pendingInvites.find(i => i.token === token);
    if (!invite) return res.status(404).json({ message: 'Invitation not found' });
    if (invite.expiresAt < new Date())
      return res.status(400).json({ message: 'This invitation has expired. Ask the owner to resend it.' });

    // Verify email matches
    if (req.user.email.toLowerCase() !== invite.email.toLowerCase()) {
      return res.status(403).json({
        message: `This invitation was sent to ${invite.email}. Please log in with that account.`
      });
    }

    // Add to members if not already
    const alreadyMember = org.members.some(m => m.userId?.toString() === req.user._id.toString());
    if (!alreadyMember) {
      org.members.push({
        userId: req.user._id, role: invite.role,
        joinedAt: new Date(), invitedBy: org.ownerId
      });
    }

    org.pendingInvites = org.pendingInvites.filter(i => i.token !== token);
    await org.save();

    // Notify owner
    await createNotification(org.ownerId, {
      type: 'success', category: 'system',
      title: '👥 Member Joined',
      message: `${req.user.name} joined "${org.name}" as ${invite.role}.`,
      link: '/team'
    });

    res.json({ success: true, organization: org.name, role: invite.role });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── CHANGE member role ────────────────────────────────────────────────────────
router.patch('/my/members/:memberId', auth, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'manager', 'viewer'].includes(role))
      return res.status(400).json({ message: 'Role must be admin, manager or viewer' });

    const org = await Organization.findOne({
      $or: [{ ownerId: req.user._id }, { 'members.userId': req.user._id }]
    });
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    // Only owner can change roles
    if (!userIsOwner(org, req.user._id))
      return res.status(403).json({ message: 'Only the owner can change member roles' });

    const memberIdStr = req.params.memberId;

    // Find the member — search by userId string
    const memberIdx = org.members.findIndex(m => m.userId?.toString() === memberIdStr);
    if (memberIdx === -1)
      return res.status(404).json({ message: 'Member not found in this organization' });

    if (org.members[memberIdx].role === 'owner')
      return res.status(400).json({ message: 'Cannot change the owner role' });

    org.members[memberIdx].role = role;
    await org.save();

    // Notify the member of role change
    await createNotification(org.members[memberIdx].userId, {
      type: 'info', category: 'system',
      title: '🔄 Role Updated',
      message: `Your role in "${org.name}" has been changed to ${role}.`,
      link: '/team'
    });

    console.log(`[Team] Role changed: member ${memberIdStr} → ${role} by ${req.user.email}`);
    res.json({ success: true, message: `Role updated to ${role}` });
  } catch (err) {
    console.error('[Role Change Error]', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── REMOVE member ─────────────────────────────────────────────────────────────
router.delete('/my/members/:memberId', auth, async (req, res) => {
  try {
    const org = await Organization.findOne({
      $or: [{ ownerId: req.user._id }, { 'members.userId': req.user._id }]
    });
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    if (!userIsOwner(org, req.user._id))
      return res.status(403).json({ message: 'Only the owner can remove members' });

    const memberIdStr = req.params.memberId;
    const member = org.members.find(m => m.userId?.toString() === memberIdStr);
    if (!member) return res.status(404).json({ message: 'Member not found' });
    if (member.role === 'owner') return res.status(400).json({ message: 'Cannot remove the owner' });

    org.members = org.members.filter(m => m.userId?.toString() !== memberIdStr);
    await org.save();

    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
