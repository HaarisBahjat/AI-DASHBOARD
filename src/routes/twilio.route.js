/**
 * twilio.route.js
 *
 * AI-powered multi-turn voice call pipeline.
 *
 * CALL FLOW:
 *
 *   Twilio dials user
 *        │
 *        ▼
 *   GET  /api/twilio/voice-twiml?dueId=...&userId=...&...&CallSid=CA...
 *        │  → initCall(CallSid, { dueId, userId, due })
 *        │  → addTurn('ai', opening message)
 *        │  → <Say> opening + <Gather action="/voice-gather" input="speech">
 *        │
 *   User speaks
 *        │
 *        ▼
 *   POST /api/twilio/voice-gather  (body: CallSid, SpeechResult)
 *        │  → getCall(CallSid)
 *        │  → addTurn('user', transcript)
 *        │  → conductCallTurn(turns, dueContext)  ← Gemini LLM
 *        │  → addTurn('ai', llmReply)
 *        │
 *        ├── action='continue'
 *        │      → <Say> llmReply + new <Gather> → LOOP BACK
 *        │
 *        └── action='end'  (or max turns reached)
 *               → applyCallDecision (DB update + socket emit)
 *               → saveCallLog (MongoDB)
 *               → endCall (clear Map)
 *               → <Say> confirmation + <Hangup>
 *
 *   POST /api/twilio/voice-status  (Twilio fires when call fully ends)
 *        │  → update CallLog with duration + final status
 *
 *   POST /api/twilio/webhook  (inbound SMS / WhatsApp replies)
 */

const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const { Dues, User, CallLog } = require('../models/db');
const { conductCallTurn } = require('../Service/llm.service');
const { emitToUser } = require('../Sockets/socketState');
const callState = require('../Service/callState.service');

const BASE_URL = process.env.BASE_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3004');

if (!BASE_URL) {
    throw new Error('BASE_URL is required in production');
}

// ─── Shared helpers ────────────────────────────────────────────────────────

/**
 * [B] Twilio webhook signature validation.
 * Verifies that every inbound POST is genuinely from Twilio by checking
 * the X-Twilio-Signature header against the expected HMAC-SHA1 hash.
 * Skip validation in development when TWILIO_AUTH_TOKEN is not set.
 */
function validateTwilioSignature(req, res, next) {
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!token) {
        // No token configured — skip in local dev, warn loudly
        console.warn('[Twilio] TWILIO_AUTH_TOKEN not set — skipping signature validation!');
        return next();
    }
    const fullUrl = BASE_URL + req.originalUrl;
    const isValid = twilio.validateRequest(
        token,
        req.headers['x-twilio-signature'] || '',
        fullUrl,
        req.body
    );
    if (!isValid) {
        console.warn(`[Twilio] Invalid signature rejected: ${fullUrl}`);
        return res.status(403).send('Forbidden: Invalid Twilio signature');
    }
    next();
}

/** Send TwiML response. */
function sendTwiml(res, buildFn) {
    const twiml = new twilio.twiml.VoiceResponse();
    buildFn(twiml);
    res.type('text/xml');
    res.send(twiml.toString());
}

/**
 * Return a <Gather> TwiML that loops back to /voice-gather.
 * The CallSid is forwarded automatically by Twilio in the POST body.
 * We also carry dueId & userId as query params (fallback safety).
 */
function buildGather(twiml, { replyText, gatherUrl }) {
    twiml.say({ voice: 'Polly.Joanna', language: 'en-US' }, replyText);

    const gather = twiml.gather({
        input: 'speech',
        action: gatherUrl,
        method: 'POST',
        speechTimeout: 'auto',       // Twilio auto-detects end of speech
        speechModel: 'phone_call',  // optimised for phone audio
        language: 'en-US',
        timeout: 8,              // seconds of silence before fallback
    });

    // Nudge the caller while Gather is listening
    gather.say(
        { voice: 'Polly.Joanna', language: 'en-US' },
        'Please speak after the tone. You have 8 seconds.'
    );

    // Fallback: if no speech detected, Twilio falls through to this
    twiml.say(
        { voice: 'Polly.Joanna', language: 'en-US' },
        'We did not receive a response. Please reply via WhatsApp or the dashboard. Goodbye.'
    );
    twiml.hangup();
}

/**
 * Execute the LLM-decided action on the database.
 * Returns a human-readable outcome string for audit logging.
 */
async function applyCallDecision({ intent, snoozeDays, userId, dueId }) {
    const now = new Date();

    switch (intent) {

        // ── User says "I'll pay now / today / in a bit" ──────────────────────
        // This is a Promise to Pay (PTP), NOT a confirmation.
        // We snooze for 1 day and flag it. If unpaid tomorrow, the
        // cron will call them back with context that they already promised.
        case 'will_pay_today': {
            const snoozeDate = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // +1 day
            await Dues.findByIdAndUpdate(dueId, {
                status: 'PTP',
                snoozeDate,
                metadata: {
                    promiseToPay: true,
                    promisedAt: now,
                    promisedFor: snoozeDate,
                },
            });
            emitToUser(userId, 'due-ptp', { dueId, snoozeDate, source: 'voice-call' });
            return 'Marked PTP — user verbally committed to pay today. Snoozed 1 day.';
        }

        // ── User says "I already paid" ───────────────────────────────────────
        // Cannot be trusted blindly. Flag for admin verification.
        // Snoozed 2 days — if no manual confirmation by then, it goes back to OVERDUE.
        case 'confirm_paid': {
            const snoozeDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // +2 days
            await Dues.findByIdAndUpdate(dueId, {
                status: 'VERIFYING',
                snoozeDate,
                metadata: {
                    verificationPending: true,
                    claimedPaidAt: now,
                },
            });
            emitToUser(userId, 'due-verifying', { dueId, snoozeDate, source: 'voice-call' });
            return 'Marked VERIFYING — user claimed payment. Admin must confirm via bank records.';
        }

        // ── User asks for more time ──────────────────────────────────────────
        case 'snooze': {
            const days = snoozeDays || 3;
            const snoozeDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
            await Dues.findByIdAndUpdate(dueId, {
                snoozeDate,
                metadata: { snoozedViaCall: true, snoozedAt: now },
            });
            emitToUser(userId, 'due-snoozed', { dueId, snoozeDays: days, snoozeDate });
            return `Snoozed ${days} day(s) via call`;
        }

        // ── User disputes the charge ─────────────────────────────────────────
        case 'dispute': {
            await Dues.findByIdAndUpdate(dueId, {
                $set: {
                    'metadata.disputed': true,
                    'metadata.disputedAt': now,
                },
            });
            emitToUser(userId, 'due-disputed', { dueId });
            return 'Flagged as disputed via call';
        }

        default:
            return 'No action taken — intent unclear';
    }
}


/**
 * Persist the completed call to MongoDB CallLog.
 */
async function saveCallLog({ userId, dueId, turns, intent, snoozeDays, outcome, callSid }) {
    try {
        const fullTranscript = turns
            .map(t => `[${t.role.toUpperCase()}]: ${t.text}`)
            .join('\n');

        // Upsert — if the record was created at call init, update it
        if (!dueId) return; // Prevent Cast to ObjectId errors
        await CallLog.findOneAndUpdate(
            { userId, dueId, status: { $in: ['initiated', 'in-progress'] } },
            {
                callSid: callSid || null,
                status: 'completed',
                transcript: fullTranscript,
                llmIntent: intent || null,
                snoozeDays: snoozeDays || null,
                outcome,
            },
            { sort: { createdAt: -1 }, upsert: true }
        );
    } catch (err) {
        console.error('[CallLog] Save failed:', err.message);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE 1 — GET /api/twilio/voice-twiml
//
// First webhook Twilio fetches when the called party answers.
// We initialise call state, record the opening AI message, and
// return TwiML that speaks + opens a Gather for user speech.
//
// Query params (set by makeVoiceCall):
//   CallSid, dueId, userId, title, amount, dueDate
// ═══════════════════════════════════════════════════════════════════════════
router.get('/voice-twiml', async (req, res) => {
    const {
        CallSid = '',
        dueId = '',
        userId = '',
        title = 'your payment',
        amount = '',
        dueDate = ''
    } = req.query;

    // Opening message — hardcoded (not LLM) to keep latency low on answer
    const openingText =
        `Hello! This is an automated payment reminder from your AI Dashboard. ` +
        `Your due "${title}" of ${amount} dollars was due on ${dueDate} and is now overdue. ` +
        `How would you like to handle this? ` +
        `You can say: I have paid, I will pay today, give me more time, or I dispute this charge.`;

    // Initialise call state in memory
    if (CallSid) {
        callState.initCall(CallSid, {
            dueId,
            userId,
            due: { title, amount, dueDate },
        });
        callState.addTurn(CallSid, 'ai', openingText);
    }

    // Create an initial CallLog record so voice-status can update it later
    try {
        if (dueId && userId) {
            await CallLog.create({ callSid: CallSid || null, userId, dueId, status: 'in-progress' });
        }
    } catch (e) { /* ignore duplicate */ }

    // Build gather URL — dueId & userId carried as params for graceful fallback
    const gatherUrl =
        `${BASE_URL}/api/twilio/voice-gather` +
        `?dueId=${encodeURIComponent(dueId)}` +
        `&userId=${encodeURIComponent(userId)}` +
        `&title=${encodeURIComponent(title)}` +
        `&amount=${encodeURIComponent(amount)}` +
        `&dueDate=${encodeURIComponent(dueDate)}`;

    sendTwiml(res, (twiml) => buildGather(twiml, { replyText: openingText, gatherUrl }));
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE 1b — GET /api/twilio/voice-twiml-group
//
// Batched version — one call covers ALL overdue dues for the user.
// Query params: userId, dues (JSON array of {dueId,title,amount,dueDate})
// ═══════════════════════════════════════════════════════════════════════════
router.get('/voice-twiml-group', async (req, res) => {
    const { CallSid = '', userId = '', dues: duesRaw = '[]' } = req.query;

    let dues = [];
    try { dues = JSON.parse(duesRaw); } catch { dues = []; }

    // Build a natural-sounding opening that lists every due
    let openingText = `Hello! This is an automated payment reminder from your AI Dashboard. `;

    if (dues.length === 0) {
        openingText += `You have overdue payments that need attention.`;
    } else if (dues.length === 1) {
        const d = dues[0];
        openingText +=
            `Your due "${d.title}" of ${d.amount} dollars was due on ${d.dueDate} and is now overdue. `;
    } else {
        openingText += `You have ${dues.length} overdue payments: `;
        dues.forEach((d, i) => {
            const connector = i === dues.length - 1 ? 'and ' : '';
            openingText += `${connector}"${d.title}" of ${d.amount} dollars due on ${d.dueDate}`;
            if (i < dues.length - 1) openingText += ', ';
        });
        openingText += '. ';
    }

    openingText +=
        `How would you like to handle these? ` +
        `You can say: I have paid, I will pay all, give me more time, or I dispute a charge.`;

    // Use the first due as the primary for call state & CallLog
    const primaryDue = dues[0] || {};
    const primaryDueId = primaryDue.dueId || '';

    if (CallSid) {
        callState.initCall(CallSid, {
            dueId:  primaryDueId,
            userId,
            due:    primaryDue,
            allDues: dues,   // store all for context in gather
        });
        callState.addTurn(CallSid, 'ai', openingText);
    }

    try {
        if (primaryDueId && userId) {
            await CallLog.create({ callSid: CallSid || null, userId, dueId: primaryDueId, status: 'in-progress' });
        }
    } catch (e) { /* ignore duplicate */ }

    const gatherUrl =
        `${BASE_URL}/api/twilio/voice-gather` +
        `?userId=${encodeURIComponent(userId)}` +
        `&dueId=${encodeURIComponent(primaryDueId)}` +
        `&title=${encodeURIComponent(primaryDue.title || '')}` +
        `&amount=${encodeURIComponent(primaryDue.amount || '')}` +
        `&dueDate=${encodeURIComponent(primaryDue.dueDate || '')}`;

    sendTwiml(res, (twiml) => buildGather(twiml, { replyText: openingText, gatherUrl }));
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE 2 — POST /api/twilio/voice-gather
//
// Called by Twilio after every user speech input.
// This is the core multi-turn AI loop.
//
// Twilio body params: CallSid, SpeechResult, Confidence, ...
// Our query params:   dueId, userId, title, amount, dueDate (fallback)
// ═══════════════════════════════════════════════════════════════════════════
router.post('/voice-gather', validateTwilioSignature, async (req, res) => {
    const callSid = req.body.CallSid || '';

    // Query params are fallback context if call state is missing (server restart)
    const {
        dueId = '',
        userId = '',
        title = 'your payment',
        amount = '',
        dueDate = ''
    } = req.query;

    const transcript = (req.body.SpeechResult || '').trim();
    const confidence = parseFloat(req.body.Confidence || '0');

    console.log(`[Voice Gather] SID=${callSid} confidence=${confidence} transcript="${transcript}"`);

    // ── Retrieve call state ──────────────────────────────────────────────
    let state = callState.getCall(callSid);

    // Graceful fallback: state lost (server restart mid-call)
    if (!state) {
        console.warn(`[Voice Gather] No state for ${callSid} — rebuilding from query params`);
        state = callState.initCall(callSid, {
            dueId, userId,
            due: { title, amount, dueDate },
        });
    }

    const dueContext = state.due || { title, amount, dueDate };
    const resolvedDueId = state.dueId || dueId;
    const resolvedUserId = state.userId || userId;

    // ── Record user turn ─────────────────────────────────────────────────
    const userText = transcript || '[no speech detected]';
    callState.addTurn(callSid, 'user', userText);

    // ── Check max turns ──────────────────────────────────────────────────
    const forceEnd = callState.isMaxTurnsReached(callSid);

    // ── Ask Gemini what to do next ───────────────────────────────────────
    let llmResult;
    try {
        llmResult = await conductCallTurn(state.turns, dueContext, forceEnd);
    } catch (err) {
        console.error('[Voice Gather] LLM failed:', err.message);
        llmResult = {
            action: 'end',
            intent: 'no_response',
            snoozeDays: null,
            reply: 'I am sorry, I encountered a technical issue. Please contact us via the app. Goodbye.'
        };
    }

    // ── Record AI reply ──────────────────────────────────────────────────
    callState.addTurn(callSid, 'ai', llmResult.reply);

    // ── Build the gather URL for the NEXT turn (in case we continue) ─────
    const gatherUrl =
        `${BASE_URL}/api/twilio/voice-gather` +
        `?dueId=${encodeURIComponent(resolvedDueId)}` +
        `&userId=${encodeURIComponent(resolvedUserId)}` +
        `&title=${encodeURIComponent(dueContext.title || title)}` +
        `&amount=${encodeURIComponent(dueContext.amount || amount)}` +
        `&dueDate=${encodeURIComponent(dueContext.dueDate || dueDate)}`;

    // ════════════════════════════════════════════════════════════════════
    // CONTINUE: LLM wants to ask a follow-up — loop the Gather
    // ════════════════════════════════════════════════════════════════════
    if (llmResult.action === 'continue') {
        return sendTwiml(res, (twiml) =>
            buildGather(twiml, { replyText: llmResult.reply, gatherUrl })
        );
    }

    // ════════════════════════════════════════════════════════════════════
    // END: LLM decided on an action — execute it and hang up
    // ════════════════════════════════════════════════════════════════════
    let outcome = 'No action taken';
    if (resolvedDueId && resolvedUserId) {
        try {
            outcome = await applyCallDecision({
                intent: llmResult.intent,
                snoozeDays: llmResult.snoozeDays,
                userId: resolvedUserId,
                dueId: resolvedDueId,
            });
        } catch (actionErr) {
            console.error('[Voice Gather] Action error:', actionErr.message);
            outcome = `Action failed: ${actionErr.message}`;
        }
    }

    // ── Save completed call to MongoDB ───────────────────────────────────
    const finalState = callState.endCall(callSid); // clears the Map entry
    await saveCallLog({
        userId: resolvedUserId,
        dueId: resolvedDueId,
        turns: finalState ? finalState.turns : state.turns,
        intent: llmResult.intent,
        snoozeDays: llmResult.snoozeDays,
        outcome,
        callSid,
    });

    console.log(`[Voice Gather] Call ended — intent=${llmResult.intent} outcome="${outcome}"`);

    // ── Speak confirmation and hang up ───────────────────────────────────
    sendTwiml(res, (twiml) => {
        twiml.say({ voice: 'Polly.Joanna', language: 'en-US' }, llmResult.reply);
        twiml.pause({ length: 1 });
        twiml.say({ voice: 'Polly.Joanna', language: 'en-US' }, 'Thank you. Goodbye.');
        twiml.hangup();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE 3 — POST /api/twilio/voice-status
//
// Twilio posts call lifecycle events here (ringing, answered, completed…).
// We use it to capture duration and final status in the CallLog.
// ═══════════════════════════════════════════════════════════════════════════
router.post('/voice-status', validateTwilioSignature, async (req, res) => {
    const { CallSid, CallStatus, CallDuration } = req.body;
    console.log(`[Voice Status] SID=${CallSid} status=${CallStatus} duration=${CallDuration}s`);

    try {
        const finalStatus = ['completed', 'no-answer', 'busy', 'failed', 'canceled'].includes(CallStatus)
            ? CallStatus : 'completed';

        const update = {
            callSid: CallSid,
            status: finalStatus,
            duration: parseInt(CallDuration, 10) || 0,
        };

        if (['no-answer', 'busy', 'failed', 'canceled'].includes(CallStatus)) {
            update.outcome = `Call ${CallStatus} — no voice interaction`;
            // Also clean up any orphaned Map state
            callState.endCall(CallSid);
        }

        await CallLog.findOneAndUpdate(
            { callSid: CallSid },
            update,
            { sort: { createdAt: -1 } }
        );
    } catch (err) {
        console.error('[Voice Status] DB update error:', err.message);
    }

    res.sendStatus(204);
});

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE 4 — POST /api/twilio/webhook
//
// Inbound SMS / WhatsApp replies.
// User can reply PAID / SNOOZE <n> / STATUS to the WhatsApp message.
// ═══════════════════════════════════════════════════════════════════════════
router.post('/webhook', validateTwilioSignature, async (req, res) => {
    const twiml = new twilio.twiml.MessagingResponse();

    try {
        const rawFrom = req.body.From || '';
        const fromNumber = rawFrom.replace(/^whatsapp:/i, '');
        const bodyRaw = (req.body.Body || '').trim();
        const bodyUpper = bodyRaw.toUpperCase();

        const user = await User.findOne({ phone: fromNumber });
        if (!user) {
            twiml.message("Sorry, we couldn't find an account linked to this number.");
            res.type('text/xml');
            return res.send(twiml.toString());
        }

        if (bodyUpper === 'PAID') {
            const due = await Dues.findOneAndUpdate(
                { userId: user._id, status: { $in: ['OVERDUE', 'UNPAID'] } },
                { status: 'PAID', snoozeDate: null },
                { new: true, sort: { dueDate: 1 } }
            );
            twiml.message(due
                ? `✅ Your due "${due.title}" of $${due.amount} is now marked PAID. Thank you!`
                : `ℹ️ No outstanding dues found for your account.`
            );

        } else if (bodyUpper.startsWith('SNOOZE')) {
            // [C] Cap snooze days to prevent abuse (e.g. SNOOZE 9999)
            const MAX_SNOOZE_DAYS = parseInt(process.env.MAX_SNOOZE_DAYS || '30', 10);
            const requestedDays = parseInt((bodyRaw.split(/\s+/)[1] || '3'), 10) || 3;
            const days = Math.min(requestedDays, MAX_SNOOZE_DAYS);
            const snoozeDate = new Date();
            snoozeDate.setDate(snoozeDate.getDate() + days);
            const result = await Dues.updateMany(
                { userId: user._id, status: { $in: ['OVERDUE', 'UNPAID'] } },
                { snoozeDate }
            );
            twiml.message(`⏰ Snoozed ${result.modifiedCount} due(s) for ${days} day(s). We'll remind you on ${snoozeDate.toDateString()}.`);

        } else if (bodyUpper === 'STATUS') {
            const [unpaid, overdue] = await Promise.all([
                Dues.countDocuments({ userId: user._id, status: 'UNPAID' }),
                Dues.countDocuments({ userId: user._id, status: 'OVERDUE' }),
            ]);
            twiml.message(
                `📊 Your dues:\n• Unpaid: ${unpaid}\n• Overdue: ${overdue}\n\n` +
                `Reply PAID to mark paid, or SNOOZE <days> to postpone.`
            );

        } else {
            twiml.message(
                `🤖 AI Dashboard Bot\n\nCommands:\n` +
                `• PAID — mark your most recent due as paid\n` +
                `• SNOOZE <days> — postpone reminders\n` +
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
