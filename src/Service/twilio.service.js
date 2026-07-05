const twilio = require('twilio');

// ─── Client ────────────────────────────────────────────────────────────────
const ACCOUNT_SID  = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN   = process.env.TWILIO_AUTH_TOKEN;
const FROM_SMS     = process.env.TWILIO_FROM_NUMBER;          // +1xxxxxxxxxx
const FROM_WA      = process.env.TWILIO_WHATSAPP_FROM;        // whatsapp:+14155238886
const BASE_URL     = process.env.BASE_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3004'); // public-facing URL for TwiML

if (!BASE_URL) {
    throw new Error('BASE_URL is required in production');
}

// ── Helper for detailed Twilio error logging ───────────────────────────────────────
function logTwilioError(context, err) {
    console.error(`[Twilio ${context}] FAILED
    • Error code: ${err.code || 'N/A'}
    • Message   : ${err.message}
    • Hint      : Check Twilio Console for the specific error code.`);
}

let client = null;

/**
 * Lazy-initialise the Twilio client once so the server still boots
 * even when Twilio env-vars are missing (they'll only be needed at call-time).
 */
function getClient() {
    if (!client) {
        if (!ACCOUNT_SID || !AUTH_TOKEN) {
            throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
        }
        client = twilio(ACCOUNT_SID, AUTH_TOKEN);
    }
    return client;
}

// ─── Low-level helpers ──────────────────────────────────────────────────────

/**
 * Send a plain SMS.
 * @param {string} to   - E.164 format phone number e.g. +923001234567
 * @param {string} body - Message text
 */
exports.sendSMS = async (to, body) => {
    if (!FROM_SMS) throw new Error('TWILIO_FROM_NUMBER not set in .env');
    try {
        const msg = await getClient().messages.create({ from: FROM_SMS, to, body });
        console.log(`[Twilio SMS] Sent to ${to} — SID: ${msg.sid}`);
        return msg;
    } catch (err) {
        logTwilioError('SMS', err);
        throw err;
    }
};

/**
 * Send a WhatsApp message via the Twilio WhatsApp channel.
 * @param {string} to   - E.164 format number (WITHOUT the whatsapp: prefix — we add it)
 * @param {string} body - Message text
 */
exports.sendWhatsApp = async (to, body) => {
    if (!FROM_WA) throw new Error('TWILIO_WHATSAPP_FROM not set in .env');
    try {
        const waTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
        const msg = await getClient().messages.create({ from: FROM_WA, to: waTo, body });
        console.log(`[Twilio WhatsApp] Sent to ${to} — SID: ${msg.sid}`);
        return msg;
    } catch (err) {
        logTwilioError('WhatsApp', err);
        throw err;
    }
};

/**
 * Initiate an outbound AI voice call.
 * Twilio will fetch TwiML from /api/twilio/voice-twiml, which speaks the
 * reminder, opens a Gather (speech input), and routes the transcript to
 * /api/twilio/voice-gather for LLM processing.
 *
 * @param {string} to         - E.164 phone number to call
 * @param {object} params     - { dueId, userId, title, amount, dueDate }
 */
exports.makeVoiceCall = async (to, params = {}) => {
    const qs = new URLSearchParams({
        dueId:   params.dueId   || '',
        userId:  String(params.userId || ''),
        title:   params.title   || '',
        amount:  String(params.amount  || ''),
        dueDate: params.dueDate || '',
    }).toString();

    const twimlUrl       = `${BASE_URL}/api/twilio/voice-twiml?${qs}`;
    const statusCallback = `${BASE_URL}/api/twilio/voice-status`;

    try {
        const call = await getClient().calls.create({
            to,
            from: FROM_SMS,
            url:                    twimlUrl,
            method:                 'GET',
            statusCallback,
            statusCallbackMethod:   'POST',
            statusCallbackEvent:    ['initiated', 'ringing', 'answered', 'completed'],
        });
        console.log(`[Twilio Call] Initiated to ${to} — SID: ${call.sid}`);
        return call;
    } catch (err) {
        logTwilioError('Voice Call', err);
        throw err;
    }
};

/**
 * Initiate a single outbound call that covers MULTIPLE overdue dues.
 * All due details are passed as a JSON array in the query string so
 * the TwiML route can build one cohesive opening message.
 *
 * @param {string}   to      - E.164 phone number
 * @param {string}   userId  - MongoDB user _id
 * @param {object[]} dues    - Array of due documents { _id, title, amount, dueDate }
 */
exports.makeGroupVoiceCall = async (to, userId, dues = []) => {
    const duesPayload = dues.map(d => ({
        dueId:   String(d._id),
        title:   d.title,
        amount:  d.amount,
        dueDate: new Date(d.dueDate).toDateString(),
    }));

    const qs = new URLSearchParams({
        userId: String(userId),
        dues:   JSON.stringify(duesPayload),   // array of dues for the TwiML
    }).toString();

    const twimlUrl       = `${BASE_URL}/api/twilio/voice-twiml-group?${qs}`;
    const statusCallback = `${BASE_URL}/api/twilio/voice-status`;

    try {
        const call = await getClient().calls.create({
            to,
            from: FROM_SMS,
            url:                  twimlUrl,
            method:               'GET',
            statusCallback,
            statusCallbackMethod: 'POST',
            statusCallbackEvent:  ['initiated', 'ringing', 'answered', 'completed'],
        });
        console.log(`[Twilio Group Call] Initiated to ${to} for ${dues.length} due(s) — SID: ${call.sid}`);
        return call;
    } catch (err) {
        logTwilioError('Group Voice Call', err);
        throw err;
    }
};


// ─── High-level reminder dispatcher ────────────────────────────────────────

/**
 * Send the appropriate Twilio notification(s) based on reminderType:
 *
 *  UPCOMING_DUE  →  WhatsApp only
 *  DUE_TODAY     →  WhatsApp only
 *  OVERDUE       →  WhatsApp + outbound Voice Call
 *
 * Gracefully skips if no phone is on file or if credentials are missing.
 *
 * @param {object} params
 * @param {string} params.phone        - User phone in E.164 format
 * @param {object} params.due          - Due document from DB
 * @param {string} params.reminderType - 'UPCOMING_DUE' | 'DUE_TODAY' | 'OVERDUE'
 */
exports.sendDueReminder = async ({ phone, due, reminderType, userId }) => {
    if (!phone) return; // user has no phone — skip silently

    const dueDateStr  = new Date(due.dueDate).toDateString();
    const amountStr   = `$${due.amount}`;
    const title       = due.title;

    let message = '';
    switch (reminderType) {
        case 'UPCOMING_DUE':
            message = `📅 *Upcoming Payment Reminder*\nHi! Your due *"${title}"* of ${amountStr} is coming up on *${dueDateStr}*. Please ensure timely payment to avoid late fees.`;
            break;
        case 'DUE_TODAY':
            message = `⚠️ *Payment Due Today!*\nYour due *"${title}"* of ${amountStr} is due *today (${dueDateStr})*. Please make the payment immediately to avoid penalties.`;
            break;
        case 'OVERDUE':
            message = `🚨 *OVERDUE ALERT!*\nYour due *"${title}"* of ${amountStr} was due on *${dueDateStr}* and is now OVERDUE. Please settle this immediately to avoid further consequences.\n\nReply *PAID* if you've paid or *SNOOZE <days>* to postpone (e.g. SNOOZE 3).`;
            break;
        default:
            message = `Reminder: Your due "${title}" of ${amountStr} needs attention.`;
    }

    const results = { whatsapp: null, call: null };

    // ── WhatsApp (all reminder types) ──────────────────────────────────────
    try {
        results.whatsapp = await exports.sendWhatsApp(phone, message);
    } catch (err) {
        console.error(`[Twilio] WhatsApp failed for ${phone} (${reminderType}):`, err.message);
    }

    // ── Outbound voice call — OVERDUE only ─────────────────────────────────
    if (reminderType === 'OVERDUE') {
        try {
            results.call = await exports.makeVoiceCall(phone, {
                dueId:   String(due._id || ''),
                userId:  String(userId  || ''),
                title,
                amount:  due.amount,
                dueDate: dueDateStr,
            });
        } catch (err) {
            console.error(`[Twilio] Voice call failed for ${phone} (${reminderType}):`, err.message);
        }
    }

    return results;
};
