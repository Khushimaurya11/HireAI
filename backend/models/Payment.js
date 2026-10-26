const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: String, enum: ['Starter', 'Pro'], required: true },
    credits: { type: Number, required: true },
    amountInPaise: { type: Number, required: true },
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    status: { type: String, enum: ['Created', 'Paid', 'Failed'], default: 'Created' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
