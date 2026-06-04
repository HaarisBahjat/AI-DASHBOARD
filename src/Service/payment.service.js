//Payment integrartion with Razorpay
const Razorpay = require('razorpay');

const razorpay=new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
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
        throw new Error('Error creating order');
    }
};
exports