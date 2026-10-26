const express = require('express');
const { isAuth } = require('../middleware/auth');
const { createOrder, verifyPayment } = require('../controllers/paymentController');

const router = express.Router();

router.post('/order', isAuth, createOrder);
router.post('/verify', isAuth, verifyPayment);

module.exports = router;
