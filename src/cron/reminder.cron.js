const cron = require('node-cron');
const Due = require('../models/db').Dues;
const CRON_TIMEZONE = process.env.CRON_TIMEZONE || 'UTC';
const REMINDER_CRON_EXPRESSION = process.env.REMINDER_CRON_EXPRESSION || '* * * * *';
// Schedule reminder checks (default every minute, configurable via env).
const cronExpression = REMINDER_CRON_EXPRESSION;
const reminderHandler = async () => {
    try{
        const activeStatusExpr = {
            $in: [
                { $toUpper: { $trim: { input: '$status' } } },
                ['UNPAID', 'OVERDUE']
            ]
        };

        const todayStartExpr = {
            $dateTrunc: {
                date: '$$NOW',
                unit: 'day',
                timezone: CRON_TIMEZONE,
            },
        };
        const tomorrowStartExpr = {
            $dateAdd: {
                startDate: todayStartExpr,
                unit: 'day',
                amount: 1,
            },
        };
        const upcomingEndExclusiveExpr = {
            $dateAdd: {
                startDate: todayStartExpr,
                unit: 'day',
                amount: 3,
            },
        };
        const dueDayExpr = {
            $dateTrunc: {
                date: '$dueDate',
                unit: 'day',
                timezone: CRON_TIMEZONE,
            },
        };
        const snoozeDayExpr = {
            $dateTrunc: {
                date: '$snoozeDate',
                unit: 'day',
                timezone: CRON_TIMEZONE,
            },
        };

        console.log(`Reminder Cron Job Started [${CRON_TIMEZONE}]`);

        const upcomingDues = await Due.find({
            // UPCOMING starts from tomorrow to avoid overlap with DUE_TODAY.
            $expr: {
                $and: [
                    activeStatusExpr,
                    { $gte: [dueDayExpr, tomorrowStartExpr] },
                    { $lt: [dueDayExpr, upcomingEndExclusiveExpr] },
                ]
            }
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
            $expr: {
                $and: [
                    activeStatusExpr,
                    { $eq: [dueDayExpr, todayStartExpr] },
                ]
            }
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
            $expr: {
                $and: [
                    activeStatusExpr,
                    { $lt: [dueDayExpr, todayStartExpr] },
                ]
            },
            // Do not send overdue reminders before the snooze date has passed.
            $or: [
                { snoozeDate: null },
                { snoozeDate: { $exists: false } },
                {
                    $expr: {
                        $lt: [snoozeDayExpr, todayStartExpr]
                    }
                }
            ]
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
};

const reminderCron = typeof cron.createTask === 'function'
    ? cron.createTask(cronExpression, reminderHandler, { timezone: CRON_TIMEZONE })
    : cron.schedule(cronExpression, reminderHandler, { scheduled: false, timezone: CRON_TIMEZONE });
module.exports = reminderCron;
