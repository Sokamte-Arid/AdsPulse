const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const User    = require('../models/User');
const PaymentMethod = require('../models/PaymentMethod');
const Invoice = require('../models/Invoice');
const { createNotification } = require('../utils/notifications');

// ── Stripe initialisation ─────────────────────────────────────────────────────
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not set in server/.env');
  }
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
};

// ── Ensure user has a Stripe customer ID ──────────────────────────────────────
async function getOrCreateCustomer(user) {
  const stripe = getStripe();
  if (user.stripeCustomerId) {
    // Verify customer still exists in Stripe
    try {
      await stripe.customers.retrieve(user.stripeCustomerId);
      return user.stripeCustomerId;
    } catch {
      // Customer deleted in Stripe — create a new one
    }
  }
  const customer = await stripe.customers.create({
    email: user.email,
    name:  user.name,
    metadata: { userId: user._id.toString() }
  });
  user.stripeCustomerId = customer.id;
  await user.save();
  return customer.id;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENT METHODS
// ══════════════════════════════════════════════════════════════════════════════

// Create a SetupIntent — used to save a card without charging
router.post('/setup-intent', auth, async (req, res) => {
  try {
    const stripe     = getStripe();
    const user       = await User.findById(req.user._id);
    const customerId = await getOrCreateCustomer(user);

    const setupIntent = await stripe.setupIntents.create({
      customer:             customerId,
      payment_method_types: ['card'],
      usage:                'off_session',   // allow charging when user is not present
    });

    res.json({
      clientSecret: setupIntent.client_secret,
      customerId
    });
  } catch (err) {
    console.error('[Stripe SetupIntent]', err.message);
    res.status(400).json({ message: err.message });
  }
});

// Confirm card saved after SetupIntent — called from frontend after Stripe.js confirms
router.post('/payment-methods/confirm', auth, async (req, res) => {
  try {
    const stripe = getStripe();
    const { paymentMethodId, nickname } = req.body;
    if (!paymentMethodId) return res.status(400).json({ message: 'paymentMethodId is required' });

    const user       = await User.findById(req.user._id);
    const customerId = await getOrCreateCustomer(user);

    // Attach the payment method to our customer
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });

    // Set as default if first method
    const existingCount = await PaymentMethod.countDocuments({ userId: req.user._id });
    const isDefault     = existingCount === 0;

    if (isDefault) {
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId }
      });
    }

    // Get card details from Stripe
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    const card = pm.card;

    // Check expiry
    const now = new Date();
    const isExpired = card.exp_year < now.getFullYear() ||
      (card.exp_year === now.getFullYear() && card.exp_month < now.getMonth() + 1);

    // Save to MongoDB
    const savedMethod = await PaymentMethod.create({
      userId:                req.user._id,
      type:                  'card',
      brand:                 card.brand,
      last4:                 card.last4,
      expMonth:              card.exp_month,
      expYear:               card.exp_year,
      holderName:            pm.billing_details?.name || user.name,
      stripePaymentMethodId: paymentMethodId,
      isDefault,
      status:                isExpired ? 'expired' : 'active',
      nickname:              nickname || null,
    });

    await createNotification(req.user._id, {
      type: 'success', category: 'system',
      title: '💳 Payment Method Added',
      message: `Your ${card.brand} card ending in ${card.last4} has been saved${isDefault ? ' as your default' : ''}.`
    });

    res.status(201).json(savedMethod);
  } catch (err) {
    console.error('[Stripe Confirm PM]', err.message);
    res.status(400).json({ message: err.message });
  }
});

// Remove a payment method
router.delete('/payment-methods/:id', auth, async (req, res) => {
  try {
    const stripe = getStripe();
    const method = await PaymentMethod.findOne({ _id: req.params.id, userId: req.user._id });
    if (!method) return res.status(404).json({ message: 'Payment method not found' });

    // Detach from Stripe
    if (method.stripePaymentMethodId) {
      await stripe.paymentMethods.detach(method.stripePaymentMethodId).catch(() => {});
    }

    // If this was default, set another as default
    if (method.isDefault) {
      const next = await PaymentMethod.findOne({ userId: req.user._id, _id: { $ne: req.params.id } });
      if (next) {
        next.isDefault = true;
        await next.save();
        // Update Stripe customer default
        const user = await User.findById(req.user._id);
        if (user.stripeCustomerId && next.stripePaymentMethodId) {
          await stripe.customers.update(user.stripeCustomerId, {
            invoice_settings: { default_payment_method: next.stripePaymentMethodId }
          }).catch(() => {});
        }
      }
    }

    await method.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Set default payment method
router.patch('/payment-methods/:id/set-default', auth, async (req, res) => {
  try {
    const stripe = getStripe();
    const method = await PaymentMethod.findOne({ _id: req.params.id, userId: req.user._id });
    if (!method) return res.status(404).json({ message: 'Payment method not found' });

    await PaymentMethod.updateMany({ userId: req.user._id }, { isDefault: false });
    method.isDefault = true;
    await method.save();

    // Update Stripe customer default
    const user = await User.findById(req.user._id);
    if (user.stripeCustomerId && method.stripePaymentMethodId) {
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: { default_payment_method: method.stripePaymentMethodId }
      }).catch(() => {});
    }

    res.json(method);
  } catch (err) {
    res.status(500).json({ message: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// CHARGES — charge the default payment method
// ══════════════════════════════════════════════════════════════════════════════
router.post('/charge', auth, async (req, res) => {
  try {
    const stripe = getStripe();
    const { amount, currency = 'usd', description, platform, campaignId } = req.body;

    if (!amount || amount <= 0)
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    if (amount < 0.50)
      return res.status(400).json({ message: 'Minimum charge is $0.50' });

    const user = await User.findById(req.user._id);
    const defaultMethod = await PaymentMethod.findOne({ userId: req.user._id, isDefault: true });

    if (!defaultMethod) {
      await createNotification(req.user._id, {
        type: 'error', category: 'budget',
        title: '❌ No Payment Method',
        message: 'Add a payment method in Ad Spend → Payment Methods before launching campaigns.',
        link: '/ad-spend'
      });
      return res.status(400).json({ message: 'No payment method found. Please add one first.' });
    }

    // Check expiry
    const now = new Date();
    if (defaultMethod.expYear < now.getFullYear() ||
       (defaultMethod.expYear === now.getFullYear() && defaultMethod.expMonth < now.getMonth() + 1)) {
      defaultMethod.status = 'expired';
      await defaultMethod.save();
      await createNotification(req.user._id, {
        type: 'error', category: 'budget',
        title: '❌ Payment Card Expired',
        message: `Your ${defaultMethod.brand} card ending in ${defaultMethod.last4} has expired. Update it in Ad Spend.`,
        link: '/ad-spend'
      });
      return res.status(400).json({ message: `Your ${defaultMethod.brand} card ending in ${defaultMethod.last4} has expired.` });
    }

    const customerId = await getOrCreateCustomer(user);

    // Create PaymentIntent and confirm immediately
    const paymentIntent = await stripe.paymentIntents.create({
      amount:               Math.round(amount * 100), // Stripe uses cents
      currency:             currency.toLowerCase(),
      customer:             customerId,
      payment_method:       defaultMethod.stripePaymentMethodId,
      confirm:              true,
      off_session:          true,
      description:          description || `AdsPulse ad spend — ${platform || 'campaign'}`,
      metadata: {
        userId:     req.user._id.toString(),
        platform:   platform || '',
        campaignId: campaignId || ''
      }
    });

    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Payment failed with status: ${paymentIntent.status}`);
    }

    // Create invoice record
    const invoice = await Invoice.create({
      userId:        req.user._id,
      platform:      platform || 'general',
      amount:        parseFloat(amount.toFixed(2)),
      currency:      currency.toUpperCase(),
      status:        'paid',
      paidAt:        new Date(),
      paymentMethod: `${defaultMethod.brand} ****${defaultMethod.last4}`,
      stripePaymentIntentId: paymentIntent.id,
      period:        { start: new Date(Date.now() - 30*86400000), end: new Date() },
      lines: [{
        description: description || `Ad spend — ${platform}`,
        platform,
        campaignId,
        amount: parseFloat(amount.toFixed(2)),
        currency: currency.toUpperCase()
      }]
    });

    await createNotification(req.user._id, {
      type: 'success', category: 'budget',
      title: '✅ Payment Successful',
      message: `$${amount.toFixed(2)} charged to ${defaultMethod.brand} ****${defaultMethod.last4}.`,
      link: '/ad-spend'
    });

    console.log(`[Stripe] ✅ Charge $${amount} for user ${user.email} — PI: ${paymentIntent.id}`);
    res.json({ success: true, paymentIntentId: paymentIntent.id, invoice });

  } catch (err) {
    console.error('[Stripe Charge]', err.type, err.message);

    // Handle specific Stripe errors
    let userMessage = err.message;
    let notifTitle  = '❌ Payment Failed';

    if (err.code === 'insufficient_funds') {
      userMessage = `Insufficient funds on your ${err.payment_method?.card?.brand || 'card'} ending in ${err.payment_method?.card?.last4 || '****'}.`;
      notifTitle  = '❌ Insufficient Funds';
    } else if (err.code === 'card_declined') {
      userMessage = 'Your card was declined. Please try a different payment method.';
    } else if (err.code === 'expired_card') {
      userMessage = 'Your card has expired. Please update your payment method.';
    } else if (err.code === 'incorrect_cvc') {
      userMessage = 'Incorrect card security code (CVC).';
    } else if (err.code === 'authentication_required') {
      userMessage = 'Your card requires authentication. Please update your payment method.';
    }

    const defaultMethod = await PaymentMethod.findOne({ userId: req.user._id, isDefault: true }).catch(() => null);
    await createNotification(req.user._id, {
      type: 'error', category: 'budget',
      title: notifTitle,
      message: `${userMessage} ${defaultMethod ? `Card: ${defaultMethod.brand} ****${defaultMethod.last4}.` : ''} Please check your payment method in Ad Spend.`,
      link: '/ad-spend'
    });

    res.status(402).json({ message: userMessage, code: err.code });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET all saved payment methods from Stripe (synced with DB)
// ══════════════════════════════════════════════════════════════════════════════
router.get('/payment-methods', auth, async (req, res) => {
  try {
    const methods = await PaymentMethod.find({ userId: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
    res.json(methods);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// INVOICES
// ══════════════════════════════════════════════════════════════════════════════
router.get('/invoices', auth, async (req, res) => {
  try {
    const invoices = await Invoice.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100);
    const totalPaid = invoices.reduce((s, i) => s + (i.status === 'paid' ? i.amount : 0), 0);
    res.json({ invoices, totalPaid });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// STRIPE WEBHOOK — handle async events from Stripe
// ══════════════════════════════════════════════════════════════════════════════
router.post('/webhook',
  express.raw({ type: 'application/json' }),   // MUST use raw body for webhook verification
  async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not set — skipping signature verification');
      return res.json({ received: true });
    }

    let event;
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'],
        webhookSecret
      );
    } catch (err) {
      console.error('[Stripe Webhook] Signature verification failed:', err.message);
      return res.status(400).json({ message: `Webhook error: ${err.message}` });
    }

    console.log(`[Stripe Webhook] Event: ${event.type}`);

    try {
      switch (event.type) {

        case 'payment_intent.payment_failed': {
          const pi = event.data.object;
          const userId = pi.metadata?.userId;
          if (userId) {
            const failureMsg = pi.last_payment_error?.message || 'Payment failed';
            await createNotification(userId, {
              type: 'error', category: 'budget',
              title: '❌ Payment Failed',
              message: `A payment of $${(pi.amount/100).toFixed(2)} failed: ${failureMsg}. Please check your payment method.`,
              link: '/ad-spend'
            });
            // Update invoice if exists
            await Invoice.findOneAndUpdate(
              { stripePaymentIntentId: pi.id },
              { status: 'failed' }
            ).catch(() => {});
          }
          break;
        }

        case 'payment_intent.succeeded': {
          const pi = event.data.object;
          console.log(`[Stripe Webhook] Payment succeeded: ${pi.id} — $${(pi.amount/100).toFixed(2)}`);
          break;
        }

        case 'payment_method.automatically_updated': {
          // Card was automatically updated (e.g. card renewed)
          const pm = event.data.object;
          await PaymentMethod.findOneAndUpdate(
            { stripePaymentMethodId: pm.id },
            {
              expMonth: pm.card?.exp_month,
              expYear:  pm.card?.exp_year,
              status:   'active'
            }
          ).catch(() => {});
          console.log(`[Stripe Webhook] Card auto-updated: ${pm.id}`);
          break;
        }

        case 'customer.deleted': {
          const customer = event.data.object;
          await User.findOneAndUpdate(
            { stripeCustomerId: customer.id },
            { $unset: { stripeCustomerId: 1 } }
          ).catch(() => {});
          break;
        }

        default:
          console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      console.error('[Stripe Webhook] Handler error:', err.message);
    }

    res.json({ received: true });
  }
);

module.exports = router;
