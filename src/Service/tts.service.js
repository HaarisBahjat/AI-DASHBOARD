// NOTE: To switch back to ElevenLabs TTS, implement it here using env vars:
// const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
// const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
// const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';


const axios = require("axios");
const fs = require("fs");

const TTS_SERVICE_URL = process.env.TTS_SERVICE_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');

if (!TTS_SERVICE_URL) {
  throw new Error('TTS_SERVICE_URL is required in production');
}

// basic TTS service that can be swapped between different backends
// for now the code calls a local Piper server running on port 5000.  If
// you want to restore the original ElevenLabs implementation simply
// uncomment the earlier section at top of this file and adjust the
// constants.

async function textToSpeech(text) {
  try {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error("Text is required for TTS");
    }

    console.log(`Requesting TTS for text: ${text.substring(0, 50)}...`);

    const response = await axios.post(
      `${TTS_SERVICE_URL}/tts`,
      { text: text.trim() },
      {
        responseType: "arraybuffer", // important: get raw binary data
        headers: { "Content-Type": "application/json" },
        timeout: 30000 // 30 second timeout
      }
    );

    if (!response.data || response.data.length === 0) {
      throw new Error("TTS service returned empty audio data");
    }

    console.log(`TTS successful - received ${response.data.length} bytes of audio`);
    return Buffer.from(response.data);
  } catch (error) {
    console.error("Error calling Piper TTS API:", error.message);
    if (error.response?.status) {
      console.error("HTTP Status:", error.response.status);
      console.error("Response:", error.response.data?.toString() || "No response body");
    }
    throw new Error(`TTS failed: ${error.message}`);
  }
}

// CommonJS export so that require() consumers can destructure
module.exports = { textToSpeech };

