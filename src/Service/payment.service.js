//Payment integrartion with Razorpay
const Razorpay = require('razorpay');

// Validate required environment variables before initializing the SDK.
// This prevents the application from throwing an opaque error during module
// load and provides a clear message to the developer about what's missing.
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Missing Razorpay credentials: please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env');
}

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder=async (amount,currency='INR',receipt)=>{
    try {
        const order = await razorpay.orders.create({
            amount: amount * 100, // Razorpay expects amount in paise
            currency: currency,
            receipt: receipt
        });
        return order;
    } catch (error) {
        // Surface the original error for easier debugging in dev
        throw new Error('Error creating order: ' + (error && error.message ? error.message : String(error)));
    }
};