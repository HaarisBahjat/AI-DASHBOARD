const cron = require('node-cron');
const Due= require('../models/db').Dues;

// Schedule a cron job to run every day at midnight
const overdueCron= cron.schedule('0 0 * * *', async () => {
    try {
        const now = new Date();
        const result = await Due.updateMany(
            { status: "UNPAID", dueDate: { $lt: now } },
            { $set: { status: "OVERDUE" } }
        );
        console.log(`Overdue Cron Job: Updated ${result.modifiedCount} dues to OVERDUE status.`);
    } catch (error) {
        console.error('Error running overdue cron job:', error);
    }
}, {
    scheduled: true,
    timezone: "UTC"
});

module.exports = overdueCron;
