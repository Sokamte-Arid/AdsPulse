const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Invoice = require('../models/Invoice');
const Campaign = require('../models/Campaign');
const { createNotification } = require('../utils/notifications');

// Get all invoices
router.get('/', auth, async (req, res) => {
  try {
    const { platform, status, limit = 50 } = req.query;
    const filter = { userId: req.user._id };
    if (platform) filter.platform = platform;
    if (status) filter.status = status;
    const invoices = await Invoice.find(filter).sort({ createdAt: -1 }).limit(Number(limit));
    const total = invoices.reduce((s, i) => s + (i.status === 'paid' ? i.amount : 0), 0);
    res.json({ invoices, totalPaid: total });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get invoice by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user._id });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Create invoice manually (or auto-created by sync)
router.post('/', auth, async (req, res) => {
  try {
    const invoice = await Invoice.create({ ...req.body, userId: req.user._id });
    await createNotification(req.user._id, {
      type: 'info', category: 'report',
      title: 'New Invoice Created',
      message: `Invoice ${invoice.invoiceNumber} for $${invoice.amount} has been created.`,
      link: `/ad-spend`
    });
    res.status(201).json(invoice);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Update invoice status
router.patch('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { ...req.body, ...(req.body.status === 'paid' ? { paidAt: new Date() } : {}) },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Auto-generate invoices from campaign spend data
router.post('/generate', auth, async (req, res) => {
  try {
    const { period } = req.body; // { start, end }
    const campaigns = await Campaign.find({ userId: req.user._id, status: { $in: ['active', 'completed'] } });
    const created = [];

    for (const campaign of campaigns) {
      for (const p of campaign.platforms) {
        if (!p.metrics?.amountSpent || p.metrics.amountSpent === 0) continue;
        const existing = await Invoice.findOne({
          userId: req.user._id, platform: p.platform,
          'period.start': { $gte: new Date(period?.start || Date.now() - 30 * 86400000) }
        });
        if (existing) continue;

        const invoice = await Invoice.create({
          userId: req.user._id, platform: p.platform,
          amount: parseFloat(p.metrics.amountSpent.toFixed(2)),
          currency: campaign.currency || 'USD', status: 'paid', paidAt: new Date(),
          period: { start: new Date(period?.start || Date.now() - 30 * 86400000), end: new Date(period?.end || Date.now()) },
          lines: [{ description: `Ad spend — ${campaign.name}`, platform: p.platform, campaignId: campaign._id, campaignName: campaign.name, amount: p.metrics.amountSpent, currency: campaign.currency || 'USD' }]
        });
        created.push(invoice);
      }
    }

    res.json({ created: created.length, invoices: created });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
