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
You are an intelligent intent detection and financial assistant system for a Dues Reminder app.

Extract intent and structured data. For dates, if the user says "tomorrow", calculate it from today's date. Always return dates in YYYY-MM-DD format.

Important: Always return intent in LOWERCASE. Valid intents are ONLY:
- create_due
- update_due
- delete_due
- list_dues
- sum_dues
- top_upcoming
- get_customer_info
- list_customers
- call_customer
- confirm_paid
- financial_advice
- general_chat

When creating a due (intent: "create_due"):
- If the user specifies a customer name (e.g. "for Rajesh Traders", "customer Sharma"), extract it as customerName.
- If the user specifies an item/bill title (e.g. "title entertainment", "Rent bill", "Electricity"), extract it as title.
- Do NOT mix up title and customerName.

If the user claims they paid a bill (e.g. "I paid 1000 rupees", "Paid 500 for the electricity bill", "I already paid this") → use "confirm_paid" and extract paymentAmount if mentioned.
If the user asks about a specific customer (e.g. "Who is Rajesh Traders?", "Tell me about Rajesh Traders", "Show info for Sharma Electronics") → use "get_customer_info" and extract customerName.
If the user asks for dues/invoices, asks if a due/bill is still there, or checks bill status (e.g. "is the due still there", "is the bill pending", "give me dues of customer named haarismalick", "show dues for Rajesh Traders", "invoices of Sharma") → use "list_dues".
If the user asks to list all customers (e.g. "Show my customers", "List customers") → use "list_customers".
If the user asks to call or follow up with a customer (e.g. "Call Rajesh Traders", "Trigger follow up for Sharma Electronics") → use "call_customer" and extract customerName.
If the user asks for the total sum, balance, or how much they owe in total → use "sum_dues".
If the user asks for top upcoming, urgent, or next N bills → use "top_upcoming" and extract topK (default 3).
If the user asks for financial suggestions, budgeting tips, which bill to prioritize paying, or advice → use "financial_advice".

Return ONLY valid JSON in this format (all intent values must be lowercase):

{
  "intent": "create_due",
  "customerName": "",
  "title": "",
  "description": "",
  "amount": null,
  "dueDate": "YYYY-MM-DD",
  "dueId": "",
  "category": "",
  "topK": 3,
  "paymentAmount": null
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
- For confirm_paid: thank them and say our team will verify the payment within 1 to 2 days. Do NOT say the record has been marked paid.
- For will_pay_today: acknowledge the promise and say we will follow up tomorrow if the payment has not arrived. Do NOT say the record has been updated.
- For snooze: confirm the snooze period
- For dispute: apologise and say the team will review it
- For no_response: politely ask them to reply via WhatsApp or the app

CRITICAL INSTRUCTION: You MUST ALWAYS respond in clear, professional English regardless of the language of the input transcript.
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
- CRITICAL: You MUST ALWAYS respond in clear, professional English regardless of what language the user appears to be speaking.
- Sound warm, professional, not robotic
- For continue: ask ONE clear focused follow-up question
- For end with will_pay_today: say you will follow up tomorrow if payment has not arrived. Do NOT say record has been updated.
- For end with confirm_paid: say the team will verify the payment in 1 to 2 days. Do NOT say the record is now marked paid.
- For end with snooze/dispute: confirm the outcome in one sentence

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

exports.generateFinancialInsight = async (userPrompt, duesList = []) => {
  const duesSummary = duesList.length > 0 
    ? duesList.map(d => `- ${d.title}: Rs.${d.amount} due ${new Date(d.dueDate).toLocaleDateString()} (${d.category || 'general'})`).join('\n')
    : 'No dues currently recorded.';

  const prompt = `
You are a financial advisor. CRITICAL: You MUST NEVER hallucinate or invent any bills, amounts, dates, or company names.

User's Current Dues (ONLY these bills exist):
${duesSummary}

User Question:
"${userPrompt}"

Rules:
1. ONLY reference bills listed above. NO EXCEPTIONS.
2. If asked about bills not in the list, say "I don't see that bill in your records."
3. Do NOT invent amounts, dates, or company names.
4. Keep response under 50 words for voice audio.
5. Use Rs. for currency (not $).
6. If no dues exist, say: "You have no recorded dues at the moment."
7. If user mentions a customer/company name not found, do NOT make up a bill. Say: "I don't have a bill for [name] in your records."

Respond in clear professional English.`;

  try {
    const response = await callGemini(
      { contents: [{ role: 'user', parts: [{ text: prompt }] }] },
      { temperature: 0.2 }  // Lower = less hallucination
    );
    return extractText(response).trim();
  } catch (err) {
    console.error('generateFinancialInsight failed:', err.message);
    // Safe fallback without any hallucination
    if (duesList.length === 0) {
      return "You have no recorded dues at the moment. Create a new invoice to start tracking.";
    }
    const totalDue = duesList.reduce((s, d) => s + (d.amount || 0), 0);
    return "You have Rs." + totalDue.toFixed(2) + " total outstanding. I recommend paying the oldest bills first to avoid late fees.";
  }
};

exports.scanReceiptImage = async (imageBase64, mimeType = 'image/png') => {
  const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
  const prompt = `
You are an expert financial OCR and bill extraction AI assistant.
Examine this receipt, invoice, or bill image carefully.
Extract the following details:
1. title (e.g. "Amazon Purchase", "Electricity Utility Bill", "Starbucks Coffee")
2. amount (exact numerical total due or paid, e.g. 45.99 as a number)
3. dueDate (in YYYY-MM-DD format. If no due date is listed on the receipt, estimate or use receipt date + 14 days, or today + 7 days)
4. category (e.g. "utilities", "shopping", "food", "entertainment", "general")
5. vendor (the store or company name)
6. confidence ("high", "medium", or "low")
7. summary (a 1-sentence summary of what this bill/receipt is for)

Return ONLY valid JSON in this exact format (no markdown, no backticks, no extra text):
{
  "title": "Amazon Purchase",
  "amount": 45.99,
  "dueDate": "${new Date(Date.now() + 7*86400000).toISOString().split('T')[0]}",
  "category": "shopping",
  "vendor": "Amazon",
  "confidence": "high",
  "summary": "Order for office supplies and electronics."
}
`;

  try {
    const response = await callGemini(
      {
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { data: base64Data, mimeType } }
            ]
          }
        ]
      },
      { temperature: 0.1 }
    );
    return JSON.parse(extractText(response));
  } catch (err) {
    console.error('scanReceiptImage failed:', err.response?.data || err.message);
    throw new Error('AI Vision scanning failed: ' + (err.message || 'unknown error'));
  }
};