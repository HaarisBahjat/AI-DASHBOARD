const {GoogleGenerativeAI} = require('@google/generative-ai');  
const genAi= new GoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY
});
const model = genAi.getGenerativeModel({
    model: 'models/gemini-2.5-flash'
});

exports.detectIntent=async(text)=>{
    const prompt = `
You are an intent detection system for a Dues Reminder app.

Extract intent and structured data.

Return ONLY valid JSON in this format:

{
  "intent": "CREATE_DUE | UPDATE_DUE | DELETE_DUE | LIST_DUES | GENERAL_CHAT",
  "title": "",
  "amount": null,
  "dueDate": "",
  "category": ""
}

Message:
"${text}"
`;
const result = await model.generateContent({
    contents: [
        { role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0,
        }
});
const responseText = result.response.text();
try {
    return JSON.parse(responseText);
}catch (err) {    console.error("Failed to parse intent detection response as JSON:", err, "Response text was:", responseText);
    throw new Error("Intent detection failed: Invalid response format");
}
};