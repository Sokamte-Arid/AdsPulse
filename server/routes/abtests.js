const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const ABTest  = require('../models/ABTest');
const axios   = require('axios');

// ── GET /api/abtests ──────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const tests = await ABTest.find({ userId: req.user._id })
      .sort({ createdAt: -1 }).lean();
    res.json(tests);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' }); }
});

// ── GET /api/abtests/:id ──────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const test = await ABTest.findOne({ _id: req.params.id, userId: req.user._id });
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.json(test);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' }); }
});

// ── POST /api/abtests ─────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { name, objective, platforms, totalBudget, currency, budgetType,
            splitType, durationDays, startDate, endDate, variations, targeting, notes, campaignId } = req.body;

    if (!name?.trim()) return res.status(400).json({ message: 'Test name is required' });
    if (!variations || variations.length < 2) return res.status(400).json({ message: 'At least 2 variations are required' });
    if (variations.length > 4) return res.status(400).json({ message: 'Maximum 4 variations allowed' });

    // Equal split
    const pct = Math.floor(100 / variations.length);
    const processedVariations = variations.map((v, i) => ({
      ...v,
      name:         v.name || `Variation ${String.fromCharCode(65 + i)}`,
      budgetPercent: splitType === 'equal' ? (i === 0 ? 100 - pct * (variations.length - 1) : pct) : (v.budgetPercent || pct),
    }));

    const test = await ABTest.create({
      userId: req.user._id,
      campaignId: campaignId || undefined,
      name, objective, platforms, totalBudget, currency, budgetType,
      splitType: splitType || 'equal',
      durationDays: durationDays || 7,
      startDate: startDate || undefined,
      endDate:   endDate   || undefined,
      variations: processedVariations,
      targeting: targeting || {},
      notes: notes || '',
      status: 'draft',
    });

    res.status(201).json(test);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' }); }
});

// ── PUT /api/abtests/:id ──────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const test = await ABTest.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: req.body },
      { new: true }
    );
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.json(test);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' }); }
});

// ── POST /api/abtests/:id/launch ──────────────────────────────────────────────
router.post('/:id/launch', auth, async (req, res) => {
  try {
    const test = await ABTest.findOne({ _id: req.params.id, userId: req.user._id });
    if (!test) return res.status(404).json({ message: 'Test not found' });
    test.status    = 'active';
    test.startDate = test.startDate || new Date();
    test.endDate   = test.endDate   || new Date(Date.now() + (test.durationDays || 7) * 86400000);
    await test.save();
    res.json(test);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' }); }
});

// ── POST /api/abtests/:id/pause ───────────────────────────────────────────────
router.post('/:id/pause', auth, async (req, res) => {
  try {
    const test = await ABTest.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: 'paused' }, { new: true }
    );
    res.json(test);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' }); }
});

// ── POST /api/abtests/:id/declare-winner ─────────────────────────────────────
router.post('/:id/declare-winner', auth, async (req, res) => {
  try {
    const { variationIndex } = req.body;
    const test = await ABTest.findOne({ _id: req.params.id, userId: req.user._id });
    if (!test) return res.status(404).json({ message: 'Test not found' });

    test.winnerIndex = variationIndex;
    test.status      = 'completed';
    test.variations.forEach((v, i) => {
      v.status = i === variationIndex ? 'winner' : 'loser';
    });
    await test.save();
    res.json(test);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' }); }
});

// ── POST /api/abtests/:id/ai-analyze ─────────────────────────────────────────
router.post('/:id/ai-analyze', auth, async (req, res) => {
  try {
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) return res.status(503).json({ message: 'AI not configured' });

    const test = await ABTest.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!test) return res.status(404).json({ message: 'Test not found' });

    const variationSummary = test.variations.map((v, i) => `
Variation ${String.fromCharCode(65+i)} (${v.label || v.name}):
- Headline: ${v.headline || 'N/A'}
- CTA: ${v.callToAction || 'N/A'}
- Impressions: ${v.impressions.toLocaleString()}
- Clicks: ${v.clicks.toLocaleString()}
- CTR: ${v.ctr.toFixed(2)}%
- Conversions: ${v.conversions}
- Spend: $${v.spend.toFixed(2)}
- CPC: $${v.cpc.toFixed(2)}
- Reach: ${v.reach.toLocaleString()}`).join('\n');

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Analyze this A/B test for "${test.name}" and recommend a winner.\n\n${variationSummary}\n\nProvide: 1) Clear winner recommendation with reasoning, 2) Key insight from the data, 3) What to do next.`
      }]
    }, {
      headers: { 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      timeout: 20000,
    });

    const analysis = response.data.content[0].text;
    await ABTest.findByIdAndUpdate(test._id, { aiAnalysis: analysis, aiAnalyzedAt: new Date() });
    res.json({ analysis, analyzedAt: new Date() });
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
});

// ── DELETE /api/abtests/:id ───────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    await ABTest.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true });
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' }); }
});

module.exports = router;