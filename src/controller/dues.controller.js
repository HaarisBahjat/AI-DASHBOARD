const { Dues } = require('../models/db');

// Create a new due
exports.createDue = async (req, res) => {
    try {
        console.log('createDue - req.user:', req.user);
        console.log('createDue - req.user._id:', req.user?._id);
        
        const { amount, title, dueDate } = req.body;
        console.log('Request Body:', { amount, title, dueDate });
        
        if (!amount || !title || !dueDate) {
            return res.status(400).json({ message: 'Amount, title and due date are required' });
        }
        const NewDue = await Dues.create({
            userId: req.user._id,
            amount,
            title,
            dueDate
        });
        res.status(201).json({ message: 'Due created successfully', due: NewDue });
    } catch (error) {
        console.log('createDue Error:', error.message);
        res.status(500).json({ message: 'Error creating due', error: error.message });
    }
};

// Get all dues for a user
exports.getDuesByUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const dues = await Dues.find({ userId });
        res.status(200).json({ dues });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dues', error: error.message });
    }
};

// Update due status (PAID)
exports.updatedueStatus = async (req,res) =>{
    try{
        const due = await Dues.findOneAndUpdate(
            { _id: req.params.dueId, userId: req.user._id },
            { status: "PAID", snoozeDate: null },
            { new: true }
        );

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
        const rawSnoozeDate = req.body?.snoozeDate;
        const snoozeDate = rawSnoozeDate ? new Date(rawSnoozeDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        if (Number.isNaN(snoozeDate.getTime())) {
            return res.status(400).json({ message: 'Invalid snooze date' });
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
        res.status(500).json({ message: 'Error snoozing due', error: error.message });
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