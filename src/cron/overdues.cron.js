const cron = require('node-cron');
const Due = require('../models/db').Dues;
const CRON_TIMEZONE = process.env.CRON_TIMEZONE || 'UTC';
const OVERDUE_CRON_EXPRESSION = process.env.OVERDUE_CRON_EXPRESSION || '0 0 * * *';

// Default: run every minute. You can later change via OVERDUE_CRON_EXPRESSION (e.g. '0 0 * * *').
const cronExpression = OVERDUE_CRON_EXPRESSION;
const overdueHandler = async () => {
    try {
        const unpaidStatusExpr = {
            $eq: [
                { $toUpper: { $trim: { input: '$status' } } },
                'UNPAID',
            ],
        };

        const todayStartExpr = {
            $dateTrunc: {
                date: '$$NOW',
                unit: 'day',
                timezone: CRON_TIMEZONE,
            },
        };

        const result = await Due.updateMany(
            {
                // Mark overdue only when due date's calendar day is before today in configured timezone.
                $expr: {
                    $and: [
                        unpaidStatusExpr,
                        {
                            $lt: [
                                {
                                    $dateTrunc: {
                                        date: '$dueDate',
                                        unit: 'day',
                                        timezone: CRON_TIMEZONE,
                                    },
                                },
                                todayStartExpr,
                            ],
                        },
                    ]
                },
                // If snoozeDate exists, wait until snooze day has fully passed.
                $or: [
                    // No snooze
                    { snoozeDate: null },
                    // Snoozed but snooze day has passed
                    { snoozeDate: { $exists: false } },
                    {
                        $expr: {
                            $lt: [
                                {
                                    $dateTrunc: {
                                        date: '$snoozeDate',
                                        unit: 'day',
                                        timezone: CRON_TIMEZONE,
                                    },
                                },
                                todayStartExpr,
                            ]
                        }
                    }
                ]
            },
            { $set: { status: "OVERDUE" } }
        );
        console.log(`Overdue Cron Job [${CRON_TIMEZONE}]: matched=${result.matchedCount} updated=${result.modifiedCount}`);
    } catch (error) {
        console.error('Error running overdue cron job:', error);
    }
};
// For testing/debugging: a handler that can be called directly without waiting for cron schedule.
const overdueCron = typeof cron.createTask === 'function'
    ? cron.createTask(cronExpression, overdueHandler, { timezone: CRON_TIMEZONE })
    : cron.schedule(cronExpression, overdueHandler, { scheduled: false, timezone: CRON_TIMEZONE });

module.exports = overdueCron;
