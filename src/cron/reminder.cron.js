const cron = require('node-cron');
const Due = require('../models/db').Dues;
// Schedule a cron job to send reminders for dues due in 3 days
const reminderCron = cron.schedule('* * * * *', async () => {
    try{
        console.log('Reminder Cron Job Started');
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const todayEnd = new Date(now.setHours(23, 59, 59, 999));

      //upcoming date after 2 days
        const upcomingLimit = new Date(todayStart);
        upcomingLimit.setDate(todayStart.getDate() + 2);
        console.log('Fetching dues due between', todayStart, 'and', upcomingLimit);

        const upcomingDues = await Due.find({
            dueDate: { $gte: todayStart, $lte: upcomingLimit },
            status: { $in: ['UNPAID', 'OVERDUE'] }
        });
        console.log('Found upcomingDues:', upcomingDues.length);
        for(const due of upcomingDues){
            try {
                await require('../Service/reminder.service').createReminder({
                    userId: due.userId,
                    dueId: due._id,
                    due: due,
                    reminderType: 'UPCOMING_DUE',
                    messageText: `Reminder: Your due "${due.title}" of amount $${due.amount} is coming up on ${due.dueDate.toDateString()}. Please ensure timely payment.`,
                    triggerSource: 'CRON_JOB',
                    metadata: {}
                });
                console.log('UPCOMING_DUE reminder created for due:', due._id);
            } catch(err) {
                console.error('Error creating UPCOMING_DUE reminder:', err.message);
            }
        }

        //Due today
        const dueTodayDues = await Due.find({
            dueDate: { $gte: todayStart, $lte: todayEnd },
            status: { $in: ['UNPAID', 'OVERDUE'] }
        });
        console.log('Found dueTodayDues:', dueTodayDues.length);
        for(const due of dueTodayDues){
            try {
                await require('../Service/reminder.service').createReminder({
                    userId: due.userId,
                    dueId: due._id,
                    due: due,
                    reminderType: 'DUE_TODAY',
                    messageText: `Alert: Your due "${due.title}" of amount $${due.amount} is due today (${due.dueDate.toDateString()}). Please make the payment to avoid penalties.`,
                    triggerSource: 'CRON_JOB',
                    metadata: {}
                });
                console.log('DUE_TODAY reminder created for due:', due._id);
            } catch(err) {
                console.error('Error creating DUE_TODAY reminder:', err.message);
            }
        }

        //Overdue dues
        const overdueDues = await Due.find({
            dueDate: { $lt: todayStart },
            status: { $in: ['UNPAID', 'OVERDUE'] }
        });
        console.log('Found overdueDues:', overdueDues.length);
        for(const due of overdueDues){
            try {
                await require('../Service/reminder.service').createReminder({
                    userId: due.userId,
                    due: due,
                    dueId: due._id,
                    reminderType: 'OVERDUE',
                    messageText: `Urgent: Your due "${due.title}" of amount $${due.amount} was due on ${due.dueDate.toDateString()} and is now overdue. Please address this immediately to avoid further consequences.`,
                    triggerSource: 'CRON_JOB',
                    metadata: {}
                });
                console.log('OVERDUE reminder created for due:', due._id);
            } catch(err) {
                console.error('Error creating OVERDUE reminder:', err.message);
            }
        }
    }
    catch(error){
        console.error('Error in Reminder Cron Job:', error.message);
        console.error('Stack:', error.stack);
    }
}, {
    scheduled: true,
    timezone: "UTC"
});
module.exports = reminderCron;
