const express = require('express');
const router = express.Router();
const authMiddleware = require('../midddlewares/auth');
const paymentController = require('../controller/payment.controller');

// Create an order (protected) — frontend calls this to get orderId + keyId
router.post('/create', authMiddleware, paymentController.createPaymentOrder);

// Verify a payment after Checkout (protected)
router.post('/verify', authMiddleware, paymentController.verifyPayment);

// Webhook endpoint (Razorpay will POST here). We use express.raw on this route
// so the handler can validate the raw request body signature exactly as Razorpay expects.
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  // Attach the rawBody so controller can use it (some frameworks replace req.body)
  req.rawBody = req.body && Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;
  paymentController.webhookHandler(req, res, next);
});

module.exports = router;
