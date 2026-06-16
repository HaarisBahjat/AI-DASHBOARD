/**
 * llm.service.js
 *
 * All Gemini calls are routed through gemini.limiter.js which enforces:
 *   - Sliding-window RPM cap (default 12/min, configurable via GEMINI_RPM_LIMIT)
 *   - Exponential backoff retry on 429s (default 3 attempts)
 *   - 30s hard timeout per request
 */

const { callGemini, extractText } = require('./gemini.limiter');

// Max conversation turns to include in the LLM prompt.
// Older turns are dropped to keep tokens bounded and latency consistent.
const MAX_HISTORY_TURNS = parseInt(process.env.CALL_HISTORY_TURNS || '6', 10);

// ─────────────────────────────────────────────────────────────────────────────
// detectIntent
// Used by the in-app voice chat (socket) to parse user messages.
// ─────────────────────────────────────────────────────────────────────────────
exports.detectIntent = async (text) => {
  const prompt = `
You are an intent detection system for a Dues Reminder app.

Extract intent and structured data. For dates, if the user says "tomorrow", calculate it from today's date. Always return dates in YYYY-MM-DD format.

Important: Always return intent in LOWERCASE. Valid intents are ONLY:
- create_due
- update_due
- delete_due
- list_dues
- general_chat

Return ONLY valid JSON in this format (all intent values must be lowercase):

{
  "intent": "create_due",
  "title": "",
  "description": "",
  "amount": null,
  "dueDate": "YYYY-MM-DD",
  "dueId": "",
  "category": ""
}

Today's date: ${new Date().toISOString().split('T')[0]}
Message:
"${text}"
`;

  try {
    const response = await callGemini(
      { contents: [{ role: 'user', parts: [{ text: prompt }] }] },
      { temperature: 0 }
    );
    return JSON.parse(extractText(response));
  } catch (err) {
    console.error('detectIntent failed:', err.response?.data || err.message);
    throw new Error('Intent detection failed');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// detectCallIntent
// Single-turn call intent (kept for backward compat; multi-turn uses conductCallTurn).
// ─────────────────────────────────────────────────────────────────────────────
exports.detectCallIntent = async (transcript, dueContext = {}) => {
  const { title = 'your payment', amount = '', dueDate = '' } = dueContext;

  const prompt = `
You are an AI assistant handling an automated phone call about an overdue payment.

Due context:
- Title: "${title}"
- Amount: $${amount}
- Original due date: ${dueDate}

The user just said (via phone speech recognition):
"${transcript}"

Your job: classify the user's intent and extract any relevant data.

Valid intents (return EXACTLY one):
- confirm_paid     → user says they already paid or it is done
- will_pay_today   → user commits to paying today or very soon (today/now/in a bit)
- snooze           → user asks for more time (extract number of days from speech; default 3 if vague)
- dispute          → user disputes the charge, says wrong amount, or doesn't owe this
- no_response      → unclear, silence, unrelated, or you cannot determine intent

Return ONLY valid JSON — no markdown, no extra text:
{
  "intent": "<one of the intents above>",
  "snoozeDays": <number or null>,
  "confidence": "<high|medium|low>",
  "replyMessage": "<a short, friendly spoken confirmation sentence to say back to the user>"
}

Rules for replyMessage:
- Keep it under 30 words
- Sound natural as spoken audio (no special characters, no markdown)
- For confirm_paid: thank them and say the record will be updated
- For will_pay_today: encourage them and say a reminder will fire if unpaid by evening
- For snooze: confirm the snooze period
- For dispute: apologise and say the team will review it
- For no_response: politely ask them to reply via WhatsApp or the app

Today's date: ${new Date().toISOString().split('T')[0]}
`;

  try {
    const response = await callGemini(
      { contents: [{ role: 'user', parts: [{ text: prompt }] }] },
      { temperature: 0.1 }
    );
    const parsed = JSON.parse(extractText(response));

    const validIntents = ['confirm_paid', 'will_pay_today', 'snooze', 'dispute', 'no_response'];
    if (!validIntents.includes(parsed.intent)) parsed.intent = 'no_response';
    parsed.snoozeDays = typeof parsed.snoozeDays === 'number' ? parsed.snoozeDays : null;
    parsed.replyMessage = parsed.replyMessage || 'Thank you for your response. Goodbye.';

    console.log(`[LLM Call Intent] transcript="${transcript.substring(0, 60)}" → intent=${parsed.intent}`);
    return parsed;
  } catch (err) {
    console.error('detectCallIntent failed:', err.response?.data || err.message);
    return {
      intent: 'no_response',
      snoozeDays: null,
      confidence: 'low',
      replyMessage: 'Sorry, I could not understand your response. Please reply via WhatsApp or the app.'
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// conductCallTurn — multi-turn call brain
//
// Called after every user speech turn with the FULL conversation history.
// Gemini decides: ask a follow-up (action='continue') or take action (action='end').
//
// OPTIMISATIONS APPLIED:
//   1. History trimming — only last MAX_HISTORY_TURNS turns sent to Gemini.
//      Keeps tokens bounded as conversations grow. Older turns are dropped.
//   2. Rate limiting — via callGemini() wrapper (sliding window + retry).
// ─────────────────────────────────────────────────────────────────────────────
exports.conductCallTurn = async (turns, dueContext = {}, forceEnd = false) => {
  const { title = 'your payment', amount = '', dueDate = '' } = dueContext;

  // ── Trim history to keep prompt size bounded ─────────────────────────────
  // Always keep the LAST N turns. First AI opening is always included
  // by the cron, but old middle turns are dropped if the call runs long.
  const trimmedTurns = turns.length > MAX_HISTORY_TURNS
    ? [turns[0], ...turns.slice(-MAX_HISTORY_TURNS + 1)] // keep opening + recents
    : turns;

  const historyText = trimmedTurns
    .map(t => `${t.role === 'ai' ? 'AI' : 'USER'}: ${t.text}`)
    .join('\n');

  const prompt = `
You are an AI payment reminder agent conducting a live phone call.

OVERDUE DUE CONTEXT:
- Title: "${title}"
- Amount: $${amount}
- Due date: ${dueDate}

CONVERSATION SO FAR:
${historyText}

${forceEnd ? 'IMPORTANT: Maximum turns reached. You MUST end the call now with a polite wrap-up.' : ''}

YOUR TASK:
Based on the conversation, decide your next move.

If the user's intent is CLEAR and you can take an action → return action="end"
If the user is vague, asked a question, or needs clarification → return action="continue" with a follow-up

VALID END INTENTS:
- confirm_paid     → user says they already paid
- will_pay_today   → user commits to pay today/now/soon
- snooze           → user wants more time (extract days — default 3 if vague)
- dispute          → user disputes the charge or amount
- no_response      → still unclear after conversation, or forced end

RULES FOR reply (spoken aloud on a phone call):
- MAX 35 words — keep it SHORT, natural speech
- No special characters, no asterisks, no markdown
- Sound warm, professional, not robotic
- For continue: ask ONE clear focused follow-up question
- For end: confirm the outcome in one sentence

Return ONLY this JSON — no markdown, no extra text:
{
  "action": "continue" or "end",
  "reply": "<what the AI says next — 35 words max>",
  "intent": "<only include when action=end>",
  "snoozeDays": <number or null — only when intent=snooze>
}

Today's date: ${new Date().toISOString().split('T')[0]}
`;

  try {
    const response = await callGemini(
      { contents: [{ role: 'user', parts: [{ text: prompt }] }] },
      { temperature: 0.2 }
    );
    const parsed = JSON.parse(extractText(response));

    if (!['continue', 'end'].includes(parsed.action)) parsed.action = 'end';

    const validIntents = ['confirm_paid', 'will_pay_today', 'snooze', 'dispute', 'no_response'];
    if (parsed.action === 'end') {
      if (!validIntents.includes(parsed.intent)) parsed.intent = 'no_response';
      parsed.snoozeDays = typeof parsed.snoozeDays === 'number' ? parsed.snoozeDays : null;
    }

    if (!parsed.reply || typeof parsed.reply !== 'string') {
      parsed.reply = parsed.action === 'end'
        ? 'Thank you for your response. We will update your records. Goodbye.'
        : 'Could you please clarify what you would like to do with this payment?';
    }

    console.log(
      `[LLM Turn] action=${parsed.action}` +
      `${parsed.intent ? ` intent=${parsed.intent}` : ''}` +
      ` reply="${parsed.reply.substring(0, 60)}"`
    );
    return parsed;

  } catch (err) {
    console.error('[conductCallTurn] LLM error:', err.response?.data || err.message);
    return {
      action: 'end',
      intent: 'no_response',
      snoozeDays: null,
      reply: 'We were unable to process your response. Please contact us via the app or WhatsApp. Goodbye.'
    };
  }
};