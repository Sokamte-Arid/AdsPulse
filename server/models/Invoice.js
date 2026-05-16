const mongoose = require('mongoose');

const invoiceLineSchema = new mongoose.Schema({
  description:  String,
  platform:     String,
  campaignId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
  campaignName: String,
  amount:       Number,
  currency:     { type: String, default: 'XAF' }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  invoiceNumber:  { type: String, unique: true },
  platform:       String,
  status:         { type: String, enum: ['pending','paid','failed','refunded'], default: 'pending' },
  amount:         { type: Number, required: true },
  currency:       { type: String, default: 'XAF' },
  lines:          [invoiceLineSchema],
  paymentMethod:  String,
  paidAt:         Date,
  period:         { start: Date, end: Date },
  // CinetPay
  cinetpayTransactionId: { type: String, index: true },
  notes:          String,
}, { timestamps: true });

invoiceSchema.pre('save', async function(next) {
  if (!this.invoiceNumber) {
    const count = await mongoose.model('Invoice').countDocuments();
    this.invoiceNumber = `INV-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
