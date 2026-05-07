const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');

router.get('/', auth, async (req, res) => {
  try {
    const { limit = 50, action, resource } = req.query;
    const filter = { userId: req.user._id };
    if (action) filter.action = new RegExp(action, 'i');
    if (resource) filter.resource = resource;
    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(Number(limit));
    res.json(logs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
