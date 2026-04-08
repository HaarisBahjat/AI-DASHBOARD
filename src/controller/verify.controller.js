//To verify the payment 
const {verifyPayment} = require('../Service/payment.service');
const due= require("../models/db").Dues;

exports.verifyPayment=async (req,res)=>{
    try{
        const {paymentId,orderId,signature,dueId}=req.body;
        