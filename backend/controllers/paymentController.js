const crypto = require('crypto');
const Razorpay = require('razorpay');
const Payment = require('../models/Payment');

const PLANS = {
  Starter: { credits: 150, amountInPaise: 100 * 100 },
  Pro: { credits: 650, amountInPaise: 500 * 100 },
};

function getRazorpayInstance() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys are not configured');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

/**
 * POST /api/payment/order
 * body: { plan: 'Starter' | 'Pro' }
 */
async function createOrder(req, res) {
  try {
    const { plan } = req.body;
    const planDef = PLANS[plan];
    if (!planDef) return res.status(400).json({ error: 'plan must be Starter or Pro' });

    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: planDef.amountInPaise,
      currency: 'INR',
      receipt: `hireai_${req.user._id}_${Date.now()}`,
    });

    const payment = await Payment.create({
      userId: req.user._id,
      plan,
      credits: planDef.credits,
      amountInPaise: planDef.amountInPaise,
      razorpayOrderId: order.id,
      status: 'Created',
    });

    res.json({ order, paymentId: payment._id, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error('[payment] createOrder error:', err.message);
    res.status(500).json({ error: 'Failed to create payment order. Is RAZORPAY_KEY_ID/SECRET configured?' });
  }
}

/**
 * POST /api/payment/verify
 * body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
async function verifyPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing Razorpay verification fields' });
    }

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      await Payment.findOneAndUpdate({ razorpayOrderId: razorpay_order_id }, { status: 'Failed' });
      return res.status(400).json({ error: 'Payment signature verification failed' });
    }

    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { status: 'Paid', razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature },
      { new: true }
    );
    if (!payment) return res.status(404).json({ error: 'Payment record not found' });

    const user = req.user;
    user.addCredits(payment.credits);
    await user.save();

    res.json({ message: 'Payment verified', credits: user.credits });
  } catch (err) {
    console.error('[payment] verifyPayment error:', err.message);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
}

module.exports = { createOrder, verifyPayment };
