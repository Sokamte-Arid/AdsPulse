const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const PaymentMethod = require('../models/PaymentMethod');
const Invoice = require('../models/Invoice');
const { createNotification } = require('../utils/notifications');

// ── GET all payment methods ───────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const methods = await PaymentMethod.find({ userId: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
    res.json(methods);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── ADD payment method ────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { type, brand, last4, expMonth, expYear, holderName, paypalEmail, bankName, accountLast4, nickname, stripePaymentMethodId } = req.body;

    // Validate card fields
    if (type === 'card') {
      if (!last4 || !expMonth || !expYear || !brand)
        return res.status(400).json({ message: 'Card brand, last 4 digits, and expiry are required' });
      if (expYear < new Date().getFullYear() || (expYear === new Date().getFullYear() && expMonth < new Date().getMonth() + 1))
        return res.status(400).json({ message: 'This card has expired' });
    }
    if (type === 'paypal' && !paypalEmail)
      return res.status(400).json({ message: 'PayPal email is required' });
    if (type === 'bank' && (!bankName || !accountLast4))
      return res.status(400).json({ message: 'Bank name and account number are required' });

    // If this is the first method, make it default
    const count = await PaymentMethod.countDocuments({ userId: req.user._id });
    const isDefault = count === 0;

    const method = await PaymentMethod.create({
      userId: req.user._id, type, brand, last4, expMonth, expYear,
      holderName, paypalEmail, bankName, accountLast4, nickname,
      stripePaymentMethodId, isDefault
    });

    await createNotification(req.user._id, {
      type: 'success', category: 'system',
      title: '💳 Payment Method Added',
      message: `Your ${type === 'card' ? `${brand} card ending in ${last4}` : type === 'paypal' ? `PayPal (${paypalEmail})` : `${bankName} account`} has been added${isDefault ? ' and set as default' : ''}.`
    });

    res.status(201).json(method);
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── SET DEFAULT payment method ────────────────────────────────────────────────
router.patch('/:id/set-default', auth, async (req, res) => {
  try {
    await PaymentMethod.updateMany({ userId: req.user._id }, { isDefault: false });
    const method = await PaymentMethod.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isDefault: true },
      { new: true }
    );
    if (!method) return res.status(404).json({ message: 'Payment method not found' });
    res.json(method);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── DELETE payment method ─────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const method = await PaymentMethod.findOne({ _id: req.params.id, userId: req.user._id });
    if (!method) return res.status(404).json({ message: 'Payment method not found' });
    if (method.isDefault) {
      const others = await PaymentMethod.findOne({ userId: req.user._id, _id: { $ne: req.params.id } });
      if (others) { others.isDefault = true; await others.save(); }
    }
    await method.deleteOne();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── SIMULATE CHARGE (check funds) ────────────────────────────────────────────
router.post('/charge', auth, async (req, res) => {
  try {
    const { amount, currency = 'USD', platform, campaignId } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    const defaultMethod = await PaymentMethod.findOne({ userId: req.user._id, isDefault: true });
    if (!defaultMethod) {
      await createNotification(req.user._id, {
        type: 'error', category: 'budget',
        title: '❌ No Payment Method',
        message: 'You have no payment method set up. Add one in Ad Spend → Payment Methods before launching campaigns.',
        link: '/ad-spend'
      });
      return res.status(400).json({ message: 'No payment method found. Please add one first.' });
    }

    // Check if card is expired
    if (defaultMethod.type === 'card') {
      const now = new Date();
      if (defaultMethod.expYear < now.getFullYear() ||
        (defaultMethod.expYear === now.getFullYear() && defaultMethod.expMonth < now.getMonth() + 1)) {
        await createNotification(req.user._id, {
          type: 'error', category: 'budget',
          title: '❌ Payment Card Expired',
          message: `Your ${defaultMethod.brand} card ending in ${defaultMethod.last4} has expired. Please update your payment method.`,
          link: '/ad-spend'
        });
        defaultMethod.status = 'expired';
        await defaultMethod.save();
        return res.status(400).json({ message: `Your card (${defaultMethod.brand} ****${defaultMethod.last4}) has expired. Please update your payment method.` });
      }
    }

    // In production: call Stripe to charge the card
    // const paymentIntent = await stripe.paymentIntents.create({ amount: amount*100, currency, payment_method: defaultMethod.stripePaymentMethodId, confirm: true });

    // Simulate insufficient funds (random 10% chance for demo, or if amount > 10000)
    if (amount > 10000) {
      await createNotification(req.user._id, {
        type: 'error', category: 'budget',
        title: '❌ Insufficient Funds',
        message: `Payment of $${amount.toFixed(2)} for ${platform} ads failed. Insufficient funds on ${defaultMethod.brand || ''} card ending in ${defaultMethod.last4 || '****'}. Please add funds or use a different payment method.`,
        link: '/ad-spend',
        meta: { platform, amount, paymentMethodId: defaultMethod._id }
      });
      return res.status(402).json({
        message: `Insufficient funds. Your ${defaultMethod.brand} card ending in ${defaultMethod.last4} could not be charged $${amount.toFixed(2)}.`,
        code: 'INSUFFICIENT_FUNDS',
        paymentMethod: { brand: defaultMethod.brand, last4: defaultMethod.last4 }
      });
    }

    // Create invoice for successful charge
    const Invoice = require('../models/Invoice');
    const invoice = await Invoice.create({
      userId: req.user._id,
      platform,
      amount,
      currency,
      status: 'paid',
      paidAt: new Date(),
      paymentMethod: `${defaultMethod.brand || defaultMethod.type} ****${defaultMethod.last4 || defaultMethod.accountLast4}`,
      period: { start: new Date(Date.now() - 30 * 86400000), end: new Date() },
      lines: [{ description: `Ad spend — ${platform}`, platform, amount }]
    });

    await createNotification(req.user._id, {
      type: 'success', category: 'budget',
      title: '✅ Payment Successful',
      message: `$${amount.toFixed(2)} charged to ${defaultMethod.brand} ****${defaultMethod.last4} for ${platform} ads.`,
      link: '/ad-spend'
    });

    res.json({ success: true, invoice, paymentMethod: { brand: defaultMethod.brand, last4: defaultMethod.last4 } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── DOWNLOAD invoice as JSON (PDF generation client-side) ─────────────────────
router.get('/invoices/:id/download', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user._id });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    // Send as downloadable JSON — client converts to PDF
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(invoice);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
