/*// src/Service/tts.service.js
const axios = require("axios");

// Put these in a .env file (recommended) instead of hardcoding
const ELEVENLABS_API_KEY = "sk_64627d00df80f4749ae900c822e5b45dff79eac850fc6017";
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
};*/


const axios = require("axios");
const fs = require("fs");

// basic TTS service that can be swapped between different backends
// for now the code calls a local Piper server running on port 5000.  If
// you want to restore the original ElevenLabs implementation simply
// uncomment the earlier section at top of this file and adjust the
// constants.

async function textToSpeech(text) {
  try {
    const response = await axios.post(
      "http://localhost:5000/tts",
      { text },
      {
        responseType: "arraybuffer", // important: get raw binary data
        headers: { "Content-Type": "application/json" },
      }
    );

    // write a local file for debugging; callers only care about the buffer
    fs.writeFileSync("output.mp3", Buffer.from(response.data));
    console.log("Saved output.mp3");
    return Buffer.from(response.data);
  } catch (error) {
    console.error("Error calling Piper API:", error.message);
    throw error;
  }
}

// CommonJS export so that require() consumers can destructure
module.exports = { textToSpeech };

