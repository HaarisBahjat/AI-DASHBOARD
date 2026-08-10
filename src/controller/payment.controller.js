const crypto = require('crypto');
const { createOrder } = require('../Service/payment.service');
const { Dues, Payment, Conversation, ConversationSession } = require("../models/db");
const { emitToUser } = require('../Sockets/socketState');

/**
 * Create a Razorpay order for a given due.
 * Expects: { dueId } in body.
 * Returns the Razorpay order details the frontend needs to open Checkout.
 */
exports.createPaymentOrder = async (req, res) => {
    try {
        const { dueId } = req.body;
        if (!dueId) {
            return res.status(400).json({ message: 'dueId is required' });
        }

        // [SECURITY] Enforce ownership — only the due's owner can create a payment order
        const due = await Dues.findOne({ _id: dueId, userId: req.user._id });
        if (!due) {
            return res.status(404).json({ message: 'Due not found' });
        }

        // [SECURITY] Sanity check: reject unreasonably large amounts before sending to Razorpay
        const MAX_AMOUNT = parseInt(process.env.MAX_PAYMENT_AMOUNT || '10000000', 10); // ₹1 crore
        if (due.amount <= 0 || due.amount > MAX_AMOUNT) {
            return res.status(400).json({ message: `Amount must be between ₹1 and ₹${MAX_AMOUNT}` });
        }

        // Create Razorpay order using the service helper. The service expects amount in rupees.
        const order = await createOrder(due.amount, 'INR', `receipt_${dueId}`);

        return res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID, // public key for client-side checkout
            dueId: due._id,
        });
    } catch (error) {
        console.error('createPaymentOrder error:', error);
        return res.status(500).json({ message: 'Error creating payment order' });
    }
};


/**
 * Verify payment signature returned by Razorpay Checkout (client-side).
 * Expects: { razorpay_order_id, razorpay_payment_id, razorpay_signature, dueId }
 * Steps:
 *  - Recompute HMAC SHA256(order_id|payment_id) using server-side secret
 *  - If signature matches, persist Payment and mark Due as PAID
 *  - Emit a socket event so UI updates in real-time
 */
exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, dueId } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !dueId) {
            return res.status(400).json({ message: 'Missing required payment verification fields' });
        }

        // Recompute expected signature using the server-side secret
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        // Debug logging to help diagnose verification failures. Controlled by DEBUG_PAYMENTS env var.
        if (process.env.DEBUG_PAYMENTS === 'true') {
            console.log('Payment verification debug:');
            console.log('  razorpay_order_id:', razorpay_order_id);
            console.log('  razorpay_payment_id:', razorpay_payment_id);
            console.log('  received_signature:', razorpay_signature);
            console.log('  generated_signature:', generatedSignature);
        }

        if (generatedSignature !== razorpay_signature) {
            // Invalid signature -> possible tampering
            console.warn('Payment signature mismatch for order', razorpay_order_id);
            return res.status(400).json({ message: 'Invalid signature' });
        }

        // Idempotency: check if we've already recorded this payment
        let existing = await Payment.findOne({ paymentId: razorpay_payment_id });
        if (existing && existing.status === 'CAPTURED') {
            return res.json({ message: 'Payment already recorded', payment: existing });
        }

        // Fetch the Due record so we can include its amount in the payment record
        // and validate the due exists before proceeding.
        const due = await Dues.findById(dueId);
        if (!due) {
            return res.status(404).json({ message: 'Due not found' });
        }

        // Create Payment record for audit and idempotency. Include the due amount
        // when available to make reconciliation easier.
        const paymentRecord = await Payment.create({
            userId: req.user._id,
            dueId,
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
            amount: due.amount || null,
            currency: 'INR',
            status: 'CAPTURED',
        });

        // Mark the due as paid in a single atomic operation
        await Dues.findOneAndUpdate(
            { _id: dueId },
            { status: 'PAID', snoozeDate: null },
            { new: true }
        );

        // Add a conversation system message for audit/history (optional).
        // Only create a message if we can find an active ConversationSession for the due.
        try {
            const session = await ConversationSession.findOne({ dueId }).sort({ updatedAt: -1 });
            if (session) {
                await Conversation.create({
                    conversationId: session._id,
                    roles: 'SYSTEM',
                    message: `Payment received: ₹${(paymentRecord.amount || due.amount) || ''} (order ${razorpay_order_id})`,
                });
            }
        } catch (convErr) {
            // conversation creation is best-effort — don't fail the payment flow for this
            console.warn('Failed to create conversation system message:', convErr.message);
        }

        // Notify the user via sockets so UI updates immediately
        try {
            emitToUser(req.user._id, 'payment-success', {
                dueId,
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id,
            });
        } catch (emitErr) {
            console.warn('Failed to emit payment-success socket event:', emitErr.message);
        }

        return res.json({ message: 'Payment verified and due marked PAID', payment: paymentRecord, due });
    } catch (error) {
        console.error('verifyPayment error:', error);
        return res.status(500).json({ message: 'Verification failed', error: error.message });
    }
};


/**
 * Webhook endpoint to receive asynchronous Razorpay events.
 * Note: we add a raw body parser on the route so we can validate the signature
 * using the raw payload as required by Razorpay.
 */
exports.webhookHandler = async (req, res) => {
    try {
        // Raw body is available as req.body when express.raw middleware is used on the route
        const rawBody = req.rawBody || req.body;
        const signature = req.headers['x-razorpay-signature'];

        if (!signature) return res.status(400).send('Missing signature');

        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
        const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

        if (expected !== signature) {
            return res.status(400).send('Invalid webhook signature');
        }

        const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
        const event = payload.event;

        // Handle relevant events — e.g., payment.captured, payment.failed
        if (event === 'payment.captured') {
            const entity = payload.payload?.payment?.entity;
            const orderId = entity?.order_id;
            const paymentId = entity?.id;
            const amount = entity?.amount; // amount in paise

            // Find existing payment record or create one
            let payment = await Payment.findOne({ paymentId });
            if (!payment) {
                payment = await Payment.create({
                    userId: null,
                    dueId: null,
                    orderId,
                    paymentId,
                    signature: signature,
                    status: 'CAPTURED',
                    rawEvent: payload,
                });
            } else {
                payment.status = 'CAPTURED';
                payment.rawEvent = payload;
                await payment.save();
            }

            // Reconciliation: if we can find a Due by mapping orderId -> Payment -> Due, mark it paid
            if (payment.dueId) {
                await Dues.findOneAndUpdate({ _id: payment.dueId }, { status: 'PAID', snoozeDate: null });
            }
        }

        // Respond 200 to acknowledge receipt
        return res.status(200).send('ok');
    } catch (error) {
        console.error('webhookHandler error:', error);
        return res.status(500).send('error');
    }
};