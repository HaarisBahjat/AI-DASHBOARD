const Reminder = require("../models/db").Reminder;
const ConversationSession = require("../models/db").ConversationSession;
// This service handles the creation of reminders and associated conversation sessions for dues.
const Conversation = require("../models/db").Conversation;
const User = require("../models/db").User;
const { textToSpeech } = require("./tts.service");
const { emitToUser } = require("../Sockets/socketState");
const twilioService = require("./twilio.service");
const fs = require('fs');
const path = require('path');
// Helper function to get start and end of the day for a given date
const getDayBounds = (date = new Date()) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

const ensureReminderConversationAndEmit = async ({ reminder, due, reminderType, messageText }) => {
    const { start, end } = getDayBounds(new Date(reminder.createdAt || new Date()));

    let targetConversation = await ConversationSession.findOne({
        dueId: reminder.dueId,
        status: { $in: ['STARTED', 'IN_PROGRESS'] }
    }).sort({ updatedAt: -1 });

    if (!targetConversation) {
        targetConversation = await ConversationSession.create({
            userId: reminder.userId,
            dueId: reminder.dueId,
            reminderLogId: reminder._id,
            channel: 'VOICE',
            status: 'STARTED'
        });
        console.log(`Conversation session created for reminder: ${reminder._id}`);
    }

    // Prevent duplicate reminder system messages for the same due/type/day.
    const existingSystemMessage = await Conversation.findOne({
        conversationId: targetConversation._id,
        roles: 'SYSTEM',
        message: messageText,
        createdAt: { $gte: start, $lte: end }
    }).sort({ createdAt: -1 });

    const reminderSystemMessage = existingSystemMessage || await Conversation.create({
        conversationId: targetConversation._id,
        roles: 'SYSTEM',
        message: messageText,
    });

    let audioFile = null;
    try {
        const audioBuffer = await textToSpeech(messageText);
        const audioDir = path.join(__dirname, '../audio');
        if (!fs.existsSync(audioDir)) {
            fs.mkdirSync(audioDir, { recursive: true });
        }
        const fileName = `reminder_${reminder._id}.mp3`;
        const audioPath = path.join(audioDir, fileName);
        fs.writeFileSync(audioPath, audioBuffer);
        audioFile = `/audio/${fileName}`;
    } catch (ttsErr) {
        // Text notifications should still reach the UI even when TTS is down.
        console.error('Reminder TTS failed:', ttsErr.message);
    }

    emitToUser(reminder.userId, 'reminder-voice', {
        reminderId: reminder._id,
        reminderType,
        dueId: reminder.dueId,
        conversationId: targetConversation._id,
        message: reminderSystemMessage.message,
        audioFile,
        createdAt: reminder.createdAt,
        dueTitle: due?.title || null,
        dueDate: due?.dueDate || null,
    });
};

exports.createReminder = async ({
    userId, dueId, due, reminderType, messageText, triggerSource, metadata
}) => {

    // Avoid reminder spam from minute-level cron by creating one reminder per due/type/day.
    const { start, end } = getDayBounds(new Date());
    // Check if a reminder of the same type for the same due already exists for today
    const existingReminder = await Reminder.findOne({
        userId,
        dueId,
        reminderType,
        createdAt: { $gte: start, $lte: end },
    }).sort({ createdAt: -1 });

    if (existingReminder) {
        await ensureReminderConversationAndEmit({
            reminder: existingReminder,
            due,
            reminderType,
            messageText: existingReminder.messageText || messageText,
        });
        // [F] Twilio already fired for this reminder today — do NOT send again
        return existingReminder;
    }

    // Create the reminder
    const reminder = await Reminder.create({
        userId,
        dueId: dueId,
        reminderType,
        messageText,
        triggerSource,
        metadata: {
            amount: due.amount,
            title: due.title,
            dueDate: due.dueDate,
            ...metadata
        }
    });

    try {
        await ensureReminderConversationAndEmit({
            reminder,
            due,
            reminderType,
            messageText,
        });
    } catch (err) {
        console.error(`Error creating conversation for reminder:`, err.message);
    }

    // ── Twilio: WhatsApp + Voice Call (OVERDUE only) ───────────────────────
    // Look up the user's phone number from the DB so this service stays
    // independent of the auth layer. Runs async and never blocks the caller.
    try {
        const user = await User.findById(userId).select('phone').lean();
        if (user && user.phone) {
            await twilioService.sendDueReminder({
                phone: user.phone,
                due,
                reminderType,
                userId,
            });
        } else {
            console.log(`[Twilio] No phone on file for user ${userId} — skipping notification.`);
        }
    } catch (twilioErr) {
        // Twilio failure must never break the reminder pipeline.
        console.error(`[Twilio] Notification failed for reminder ${reminder._id}:`, twilioErr.message);
    }

    return reminder;
}

/**
 * Same as createReminder but skips the Twilio voice call.
 * Used by the overdue cron which fires ONE group call after processing all dues,
 * instead of one call per due. WhatsApp messages are still sent per-due.
 */
exports.createReminderNoCall = async ({
    userId, dueId, due, reminderType, messageText, triggerSource, metadata
}) => {
    const { start, end } = getDayBounds(new Date());
    const existingReminder = await Reminder.findOne({
        userId, dueId, reminderType,
        createdAt: { $gte: start, $lte: end },
    }).sort({ createdAt: -1 });

    if (existingReminder) {
        await ensureReminderConversationAndEmit({
            reminder: existingReminder, due, reminderType,
            messageText: existingReminder.messageText || messageText,
        });
        // Send WhatsApp if not yet sent today
        if (!existingReminder.twilioSent) {
            const user = await User.findById(userId).select('phone').lean();
            if (user && user.phone) {
                try {
                    await twilioService.sendWhatsApp(user.phone,
                        `🚨 *OVERDUE ALERT!*\nYour due *"${due.title}"* of $${due.amount} was due on *${new Date(due.dueDate).toDateString()}* and is now OVERDUE.\n\nReply *PAID* if you've paid or *SNOOZE <days>* to postpone.`
                    );
                    await Reminder.findByIdAndUpdate(existingReminder._id, { twilioSent: true });
                } catch (err) {
                    console.error(`[Twilio] WhatsApp failed for reminder ${existingReminder._id}:`, err.message);
                }
            }
        }
        return existingReminder;
    }

    const reminder = await Reminder.create({
        userId, dueId, reminderType, messageText,
        triggerSource, twilioSent: false,
        metadata: { amount: due.amount, title: due.title, dueDate: due.dueDate, ...metadata }
    });

    try {
        await ensureReminderConversationAndEmit({ reminder, due, reminderType, messageText });
    } catch (err) {
        console.error('Error creating conversation for reminder:', err.message);
    }

    // WhatsApp only — voice call handled by cron group call
    try {
        const user = await User.findById(userId).select('phone').lean();
        if (user && user.phone) {
            await twilioService.sendWhatsApp(user.phone,
                `🚨 *OVERDUE ALERT!*\nYour due *"${due.title}"* of $${due.amount} was due on *${new Date(due.dueDate).toDateString()}* and is now OVERDUE.\n\nReply *PAID* if you've paid or *SNOOZE <days>* to postpone.`
            );
            await Reminder.findByIdAndUpdate(reminder._id, { twilioSent: true });
        } else {
            console.log(`[Twilio] No phone for user ${userId} — skipping WhatsApp.`);
        }
    } catch (err) {
        console.error(`[Twilio] WhatsApp failed for reminder ${reminder._id}:`, err.message);
    }

    return reminder;
};
