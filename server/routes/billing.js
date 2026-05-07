const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// In production: const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// For demo we simulate the Stripe responses

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    interval: 'month',
    features: ['Up to 5 campaigns', '3 platforms', 'Basic analytics', 'Email support'],
    stripePriceId: 'price_starter_monthly',
    color: '#3b82f6'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 149,
    interval: 'month',
    features: ['Unlimited campaigns', 'All 7 platforms', 'Advanced analytics', 'Priority support', 'Comparative reports', 'Team members (3)'],
    stripePriceId: 'price_pro_monthly',
    color: '#7c3aed',
    popular: true
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 399,
    interval: 'month',
    features: ['Unlimited campaigns', 'All 7 platforms', 'White-label reports', 'Dedicated support', 'API access', 'Unlimited team members', 'Custom integrations'],
    stripePriceId: 'price_agency_monthly',
    color: '#ec4899'
  }
];

// Get plans
router.get('/plans', (req, res) => {
  res.json(PLANS);
});

// Get billing status for current user
router.get('/status', auth, async (req, res) => {
  // In production: fetch from Stripe using req.user.stripeCustomerId
  res.json({
    plan: 'pro',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 18 * 86400000).toISOString(),
    cancelAtPeriodEnd: false,
    paymentMethod: { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2027 },
    invoices: [
      { id: 'inv_001', amount: 149, status: 'paid', date: new Date(Date.now() - 30 * 86400000).toISOString(), pdf: '#' },
      { id: 'inv_002', amount: 149, status: 'paid', date: new Date(Date.now() - 60 * 86400000).toISOString(), pdf: '#' },
      { id: 'inv_003', amount: 149, status: 'paid', date: new Date(Date.now() - 90 * 86400000).toISOString(), pdf: '#' },
    ]
  });
});

// Create checkout session
router.post('/create-checkout-session', auth, async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return res.status(400).json({ message: 'Invalid plan' });

    // In production:
    // const session = await stripe.checkout.sessions.create({
    //   customer_email: req.user.email,
    //   payment_method_types: ['card'],
    //   line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    //   mode: 'subscription',
    //   success_url: `${process.env.CLIENT_URL}/billing?success=true`,
    //   cancel_url: `${process.env.CLIENT_URL}/billing?canceled=true`,
    // });
    // res.json({ url: session.url });

    // Demo: simulate redirect URL
    res.json({
      url: null,
      demo: true,
      message: `Demo mode: Would redirect to Stripe checkout for ${plan.name} plan ($${plan.price}/mo). Add STRIPE_SECRET_KEY to server/.env to enable real payments.`
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create billing portal session
router.post('/portal', auth, async (req, res) => {
  // In production:
  // const session = await stripe.billingPortal.sessions.create({
  //   customer: req.user.stripeCustomerId,
  //   return_url: `${process.env.CLIENT_URL}/billing`,
  // });
  // res.json({ url: session.url });

  res.json({
    url: null,
    demo: true,
    message: 'Demo mode: Would open Stripe billing portal. Add STRIPE_SECRET_KEY to enable.'
  });
});

// Stripe webhook (production)
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  // In production verify with: stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  res.json({ received: true });
});

module.exports = router;
