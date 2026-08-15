const { Dues, Customer } = require('../models/db');
const llmService = require('../Service/llm.service');

// Create a new due
exports.createDue = async (req, res) => {
    try {
        const { amount, title, dueDate, customerId, customerName, invoiceNo } = req.body;

        // ─ Input validation ────────────────────────────────────────────
        if (!amount || !title || !dueDate) {
            return res.status(400).json({ message: 'Amount, title and due date are required' });
        }

        // [SECURITY] Amount bounds — prevents Razorpay paise overflow & analytics corruption
        const MAX_AMOUNT = parseInt(process.env.MAX_PAYMENT_AMOUNT || '10000000', 10);
        const parsedAmount = Number(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > MAX_AMOUNT) {
            return res.status(400).json({ message: `Amount must be between 1 and ${MAX_AMOUNT}` });
        }

        // [SECURITY] Field length limits — prevents storage abuse
        if (typeof title !== 'string' || title.trim().length === 0 || title.trim().length > 200) {
            return res.status(400).json({ message: 'Title must be between 1 and 200 characters' });
        }
        if (invoiceNo && String(invoiceNo).length > 50) {
            return res.status(400).json({ message: 'Invoice number must be 50 characters or less' });
        }

        const parsedDate = new Date(dueDate);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ message: 'Invalid due date format' });
        }

        let resolvedCustomerId = customerId || null;
        if (!resolvedCustomerId && customerName && typeof customerName === 'string' && customerName.trim()) {
            const safeName = customerName.trim();
            let cust = await Customer.findOne({
                userId: req.user._id,
                name: { $regex: safeName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), $options: 'i' }
            });
            if (!cust) {
                cust = await Customer.create({ userId: req.user._id, name: safeName, status: 'Active' });
            }
            resolvedCustomerId = cust._id;
        }

        const NewDue = await Dues.create({
            userId: req.user._id,
            amount: parsedAmount,
            title: title.trim(),
            dueDate: parsedDate,
            customerId: resolvedCustomerId,
            invoiceNo: invoiceNo ? String(invoiceNo).trim() : null,
            metadata: {
                originalAmount: parsedAmount,
                totalPaid: 0,
                payments: [],
            }
        });

        const populatedDue = await Dues.findById(NewDue._id)
            .populate('customerId', 'name contactNo email place status')
            .lean();

        res.status(201).json({ message: 'Due created successfully', due: populatedDue || NewDue });
    } catch (error) {
        console.error('createDue Error:', error.message);
        res.status(500).json({ message: 'Error creating due' });
    }
};

// Get all dues for a user
exports.getDuesByUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const dues = await Dues.find({ userId })
            .populate('customerId', 'name contactNo email place status')
            .sort({ createdAt: -1 })
            .lean();
        res.status(200).json({ dues });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dues', error: error.message });
    }
};

// Update due status (PAID)
exports.updatedueStatus = async (req,res) =>{
    try{
        const freshDue = await Dues.findOne({ _id: req.params.dueId, userId: req.user._id }).lean();
        if (!freshDue) {
            return res.status(404).json({ message: 'Due not found' });
        }

        const currentAmount = Number(freshDue.amount || 0);
        const originalAmount = Number(freshDue.metadata?.originalAmount || currentAmount);
        const prevPaid = Number(freshDue.metadata?.totalPaid || 0);

        const due = await Dues.findOneAndUpdate(
            { _id: req.params.dueId, userId: req.user._id },
            {
                amount: 0,
                status: "PAID",
                snoozeDate: null,
                'metadata.originalAmount': originalAmount,
                'metadata.totalPaid': Math.round((prevPaid + currentAmount) * 100) / 100,
                'metadata.lastPaymentDate': new Date(),
                $push: { 'metadata.payments': { amount: currentAmount, date: new Date(), status: 'COMPLETED' } }
            },
            { new: true }
        ).populate('customerId', 'name contactNo email place status').lean();

        if (!due) {
            return res.status(404).json({ message: 'Due not found' });
        }

        res.status(200).json({ message: 'Due Marked as PAID', due });
    } catch (error) {
        res.status(500).json({ message: 'Error updating due status', error: error.message });
    }
};

// Snooze a due and push reminders/status checks to a future date
exports.snoozeDue = async (req, res) => {
    try {
        // [SECURITY] Cap snooze to prevent permanent silence (same cap as WhatsApp bot)
        const MAX_SNOOZE_DAYS = parseInt(process.env.MAX_SNOOZE_DAYS || '30', 10);
        const maxAllowedDate = new Date(Date.now() + MAX_SNOOZE_DAYS * 24 * 60 * 60 * 1000);

        const rawSnoozeDate = req.body?.snoozeDate;
        const snoozeDate = rawSnoozeDate ? new Date(rawSnoozeDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        if (Number.isNaN(snoozeDate.getTime())) {
            return res.status(400).json({ message: 'Invalid snooze date' });
        }

        // Reject dates in the past
        if (snoozeDate <= new Date()) {
            return res.status(400).json({ message: 'Snooze date must be in the future' });
        }

        // Enforce the maximum snooze cap
        if (snoozeDate > maxAllowedDate) {
            return res.status(400).json({
                message: `Snooze date cannot exceed ${MAX_SNOOZE_DAYS} days from today`
            });
        }

        const due = await Dues.findOneAndUpdate(
            { _id: req.params.dueId, userId: req.user._id },
            { status: 'UNPAID', snoozeDate },
            { new: true }
        );

        if (!due) {
            return res.status(404).json({ message: 'Due not found' });
        }

        res.status(200).json({ message: 'Due snoozed successfully', due });
    } catch (error) {
        res.status(500).json({ message: 'Error snoozing due' });
    }
};

// Admin: Get all dues
exports.getAllDues = async (req, res) => {
    try {
        const dues = await Dues.find().populate('userId', 'email name role');
        res.status(200).json({ dues });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching all dues', error: error.message });
    }
};

// Scan receipt or bill image using Gemini Vision OCR
exports.scanReceipt = async (req, res) => {
    try {
        const { imageBase64, mimeType } = req.body;
        if (!imageBase64) {
            return res.status(400).json({ message: 'Image base64 data is required' });
        }
        const extractedData = await llmService.scanReceiptImage(imageBase64, mimeType || 'image/png');
        res.status(200).json({ message: 'Receipt scanned successfully', data: extractedData });
    } catch (error) {
        console.error('scanReceipt error:', error.message);
        res.status(500).json({ message: 'Error scanning receipt', error: error.message });
    }
};