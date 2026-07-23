const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const mongoose = require('mongoose');

// ── Organization Model (inline since model file may be missing) ───────────────
let Organization;
try {
  Organization = require('../models/Organization');
} catch(e) {
  const orgSchema = new mongoose.Schema({
    name:    { type: String, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      email:  String,
      name:   String,
      role:   { type: String, enum: ['owner','admin','member'], default: 'member' },
      status: { type: String, enum: ['active','pending'], default: 'active' },
      joinedAt: { type: Date, default: Date.now },
    }],
    plan:      { type: String, default: 'free' },
    settings:  { type: Object, default: {} },
  }, { timestamps: true });
  Organization = mongoose.models.Organization || mongoose.model('Organization', orgSchema);
}

// ── GET /api/organization ─────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => { // all members can view
  try {
    const org = await Organization.findOne({
      $or: [
        { ownerId: req.user._id },
        { 'members.userId': req.user._id },
      ]
    }).lean();
    if (!org) return res.status(404).json({ message: 'No organization found' });
    res.json(org);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' }); }
});

// ── POST /api/organization ────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Organization name is required' });

    const existing = await Organization.findOne({
      $or: [{ ownerId: req.user._id }, { 'members.userId': req.user._id }]
    });
    if (existing) return res.status(400).json({ message: 'You are already part of an organization' });

    const User = require('../models/User');
    const user = await User.findById(req.user._id).lean();

    const org = await Organization.create({
      name: name.trim(),
      ownerId: req.user._id,
      members: [{
        userId:   req.user._id,
        email:    user?.email || '',
        name:     user?.name  || '',
        role:     'owner',
        status:   'active',
        joinedAt: new Date(),
      }],
    });
    res.status(201).json(org);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' }); }
});

// ── PUT /api/organization ─────────────────────────────────────────────────────
router.put('/', auth, async (req, res) => {
  try {
    const org = await Organization.findOneAndUpdate(
      { ownerId: req.user._id },
      { $set: req.body },
      { new: true }
    );
    if (!org) return res.status(404).json({ message: 'Organization not found or no permission' });
    res.json(org);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' }); }
});

// ── POST /api/organization/invite ─────────────────────────────────────────────
router.post('/invite', auth, requireRole('admin'), async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;
    if (!email?.trim()) return res.status(400).json({ message: 'Email is required' });

    const org = await Organization.findOne({ ownerId: req.user._id });
    if (!org) return res.status(404).json({ message: 'You must create an organization first' });

    const alreadyMember = org.members.some(m => m.email === email.trim());
    if (alreadyMember) return res.status(400).json({ message: `${email} is already a member` });

    const User = require('../models/User');
    const existingUser = await User.findOne({ email: email.trim() }).lean();

    org.members.push({
      userId:   existingUser?._id || null,
      email:    email.trim(),
      name:     existingUser?.name || '',
      role,
      status:   existingUser ? 'active' : 'pending',
      joinedAt: new Date(),
    });
    await org.save();
    res.json(org);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' }); }
});

// ── DELETE /api/organization/members/:memberId ────────────────────────────────
router.delete('/members/:memberId', auth, requireRole('admin'), async (req, res) => {
  try {
    const org = await Organization.findOne({ ownerId: req.user._id });
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    org.members = org.members.filter(m => m._id?.toString() !== req.params.memberId);
    await org.save();
    res.json(org);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' }); }
});

// ── PATCH /api/organization/members/:memberId (alias for PUT) ────────────────
router.patch('/members/:memberId', auth, requireRole('admin'), async (req, res) => {
  try {
    const org = await Organization.findOne({ ownerId: req.user._id });
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    const member = org.members.id(req.params.memberId);
    if (!member) return res.status(404).json({ message: 'Member not found' });
    if (req.body.role) member.role = req.body.role;
    await org.save();
    res.json(org);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' }); }
});

// ── PUT /api/organization/members/:memberId ───────────────────────────────────
router.put('/members/:memberId', auth, requireRole('admin'), async (req, res) => {
  try {
    const org = await Organization.findOne({ ownerId: req.user._id });
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    const member = org.members.id(req.params.memberId);
    if (!member) return res.status(404).json({ message: 'Member not found' });
    if (req.body.role) member.role = req.body.role;
    await org.save();
    res.json(org);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' }); }
});

module.exports = router;