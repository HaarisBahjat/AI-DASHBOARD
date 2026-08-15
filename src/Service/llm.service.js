/**
 * llm.service.js
 *
 * All Gemini calls are routed through gemini.limiter.js which enforces:
 *   - Sliding-window RPM cap (default 12/min, configurable via GEMINI_RPM_LIMIT)
 *   - Exponential backoff retry on 429s (default 3 attempts)
 *   - 30s hard timeout per request
 */

const { callGemini, callGeminiWithTools, extractText, extractFunctionCall } = require('./gemini.limiter');

// Max conversation turns to include in the LLM prompt.
// Older turns are dropped to keep tokens bounded and latency consistent.
const MAX_HISTORY_TURNS = parseInt(process.env.CALL_HISTORY_TURNS || '6', 10);

// ─────────────────────────────────────────────────────────────────────────────
// INTENT TOOL DEFINITIONS
// Gemini Function Calling schema for all 12 supported intents.
// mode: 'ANY' forces Gemini to always call one of these — never free text.
// This eliminates JSON.parse, hallucinated customer names, and broken responses.
// ─────────────────────────────────────────────────────────────────────────────
const INTENT_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'create_due',
        description: 'Create a new invoice or due for a customer.',
        parameters: {
          type: 'OBJECT',
          properties: {
            customerName: { type: 'STRING', description: 'Name of the customer or business this due belongs to (e.g. "Rahul", "Sharma Traders"). Leave empty if not mentioned.' },
            title:        { type: 'STRING', description: 'Bill or invoice title describing the item/service (e.g. "Rent", "Electricity", "Consulting"). Never put the customer name here.' },
            description:  { type: 'STRING', description: 'Optional extra description of the bill.' },
            amount:       { type: 'NUMBER', description: 'Total numerical bill amount in rupees as a positive number (e.g. 5000).' },
            dueDate:      { type: 'STRING', description: 'Due date in YYYY-MM-DD format. Resolve relative dates like "tomorrow" or "next Friday" from today.' },
            category:     { type: 'STRING', description: 'Category: utilities | shopping | food | entertainment | general. Default: general.' },
          },
          required: ['title', 'amount', 'dueDate'],
        },
      },
      {
        name: 'update_due',
        description: 'Update fields of an existing invoice or due.',
        parameters: {
          type: 'OBJECT',
          properties: {
            dueId:        { type: 'STRING', description: 'MongoDB _id of the due to update, if known.' },
            customerName: { type: 'STRING', description: 'Customer name to look up the due if dueId is unknown.' },
            title:        { type: 'STRING', description: 'New title for the due.' },
            amount:       { type: 'NUMBER', description: 'New exact amount in rupees.' },
            dueDate:      { type: 'STRING', description: 'New due date in YYYY-MM-DD format.' },
            category:     { type: 'STRING', description: 'New category.' },
          },
          required: [],
        },
      },
      {
        name: 'delete_due',
        description: 'Delete an existing invoice or due.',
        parameters: {
          type: 'OBJECT',
          properties: {
            title:        { type: 'STRING', description: 'Title of the due to delete.' },
            customerName: { type: 'STRING', description: 'Customer name to narrow down which due to delete.' },
          },
          required: [],
        },
      },
      {
        name: 'list_dues',
        description: 'List dues or invoices. Can filter by customer name or status.',
        parameters: {
          type: 'OBJECT',
          properties: {
            customerName:  { type: 'STRING', description: 'Filter dues for a specific customer name.' },
            statusFilter:  { type: 'STRING', description: 'Filter by status: unpaid | overdue | paid | all. Default: unpaid.' },
          },
          required: [],
        },
      },
      {
        name: 'sum_dues',
        description: 'Calculate the total sum/balance of all active outstanding dues.',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
      },
      {
        name: 'top_upcoming',
        description: 'Get the top N upcoming dues sorted by due date.',
        parameters: {
          type: 'OBJECT',
          properties: {
            topK: { type: 'NUMBER', description: 'Number of upcoming dues to return. Default: 3.' },
          },
          required: [],
        },
      },
      {
        name: 'get_customer_info',
        description: 'Get details about a specific customer including outstanding invoices and balance.',
        parameters: {
          type: 'OBJECT',
          properties: {
            customerName: { type: 'STRING', description: 'Name of the customer to look up.' },
          },
          required: ['customerName'],
        },
      },
      {
        name: 'list_customers',
        description: 'List all customer contacts and their balances.',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
      },
      {
        name: 'call_customer',
        description: 'Trigger an automated voice call or follow-up for a customer.',
        parameters: {
          type: 'OBJECT',
          properties: {
            customerName: { type: 'STRING', description: 'Name of the customer to call.' },
          },
          required: ['customerName'],
        },
      },
      {
        name: 'confirm_paid',
        description: 'Record that a customer has paid a bill — either full payment or a partial installment amount.',
        parameters: {
          type: 'OBJECT',
          properties: {
            customerName:  { type: 'STRING', description: 'Name of the customer who made the payment. Optional if clear from context.' },
            dueTitle:      { type: 'STRING', description: 'Title of the specific bill/invoice being paid (e.g. "Rent", "Electricity").' },
            paymentAmount: { type: 'NUMBER', description: 'The exact numerical amount PAID in this transaction in rupees (e.g. 2000). If the entire bill is paid in full without partial amount, leave null.' },
          },
          required: [],
        },
      },
      {
        name: 'financial_advice',
        description: 'Provide financial advice, budgeting tips, or bill prioritization suggestions.',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
      },
      {
        name: 'general_chat',
        description: 'Fallback for any general conversational message or greetings.',
        parameters: { type: 'OBJECT', properties: {}, required: [] },
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// detectIntent
// Converts raw user text into a structured intent object using Gemini
// Function Calling. Gemini is FORCED (mode: ANY) to call one of the 12
// declared functions — no free-text JSON, no hallucinated fields.
//
// Returns: { intent, customerName?, title?, amount?, dueDate?, ... }
// ─────────────────────────────────────────────────────────────────────────────
exports.detectIntent = async (text) => {
  const systemPrompt = `You are a precise financial intent detection assistant for a Dues and Invoices Reminder app.
Today's date: ${new Date().toISOString().split('T')[0]}

STRICT EXTRACTION RULES:
1. NUMBERS & AMOUNTS:
   - Extract exact numbers as positive numbers (e.g. "5000", "2000.50").
   - For "confirm_paid": extract "paymentAmount" as the actual money paid/given by the user in this payment.
   - For "create_due": extract "amount" as the total bill amount.
2. CUSTOMER VS TITLE:
   - "customerName" is always the person or company name (e.g., "for Rahul" -> customerName: "Rahul").
   - "title" is the item, invoice, or service (e.g., "Rent bill", "Electricity", "Invoice #101").
   - NEVER confuse customer name with title.
3. DATES:
   - Resolve relative dates like "tomorrow", "next Monday", "in 3 days" to exact YYYY-MM-DD.
4. INTENT CLASSIFICATION:
   - If user claims they paid, settled, or made a partial payment -> call "confirm_paid".
   - If user asks how much they owe in total -> call "sum_dues".
   - If user asks for list of invoices/bills -> call "list_dues".
   - If user asks about a customer's balance -> call "get_customer_info".
   - If user wants to create a new invoice -> call "create_due".
   - Default to "general_chat" if none apply.`;

  try {
    const response = await callGeminiWithTools(
      {
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + '\n\nUser message: "' + text + '"' }] },
        ],
      },
      INTENT_TOOLS,
      { temperature: 0 }
    );

    const fnCall = extractFunctionCall(response);

    if (!fnCall) {
      console.warn('[detectIntent] No function call returned by Gemini. Falling back to general_chat.');
      return { intent: 'general_chat' };
    }

    const intent = fnCall.name;
    const args   = fnCall.args;

    console.log('[LLM] Function call:', intent, args);

    return { intent, ...args };

  } catch (err) {
    console.error('[detectIntent] Gemini Function Call failed:', err.response?.data || err.message);
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