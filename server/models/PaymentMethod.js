const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:        { type: String, enum: ['card', 'bank', 'paypal'], default: 'card' },
  isDefault:   { type: Boolean, default: false },
  // Card details (never store full card number — store last4 + brand only)
  brand:       String,   // visa, mastercard, amex
  last4:       String,
  expMonth:    Number,
  expYear:     Number,
  holderName:  String,
  // PayPal
  paypalEmail: String,
  // Bank
  bankName:    String,
  accountLast4:String,
  // Stripe payment method ID for real charging
  stripePaymentMethodId: String,
  // Status
  status:      { type: String, enum: ['active', 'expired', 'failed'], default: 'active' },
  nickname:    String,  // e.g. "Company Visa"
}, { timestamps: true });

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
