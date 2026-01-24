const Reminder = require("../models/db").Reminder;

exports.createReminder = async ({
    userId, dueId, reminderType, messageText, triggerSource, metadata
}) => {

    return await Reminder.create({
        userId,
        dueId: dueId,
        reminderType,
        messageText,
        triggerSource,
        metadata:{
            amount : dueId.amount,
            title: dueId.title,
            dueDate: dueId.dueDate,
            ...metadata
        }
    });
}