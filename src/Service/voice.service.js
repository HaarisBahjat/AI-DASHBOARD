const sttService = require("./stt.service");
const llmService = require("./llm.service");
const { textToSpeech } = require("./tts.service");

// TEMP TEST IMPLEMENTATION – bypass DB / session / dues logic
// Only used to verify audio -> STT -> TTS pipeline via socket.io
exports.processVoiceMessage = async ({ audioBuffer }) => {
  // 1) STT: audio -> text
  const text = await sttService.speechToText(audioBuffer);

  // 2) Build a simple reply
  const replyText = `You said: "${text}". This is a test reply without DB.`;

  // 3) TTS: reply text -> audio buffer
  const audioOut = await textToSpeech(replyText);

  // 4) Return what the socket handler expects
  return { message: replyText, audioBuffer: audioOut };
};
