const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:     { type: String, enum: ['momo', 'orange_money', 'wave', 'card'], required: true },
  isDefault:{ type: Boolean, default: false },
  nickname: String,   // e.g. "My MTN", "Work Card"

  // Mobile Money fields (MTN, Orange, Wave)
  phoneNumber: String,  // full number e.g. +237612345678
  accountName: String,  // account holder name from telco

  // Card fields
  cardLast4:   String,
  cardBrand:   String,  // visa, mastercard, etc.
  cardExpMonth:Number,
  cardExpYear: Number,
  cardHolder:  String,

  status: { type: String, enum: ['active','expired','invalid'], default: 'active' },
}, { timestamps: true });

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
