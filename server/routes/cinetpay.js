const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const crypto  = require('crypto');
const auth    = require('../middleware/auth');
const User    = require('../models/User');
const Invoice = require('../models/Invoice');
const { createNotification } = require('../utils/notifications');

// ── CinetPay config ───────────────────────────────────────────────────────────
const CINETPAY_API     = 'https://api-checkout.cinetpay.com/v2';
const CINETPAY_SITE_ID = process.env.CINETPAY_SITE_ID;
const CINETPAY_API_KEY = process.env.CINETPAY_API_KEY;

function cinetpayConfigured() {
  return !!(CINETPAY_SITE_ID && CINETPAY_API_KEY);
}

// Payment channels available
const PAYMENT_CHANNELS = [
  { id: 'MOBILE_MONEY', label: 'MTN Mobile Money',   icon: '📱', color: '#FFCC00', country: 'CM' },
  { id: 'ORANGE_MONEY', label: 'Orange Money',        icon: '🟠', color: '#FF6600', country: 'CM' },
  { id: 'WAVE',         label: 'Wave',                icon: '🌊', color: '#1DC8EE', country: 'SN' },
  { id: 'CREDIT_CARD',  label: 'Credit / Debit Card', icon: '💳', color: '#7C3AED', country: 'ALL' },
];

// ── CHECK config status ───────────────────────────────────────────────────────
router.get('/status', auth, (req, res) => {
  res.json({
    configured: cinetpayConfigured(),
    channels:   PAYMENT_CHANNELS,
    currency:   'XAF',
    country:    'CM',
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// INITIATE PAYMENT — creates a CinetPay transaction
// ══════════════════════════════════════════════════════════════════════════════
router.post('/initiate', auth, async (req, res) => {
  try {
    if (!cinetpayConfigured()) {
      return res.status(400).json({
        message: 'CinetPay not configured. Add CINETPAY_SITE_ID and CINETPAY_API_KEY to server/.env'
      });
    }

    const {
      amount,
      currency   = 'XAF',
      description,
      platform,
      campaignId,
      channel,        // MOBILE_MONEY | ORANGE_MONEY | WAVE | CREDIT_CARD
      phoneNumber,    // required for mobile money
      customerName,
      customerEmail,
      customerSurname,
    } = req.body;

    if (!amount || amount <= 0)
      return res.status(400).json({ message: 'Amount must be greater than 0' });

    // CinetPay minimum is 100 XAF
    if (currency === 'XAF' && amount < 100)
      return res.status(400).json({ message: 'Minimum amount is 100 XAF' });

    const user = await User.findById(req.user._id);

    // Generate unique transaction ID
    const transactionId = `ADS-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;

    const notify_url  = `${process.env.SERVER_URL || 'http://localhost:5000'}/api/cinetpay/notify`;
    const return_url  = `${process.env.CLIENT_URL  || 'http://localhost:3000'}/ad-spend?payment=success`;
    const cancel_url  = `${process.env.CLIENT_URL  || 'http://localhost:3000'}/ad-spend?payment=cancelled`;

    // Build CinetPay payload
    const payload = {
      apikey:          CINETPAY_API_KEY,
      site_id:         CINETPAY_SITE_ID,
      transaction_id:  transactionId,
      amount:          Math.round(amount),
      currency,
      alternative_currency: '',
      description:     description || `AdsPulse — ${platform || 'Ad spend'}`,
      notify_url,
      return_url,
      cancel_url,
      lang:            'fr',
      // Customer info
      customer_id:     req.user._id.toString(),
      customer_name:   customerName    || user.name.split(' ')[0]  || 'Client',
      customer_surname:customerSurname || user.name.split(' ').slice(1).join(' ') || '',
      customer_email:  customerEmail   || user.email,
      customer_phone_number: phoneNumber || '',
      customer_address:'',
      customer_city:   'Yaoundé',
      customer_country:'CM',
      customer_state:  'CM',
      customer_zip_code:'00000',
      // Payment channel
      channels:        channel || 'ALL',
      metadata:        JSON.stringify({
        userId:     req.user._id.toString(),
        platform:   platform   || '',
        campaignId: campaignId || '',
      }),
    };

    console.log(`[CinetPay] Initiating payment: ${transactionId} — ${amount} ${currency}`);

    const response = await axios.post(`${CINETPAY_API}/payment`, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    const data = response.data;

    if (data.code !== '201') {
      console.error('[CinetPay] Error:', data);
      return res.status(400).json({
        message: data.message || 'Payment initiation failed',
        code:    data.code
      });
    }

    // Create a pending invoice
    const invoice = await Invoice.create({
      userId:          req.user._id,
      platform:        platform || 'general',
      amount:          parseFloat(amount),
      currency,
      status:          'pending',
      paymentMethod:   PAYMENT_CHANNELS.find(c => c.id === channel)?.label || 'Mobile Money',
      cinetpayTransactionId: transactionId,
      period:          { start: new Date(Date.now() - 30*86400000), end: new Date() },
      lines: [{
        description: description || `Ad spend — ${platform}`,
        platform,
        campaignId,
        amount:   parseFloat(amount),
        currency,
      }]
    });

    console.log(`[CinetPay] ✅ Payment initiated: ${transactionId} → redirect to ${data.data.payment_url}`);

    res.json({
      success:       true,
      transactionId,
      paymentUrl:    data.data.payment_url,   // redirect user here
      paymentToken:  data.data.payment_token,
      invoiceId:     invoice._id,
    });

  } catch (err) {
    console.error('[CinetPay Initiate]', err.response?.data || err.message);
    const msg = err.response?.data?.message || err.message;
    res.status(500).json({ message: `Payment initiation failed: ${msg}` });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// CHECK PAYMENT STATUS — poll this after user completes payment
// ══════════════════════════════════════════════════════════════════════════════
router.get('/check/:transactionId', auth, async (req, res) => {
  try {
    if (!cinetpayConfigured())
      return res.status(400).json({ message: 'CinetPay not configured' });

    const { transactionId } = req.params;

    const response = await axios.post(`${CINETPAY_API}/payment/check`, {
      apikey:         CINETPAY_API_KEY,
      site_id:        CINETPAY_SITE_ID,
      transaction_id: transactionId,
    });

    const data   = response.data;
    const status = data.data?.status;

    console.log(`[CinetPay] Check ${transactionId}: ${status}`);

    // Map CinetPay status to our status
    const statusMap = {
      'ACCEPTED':   'paid',
      'REFUSED':    'failed',
      'CANCELLED':  'failed',
      'PENDING':    'pending',
      'WAITING':    'pending',
    };

    const ourStatus = statusMap[status] || 'pending';

    // Update invoice in DB
    const invoice = await Invoice.findOneAndUpdate(
      { cinetpayTransactionId: transactionId, userId: req.user._id },
      {
        status:  ourStatus,
        ...(ourStatus === 'paid' ? { paidAt: new Date() } : {}),
      },
      { new: true }
    );

    // Send notification if newly paid
    if (ourStatus === 'paid' && invoice) {
      await createNotification(req.user._id, {
        type: 'success', category: 'budget',
        title: '✅ Payment Confirmed',
        message: `Payment of ${invoice.amount.toLocaleString()} ${invoice.currency} confirmed via ${invoice.paymentMethod}.`,
        link: '/ad-spend'
      });
    }

    if (ourStatus === 'failed') {
      await createNotification(req.user._id, {
        type: 'error', category: 'budget',
        title: '❌ Payment Failed',
        message: `Your payment of ${invoice?.amount?.toLocaleString() || ''} ${invoice?.currency || 'XAF'} was not completed. Please try again.`,
        link: '/ad-spend'
      });
    }

    res.json({
      transactionId,
      status:       ourStatus,
      cinetpayStatus: status,
      amount:       data.data?.amount,
      currency:     data.data?.currency,
      paymentMethod:data.data?.payment_method,
      invoice,
    });

  } catch (err) {
    console.error('[CinetPay Check]', err.response?.data || err.message);
    res.status(500).json({ message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK / NOTIFY URL — CinetPay calls this when payment completes
// ══════════════════════════════════════════════════════════════════════════════
router.post('/notify', async (req, res) => {
  try {
    const { cpm_trans_id, cpm_site_id } = req.body;

    console.log('[CinetPay Notify] Transaction:', cpm_trans_id);

    // Verify this is from CinetPay
    if (cpm_site_id !== CINETPAY_SITE_ID) {
      console.warn('[CinetPay Notify] Invalid site_id — ignoring');
      return res.status(400).json({ message: 'Invalid site_id' });
    }

    // Check payment status with CinetPay
    const response = await axios.post(`${CINETPAY_API}/payment/check`, {
      apikey:         CINETPAY_API_KEY,
      site_id:        CINETPAY_SITE_ID,
      transaction_id: cpm_trans_id,
    });

    const data   = response.data;
    const status = data.data?.status;

    const statusMap = {
      'ACCEPTED':  'paid',
      'REFUSED':   'failed',
      'CANCELLED': 'failed',
    };
    const ourStatus = statusMap[status];
    if (!ourStatus) {
      console.log(`[CinetPay Notify] Ignoring status: ${status}`);
      return res.json({ message: 'OK' });
    }

    // Update invoice
    const invoice = await Invoice.findOneAndUpdate(
      { cinetpayTransactionId: cpm_trans_id },
      {
        status:  ourStatus,
        paymentMethod: data.data?.payment_method || 'Mobile Money',
        ...(ourStatus === 'paid' ? { paidAt: new Date() } : {}),
      },
      { new: true }
    );

    if (invoice) {
      await createNotification(invoice.userId, {
        type:    ourStatus === 'paid' ? 'success' : 'error',
        category:'budget',
        title:   ourStatus === 'paid' ? '✅ Payment Confirmed' : '❌ Payment Failed',
        message: ourStatus === 'paid'
          ? `Payment of ${invoice.amount.toLocaleString()} ${invoice.currency} confirmed.`
          : `Payment of ${invoice.amount.toLocaleString()} ${invoice.currency} failed.`,
        link: '/ad-spend'
      });
      console.log(`[CinetPay Notify] ✅ Invoice ${invoice.invoiceNumber} marked as ${ourStatus}`);
    }

    res.json({ message: 'OK' });
  } catch (err) {
    console.error('[CinetPay Notify]', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET INVOICES
// ══════════════════════════════════════════════════════════════════════════════
router.get('/invoices', auth, async (req, res) => {
  try {
    const invoices = await Invoice.find({ userId: req.user._id })
      .sort({ createdAt: -1 }).limit(100);
    const totalPaid = invoices.reduce((s,i) => s+(i.status==='paid'?i.amount:0), 0);
    res.json({ invoices, totalPaid });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
