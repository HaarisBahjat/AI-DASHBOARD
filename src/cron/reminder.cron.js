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
            status: 'UNPAID'
        });
        for(const due of upcomingDues){
            await require('../Service/reminder.service').createReminder({
                userId: due.userId,
                dueId: due,
                reminderType: 'UPCOMING_DUE',
                messageText: `Reminder: Your due "${due.title}" of amount $${due.amount} is coming up on ${due.dueDate.toDateString()}. Please ensure timely payment.`,
                triggerSource: 'CRON_JOB',
                metadata: {}
            });
        }

        //Due today
        const dueTodayDues = await Due.find({
            dueDate: { $gte: todayStart, $lte: todayEnd },
            status: 'UNPAID'
        });
        for(const due of dueTodayDues){
            await require('../Service/reminder.service').createReminder({
                userId: due.userId,
                dueId: due,
                reminderType: 'DUE_TODAY',
                messageText: `Alert: Your due "${due.title}" of amount $${due.amount} is due today (${due.dueDate.toDateString()}). Please make the payment to avoid penalties.`,
                triggerSource: 'CRON_JOB',
                metadata: {}
            });
        }

        //Overdue dues
        const overdueDues = await Due.find({
            dueDate: { $lt: todayStart },
            status: 'UNPAID'
        });
        for(const due of overdueDues){
            await require('../Service/reminder.service').createReminder({
                userId: due.userId,
                dueId: due,
                reminderType: 'OVERDUE',
                messageText: `Urgent: Your due "${due.title}" of amount $${due.amount} was due on ${due.dueDate.toDateString()} and is now overdue. Please address this immediately to avoid further consequences.`,
                triggerSource: 'CRON_JOB',
                metadata: {}
            });
        }
    }
    catch(error){
        console.error('Error in Reminder Cron Job:', error.message);
    }
}, {
    scheduled: true,
    timezone: "UTC"
});
module.exports = reminderCron;
