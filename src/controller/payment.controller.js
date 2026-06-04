const { createOrder } = require('../Service/payment.service');
const { Dues } = require("../models/db");

exports.createPaymentOrder = async (req, res) => {
    try {
        const { dueId } = req.body;
        const due = await Dues.findById(dueId);
        if (!due) {
            return res.status(404).json({ message: 'Due not found' });
        }

        // Create Razorpay order (amount passed in rupees)
        const order = await createOrder(due.amount, 'INR', `receipt_${dueId}`);

        return res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            dueId: due._id,
        });
    } catch (error) {
        console.error('createPaymentOrder error:', error);
        return res.status(500).json({ message: 'Error creating payment order', error: error.message });
    }
};