const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    let responseText =
      response.data.candidates[0].content.parts[0].text || "";

    // Remove markdown code blocks if present
    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    return JSON.parse(responseText);
  } catch (err) {
    console.error(
      "Failed to parse intent detection response:",
      err.response?.data || err.message
    );
    throw new Error("Intent detection failed");
  }
};

/**
 * Detect intent from a spoken phone call transcript in the context of an overdue due reminder.
 *
 * @param {string} transcript  - Raw speech recognised by Twilio STT
 * @param {object} dueContext  - { title, amount, dueDate } of the overdue due
 * @returns {Promise<{intent: string, snoozeDays: number|null, replyMessage: string}>}
 *
 * Possible intents:
 *   confirm_paid    - User says they already paid
 *   will_pay_today  - User promises to pay today
 *   snooze          - User asks for more time (snoozeDays extracted from speech)
 *   dispute         - User disputes the charge / says the amount is wrong
 *   no_response     - Silence, unclear, or unrelated speech
 */
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
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 },
      },
      { headers: { "Content-Type": "application/json" } }
    );

    let raw = response.data.candidates[0].content.parts[0].text || "{}";
    raw = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(raw);

    // Sanitise
    const validIntents = ['confirm_paid', 'will_pay_today', 'snooze', 'dispute', 'no_response'];
    if (!validIntents.includes(parsed.intent)) {
      parsed.intent = 'no_response';
    }
    parsed.snoozeDays = typeof parsed.snoozeDays === 'number' ? parsed.snoozeDays : null;
    parsed.replyMessage = parsed.replyMessage || "Thank you for your response. Goodbye.";

    console.log(`[LLM Call Intent] transcript="${transcript.substring(0, 60)}" → intent=${parsed.intent}`);
    return parsed;
  } catch (err) {
    console.error("detectCallIntent failed:", err.response?.data || err.message);
    // Graceful fallback
    return {
      intent: 'no_response',
      snoozeDays: null,
      confidence: 'low',
      replyMessage: "Sorry, I could not understand your response. Please reply via WhatsApp or the app."
    };
  }
};