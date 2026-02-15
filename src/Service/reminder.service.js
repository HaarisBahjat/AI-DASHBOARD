const Reminder = require("../models/db").Reminder;
const ConversationSession = require("../models/db").ConversationSession;

exports.createReminder = async ({
    userId, dueId, due, reminderType, messageText, triggerSource, metadata
}) => {

    // Create the reminder
    const reminder = await Reminder.create({
        userId,
        dueId: dueId,
        reminderType,
        messageText,
        triggerSource,
        metadata:{
            amount : due.amount,
            title: due.title,
            dueDate: due.dueDate,
            ...metadata
        }
    });
    
    // Create a conversation session for this reminder
    try {
        // Check if conversation already exists for this due
        const existingConversation = await ConversationSession.findOne({
            dueId: dueId,
            status: { $in: ['STARTED', 'IN_PROGRESS'] }
        });
        
        if(!existingConversation) {
            await ConversationSession.create({
                userId: userId,
                dueId: dueId,
                reminderLogId: reminder._id,
                channel: 'VOICE',
                status: 'STARTED'
            });
            console.log(`Conversation session created for reminder: ${reminder._id}`);
        }
    } catch(err) {
        console.error(`Error creating conversation for reminder:`, err.message);
    }
    
    return reminder;
}
