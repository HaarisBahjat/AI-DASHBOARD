const {createOrder} = require('../Service/payment.service');
const due= require("../models/db").Dues;

exports.createPaymentOrder=async (req,res)=>{
    try{
        const {dueId}=req.body;
        const due= await due.findById(dueId);
        if(!due){
            return res.status(404).json({message:"Due not found"});
        }
        const order=await createOrder({amount: due.amount, receipt: `receipt_${dueId}`});

         res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      dueId: due._id
    });
    } catch (error) {
        return res.status(500).json({message:"Error creating payment order"});

    }
}