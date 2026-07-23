const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const PaymentMethod = require('../models/PaymentMethod');

// ── Phone number formatter ────────────────────────────────────────────────────
function formatPhone(phone, prefix = '237') {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith(prefix)) return `+${digits}`;
  if (digits.startsWith('0'))    return `+${prefix}${digits.slice(1)}`;
  return `+${prefix}${digits}`;
}

// ── Validate phone for Cameroon ───────────────────────────────────────────────
function validatePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  const local  = digits.startsWith('237') ? digits.slice(3) : digits.replace(/^0/, '');
  if (local.length !== 9) return { valid: false, message: 'Phone number must be 9 digits (e.g. 612345678)' };
  if (!['6','7'].includes(local[0])) return { valid: false, message: 'Phone must start with 6 or 7' };
  return { valid: true };
}

// ── GET all payment methods ───────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const methods = await PaymentMethod.find({ userId: req.user._id })
      .sort({ isDefault: -1, createdAt: -1 });
    res.json(methods);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' }); }
});

// ── ADD payment method ────────────────────────────────────────────────────────
router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { type, phoneNumber, accountName, nickname,
            cardLast4, cardBrand, cardExpMonth, cardExpYear, cardHolder } = req.body;

    if (!type) return res.status(400).json({ message: 'Payment type is required' });

    // Validate based on type
    if (['momo', 'orange_money', 'wave'].includes(type)) {
      if (!phoneNumber) return res.status(400).json({ message: 'Phone number is required' });
      const validation = validatePhone(phoneNumber);
      if (!validation.valid) return res.status(400).json({ message: validation.message });

      const formattedPhone = formatPhone(phoneNumber,
        type === 'wave' ? '221' : '237'
      );

      // Check for duplicate
      const existing = await PaymentMethod.findOne({ userId: req.user._id, type, phoneNumber: formattedPhone });
      if (existing) return res.status(400).json({ message: `This ${getLabel(type)} number is already saved` });

      const isFirst   = (await PaymentMethod.countDocuments({ userId: req.user._id })) === 0;
      const method    = await PaymentMethod.create({
        userId:      req.user._id,
        type,
        phoneNumber: formattedPhone,
        accountName: accountName?.trim() || '',
        nickname:    nickname?.trim()    || '',
        isDefault:   isFirst,
        status:      'active',
      });
      return res.status(201).json(method);
    }

    if (type === 'card') {
      if (!cardLast4 || !cardExpMonth || !cardExpYear)
        return res.status(400).json({ message: 'Card last 4 digits and expiry are required' });
      if (cardLast4.length !== 4 || !/^\d{4}$/.test(cardLast4))
        return res.status(400).json({ message: 'Card last 4 must be exactly 4 digits' });

      const now = new Date();
      const status = (
        cardExpYear < now.getFullYear() ||
        (cardExpYear === now.getFullYear() && cardExpMonth < now.getMonth() + 1)
      ) ? 'expired' : 'active';

      const isFirst = (await PaymentMethod.countDocuments({ userId: req.user._id })) === 0;
      const method  = await PaymentMethod.create({
        userId: req.user._id, type,
        cardLast4, cardBrand: cardBrand?.toLowerCase() || 'unknown',
        cardExpMonth: parseInt(cardExpMonth),
        cardExpYear:  parseInt(cardExpYear),
        cardHolder:   cardHolder?.trim() || '',
        nickname:     nickname?.trim()   || '',
        isDefault:    isFirst,
        status,
      });
      return res.status(201).json(method);
    }

    res.status(400).json({ message: `Unknown payment type: ${type}` });
  } catch (err) {
    res.status(400).json({ message: 'Invalid request. Please check your input.' });
  }
});

// ── UPDATE payment method (nickname only) ─────────────────────────────────────
router.patch('/:id', auth, async (req, res) => {
  try {
    const { nickname, accountName } = req.body;
    const method = await PaymentMethod.findOne({ _id: req.params.id, userId: req.user._id });
    if (!method) return res.status(404).json({ message: 'Payment method not found' });
    if (nickname    !== undefined) method.nickname    = nickname.trim();
    if (accountName !== undefined) method.accountName = accountName.trim();
    await method.save();
    res.json(method);
  } catch (err) { res.status(400).json({ message: 'Invalid request. Please check your input.' }); }
});

// ── SET DEFAULT ───────────────────────────────────────────────────────────────
router.patch('/:id/set-default', auth, requireRole('admin'), async (req, res) => {
  try {
    const method = await PaymentMethod.findOne({ _id: req.params.id, userId: req.user._id });
    if (!method) return res.status(404).json({ message: 'Payment method not found' });
    if (method.status === 'expired') return res.status(400).json({ message: 'Cannot set an expired method as default' });

    await PaymentMethod.updateMany({ userId: req.user._id }, { isDefault: false });
    method.isDefault = true;
    await method.save();
    res.json(method);
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' }); }
});

// ── DELETE payment method ─────────────────────────────────────────────────────
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const method = await PaymentMethod.findOne({ _id: req.params.id, userId: req.user._id });
    if (!method) return res.status(404).json({ message: 'Payment method not found' });

    await method.deleteOne();

    // If deleted method was default, set next one as default
    if (method.isDefault) {
      const next = await PaymentMethod.findOne({ userId: req.user._id });
      if (next) { next.isDefault = true; await next.save(); }
    }

    res.json({ success: true });
  } catch (err) { console.error('[Route Error]', err.message); res.status(500).json({ message: 'An unexpected error occurred. Please try again.' }); }
});

function getLabel(type) {
  const labels = { momo:'MTN MoMo', orange_money:'Orange Money', wave:'Wave', card:'Card' };
  return labels[type] || type;
}

module.exports = router;
