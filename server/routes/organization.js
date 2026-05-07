const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const auth = require('../middleware/auth');
const Organization = require('../models/Organization');
const User = require('../models/User');
const { createNotification } = require('../utils/notifications');

// Get my organization
router.get('/my', auth, async (req, res) => {
  try {
    const org = await Organization.findOne({
      $or: [{ ownerId: req.user._id }, { 'members.userId': req.user._id }]
    }).populate('members.userId', 'name email role');
    res.json(org || null);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Create organization
router.post('/', auth, async (req, res) => {
  try {
    const { name, currency, timezone } = req.body;
    if (!name) return res.status(400).json({ message: 'Organization name is required' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
    const org = await Organization.create({
      name, slug, ownerId: req.user._id,
      members: [{ userId: req.user._id, role: 'owner' }],
      settings: { currency: currency || 'USD', timezone: timezone || 'UTC' }
    });
    res.status(201).json(org);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Get members
router.get('/my/members', auth, async (req, res) => {
  try {
    const org = await Organization.findOne({
      $or: [{ ownerId: req.user._id }, { 'members.userId': req.user._id }]
    }).populate('members.userId', 'name email role lastLogin');
    if (!org) return res.status(404).json({ message: 'No organization found' });
    res.json(org.members);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Invite member by email
router.post('/my/invite', auth, async (req, res) => {
  try {
    const { email, role = 'viewer' } = req.body;
    const org = await Organization.findOne({ ownerId: req.user._id });
    if (!org) return res.status(404).json({ message: 'You must create an organization first' });

    const token = crypto.randomBytes(32).toString('hex');
    org.pendingInvites.push({ email, role, token, expiresAt: new Date(Date.now() + 7 * 86400000) });
    await org.save();

    // If user already exists, notify them
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      await createNotification(existingUser._id, {
        type: 'info', category: 'system',
        title: 'Team Invitation',
        message: `${req.user.name} invited you to join "${org.name}" as ${role}.`,
        link: `/accept-invite?token=${token}`
      });
    }

    res.json({ success: true, message: `Invitation sent to ${email}`, token });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Accept invite
router.post('/accept-invite', auth, async (req, res) => {
  try {
    const { token } = req.body;
    const org = await Organization.findOne({ 'pendingInvites.token': token });
    if (!org) return res.status(404).json({ message: 'Invalid or expired invitation' });

    const invite = org.pendingInvites.find(i => i.token === token);
    if (!invite || invite.expiresAt < new Date()) return res.status(400).json({ message: 'Invitation has expired' });

    // Add to members
    const alreadyMember = org.members.some(m => m.userId.toString() === req.user._id.toString());
    if (!alreadyMember) org.members.push({ userId: req.user._id, role: invite.role });
    org.pendingInvites = org.pendingInvites.filter(i => i.token !== token);
    await org.save();

    res.json({ success: true, organization: org.name });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Update member role
router.patch('/my/members/:memberId', auth, async (req, res) => {
  try {
    const { role } = req.body;
    const org = await Organization.findOne({ ownerId: req.user._id });
    if (!org) return res.status(403).json({ message: 'Only the owner can change roles' });
    const member = org.members.find(m => m.userId.toString() === req.params.memberId);
    if (!member) return res.status(404).json({ message: 'Member not found' });
    member.role = role;
    await org.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Remove member
router.delete('/my/members/:memberId', auth, async (req, res) => {
  try {
    const org = await Organization.findOne({ ownerId: req.user._id });
    if (!org) return res.status(403).json({ message: 'Only the owner can remove members' });
    org.members = org.members.filter(m => m.userId.toString() !== req.params.memberId);
    await org.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
