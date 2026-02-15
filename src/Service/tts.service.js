// src/Service/tts.service.js
const axios = require("axios");

// Put these in a .env file (recommended) instead of hardcoding
const ELEVENLABS_API_KEY = "sk_da1683e0379799e703e42ada18e973a6fa7a077f03f48c4b";
const ELEVENLABS_VOICE_ID =  "21m00Tcm4TlvDq8ikWAM";
// Your current error is because eleven_monolingual_v2 is not available on your account.
// This default is broadly available; override with ELEVENLABS_MODEL_ID if needed.
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

if (!ELEVENLABS_API_KEY) {
  console.warn("[tts] Missing ELEVENLABS_API_KEY env var. Voice TTS will fail until you set it.");
}

exports.textToSpeech = async (text) => {
  try {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`;

    const response = await axios.post(
      url,
      {
        text,
        model_id: ELEVENLABS_MODEL_ID,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      {
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg"
        },
        responseType: "arraybuffer",
        timeout: 60_000
      }
    );

    // Return raw audio buffer to be written as .mp3
    return Buffer.from(response.data);
  } catch (err) {
    const body =
      err.response?.data && Buffer.isBuffer(err.response.data)
        ? err.response.data.toString("utf8")
        : err.response?.data || err.message;
    console.error("TTS Error (HTTP):", body);
    throw err;
  }
};
