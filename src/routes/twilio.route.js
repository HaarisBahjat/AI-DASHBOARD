const express = require('express');
const router  = express.Router();
const twilio  = require('twilio');
const { Dues, User, CallLog } = require('../models/db');
const { detectCallIntent } = require('../Service/llm.service');
const { emitToUser } = require('../Sockets/socketState');

// ─── Helpers ───────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL || 'http://localhost:3004';

/**
 * Build a TwiML VoiceResponse and send it.
 * Always sets Content-Type: text/xml.
 */
function sendTwiml(res, buildFn) {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    buildFn(twiml);
    res.type('text/xml');
    res.send(twiml.toString());
}

// ─── Execute LLM decision against the DB ───────────────────────────────────

/**
 * Apply the LLM-determined action to the due record in MongoDB.
 * Returns a human-readable `outcome` string for logging.
 */
async function applyCallDecision({ intent, snoozeDays, userId, dueId }) {
    switch (intent) {
        case 'confirm_paid':
        case 'will_pay_today': {
            // Mark the due as PAID immediately
            await Dues.findByIdAndUpdate(dueId, { status: 'PAID', snoozeDate: null });
            // Notify the UI via Socket.IO
            emitToUser(userId, 'payment-success', { dueId, source: 'voice-call' });
            return intent === 'confirm_paid' ? 'Marked PAID (user confirmed via call)' : 'Marked PAID (user committed to pay today via call)';
        }
        case 'snooze': {
            const days = snoozeDays || 3;
            const snoozeDate = new Date();
            snoozeDate.setDate(snoozeDate.getDate() + days);
            await Dues.findByIdAndUpdate(dueId, { snoozeDate });
            emitToUser(userId, 'due-snoozed', { dueId, snoozeDays: days, snoozeDate });
            return `Snoozed ${days} day(s) via call`;
        }
        case 'dispute': {
            // Flag the due for review — store a note on the due (no status change)
            await Dues.findByIdAndUpdate(dueId, {
                $set: { 'metadata.disputed': true, 'metadata.disputedAt': new Date() }
            });
            emitToUser(userId, 'due-disputed', { dueId });
            return 'Flagged as disputed via call';
        }
        case 'no_response':
        default:
            return 'No action — user response unclear';
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE 1 — GET /api/twilio/voice-twiml
//
// Twilio fetches this URL when the outbound call is answered.
// We speak the overdue reminder and then open a Gather to listen to the user.
//
// Query params (set by makeVoiceCall in twilio.service.js):
//   dueId, userId, title, amount, dueDate
// ═══════════════════════════════════════════════════════════════════════════
router.get('/voice-twiml', async (req, res) => {
    const {
        dueId   = '',
        userId  = '',
        title   = 'your payment',
        amount  = '',
        dueDate = ''
    } = req.query;

    // Create a call log record so we can update it when the call completes
    try {
        if (dueId && userId) {
            await CallLog.create({
                callSid: req.query.CallSid || null,
                userId,
                dueId,
                status: 'in-progress',
            });
        }
    } catch (logErr) {
        console.warn('[CallLog] Failed to create initial log:', logErr.message);
    }

    sendTwiml(res, (twiml) => {
        // ── Opening message ──────────────────────────────────────────────
        twiml.say(
            { voice: 'Polly.Joanna', language: 'en-US' },
            `Hello! This is an urgent payment reminder from your AI Dashboard. ` +
            `Your due "${title}" of ${amount} dollars was due on ${dueDate} and is now overdue.`
        );

        // ── Gather: listen for up to 8 seconds of speech ─────────────────
        // Twilio STT transcribes the speech and POSTs to voice-gather.
        const gather = twiml.gather({
            input: 'speech',
            action: `${BASE_URL}/api/twilio/voice-gather?dueId=${encodeURIComponent(dueId)}&userId=${encodeURIComponent(userId)}&title=${encodeURIComponent(title)}&amount=${encodeURIComponent(amount)}&dueDate=${encodeURIComponent(dueDate)}`,
            method: 'POST',
            speechTimeout: 'auto',   // Twilio detects end of speech automatically
            speechModel: 'phone_call',
            language: 'en-US',
            timeout: 8,
        });

        gather.say(
            { voice: 'Polly.Joanna', language: 'en-US' },
            `Please say: "I have paid", "I will pay today", "Give me more time", or "I dispute this charge". ` +
            `You have 8 seconds to respond after the beep.`
        );

        // ── Fallback if no speech detected ───────────────────────────────
        twiml.say(
            { voice: 'Polly.Joanna', language: 'en-US' },
            `We did not receive your response. Please reply via WhatsApp or log in to the dashboard. Goodbye.`
        );
        twiml.hangup();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE 2 — POST /api/twilio/voice-gather
//
// Twilio posts here after the user finishes speaking.
// req.body.SpeechResult contains the transcribed text.
// We pass it to Gemini LLM, execute the decision, then speak a confirmation.
// ═══════════════════════════════════════════════════════════════════════════
router.post('/voice-gather', async (req, res) => {
    const {
        dueId   = '',
        userId  = '',
        title   = 'your payment',
        amount  = '',
        dueDate = ''
    } = req.query;

    const transcript = (req.body.SpeechResult || '').trim();
    console.log(`[Voice Gather] dueId=${dueId} userId=${userId} transcript="${transcript}"`);

    let llmResult = {
        intent: 'no_response',
        snoozeDays: null,
        confidence: 'low',
        replyMessage: 'Sorry, we could not process your response. Please contact us via WhatsApp or the app. Goodbye.'
    };

    // ── LLM intent detection ─────────────────────────────────────────────
    if (transcript) {
        try {
            llmResult = await detectCallIntent(transcript, { title, amount, dueDate });
        } catch (llmErr) {
            console.error('[Voice Gather] LLM error:', llmErr.message);
        }
    }

    // ── Execute DB action ────────────────────────────────────────────────
    let outcome = 'No action';
    if (dueId && userId) {
        try {
            outcome = await applyCallDecision({
                intent:     llmResult.intent,
                snoozeDays: llmResult.snoozeDays,
                userId,
                dueId
            });
        } catch (actionErr) {
            console.error('[Voice Gather] Action error:', actionErr.message);
            outcome = `Action failed: ${actionErr.message}`;
        }

        // ── Persist call log ─────────────────────────────────────────────
        try {
            await CallLog.findOneAndUpdate(
                { userId, dueId, status: 'in-progress' },
                {
                    transcript,
                    llmIntent:      llmResult.intent,
                    llmConfidence:  llmResult.confidence,
                    snoozeDays:     llmResult.snoozeDays,
                    outcome,
                    status:         'completed'
                },
                { sort: { createdAt: -1 } }
            );
        } catch (logErr) {
            console.warn('[CallLog] Update failed:', logErr.message);
        }
    }

    console.log(`[Voice Gather] intent=${llmResult.intent} outcome="${outcome}"`);

    // ── Speak confirmation back to the caller ────────────────────────────
    sendTwiml(res, (twiml) => {
        twiml.say(
            { voice: 'Polly.Joanna', language: 'en-US' },
            llmResult.replyMessage
        );
        twiml.say(
            { voice: 'Polly.Joanna', language: 'en-US' },
            'Thank you for your time. Goodbye.'
        );
        twiml.hangup();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE 3 — POST /api/twilio/voice-status
//
// Twilio posts the final call status here (configured as statusCallback).
// We update the CallLog with duration and final status.
// ═══════════════════════════════════════════════════════════════════════════
router.post('/voice-status', async (req, res) => {
    const {
        CallSid,
        CallStatus,   // completed | no-answer | busy | failed | canceled
        CallDuration, // seconds
        To
    } = req.body;

    console.log(`[Voice Status] SID=${CallSid} status=${CallStatus} duration=${CallDuration}s`);

    try {
        const update = {
            callSid:  CallSid,
            status:   ['completed', 'no-answer', 'busy', 'failed', 'canceled'].includes(CallStatus)
                        ? CallStatus
                        : 'completed',
            duration: parseInt(CallDuration, 10) || 0,
        };

        // If the call was never answered, set outcome
        if (CallStatus === 'no-answer' || CallStatus === 'busy') {
            update.outcome = `Call ${CallStatus} — no voice interaction recorded`;
        }

        // Try to match by SID first, then fall back to in-progress log for this number
        const updated = await CallLog.findOneAndUpdate(
            { callSid: CallSid },
            update,
            { sort: { createdAt: -1 } }
        );

        if (!updated) {
            // SID not yet stored (status sometimes fires before TwiML route finishes)
            await CallLog.findOneAndUpdate(
                { status: 'in-progress' },
                update,
                { sort: { createdAt: -1 } }
            );
        }
    } catch (err) {
        console.error('[Voice Status] DB update error:', err.message);
    }

    res.sendStatus(204);
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE 4 — POST /api/twilio/webhook
//
// Inbound SMS / WhatsApp replies (PAID / SNOOZE / STATUS).
// ═══════════════════════════════════════════════════════════════════════════
router.post('/webhook', async (req, res) => {
    const MessagingResponse = twilio.twiml.MessagingResponse;
    const twiml = new MessagingResponse();

    try {
        const rawFrom    = req.body.From || '';
        const fromNumber = rawFrom.replace(/^whatsapp:/i, '');
        const bodyRaw    = (req.body.Body || '').trim();
        const bodyUpper  = bodyRaw.toUpperCase();

        const user = await User.findOne({ phone: fromNumber });
        if (!user) {
            twiml.message("Sorry, we couldn't find an account associated with this number.");
            res.type('text/xml');
            return res.send(twiml.toString());
        }

        if (bodyUpper === 'PAID') {
            const overdueDue = await Dues.findOneAndUpdate(
                { userId: user._id, status: { $in: ['OVERDUE', 'UNPAID'] } },
                { status: 'PAID', snoozeDate: null },
                { new: true, sort: { dueDate: 1 } }
            );
            twiml.message(overdueDue
                ? `✅ Your due "${overdueDue.title}" of $${overdueDue.amount} is marked PAID. Thank you!`
                : `ℹ️ No outstanding dues found for your account.`
            );
        } else if (bodyUpper.startsWith('SNOOZE')) {
            const days = parseInt((bodyRaw.split(/\s+/)[1] || '3'), 10) || 3;
            const snoozeDate = new Date();
            snoozeDate.setDate(snoozeDate.getDate() + days);
            const updated = await Dues.updateMany(
                { userId: user._id, status: { $in: ['OVERDUE', 'UNPAID'] } },
                { snoozeDate }
            );
            twiml.message(`⏰ Snoozed ${updated.modifiedCount} due(s) for ${days} day(s). We'll remind you on ${snoozeDate.toDateString()}.`);
        } else if (bodyUpper === 'STATUS') {
            const unpaid  = await Dues.countDocuments({ userId: user._id, status: 'UNPAID' });
            const overdue = await Dues.countDocuments({ userId: user._id, status: 'OVERDUE' });
            twiml.message(
                `📊 Your dues:\n• Unpaid: ${unpaid}\n• Overdue: ${overdue}\n\n` +
                `Reply PAID to mark paid, or SNOOZE <days> to postpone.`
            );
        } else {
            twiml.message(
                `🤖 AI Dashboard Bot\nCommands:\n` +
                `• PAID — mark your most recent due as paid\n` +
                `• SNOOZE <days> — snooze reminders\n` +
                `• STATUS — view your dues`
            );
        }
    } catch (err) {
        console.error('[Twilio Webhook] Error:', err.message);
        twiml.message('An error occurred. Please try again later.');
    }

    res.type('text/xml');
    res.send(twiml.toString());
});

module.exports = router;
