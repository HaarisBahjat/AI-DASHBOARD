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