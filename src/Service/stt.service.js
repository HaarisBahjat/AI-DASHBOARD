const axios = require('axios');
const formData = require('form-data');

const STT_SERVICE_URL = process.env.STT_SERVICE_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000');

if (!STT_SERVICE_URL) {
    throw new Error('STT_SERVICE_URL is required in production');
}

exports.speechToText = async (audioBuffer) => {
    try {
        // Validate that audioBuffer has content
        if (!audioBuffer || audioBuffer.length === 0) {
            throw new Error("Audio buffer is empty. No audio was captured.");
        }

        console.log('STT Service - Audio buffer size:', audioBuffer.length, 'bytes');
        
        const form = new formData();
        // Send with webm extension so FastAPI knows the format
        form.append('file', audioBuffer, {
            filename: 'audio.webm',
            contentType: 'audio/webm'
        });
        
        console.log(`Sending audio to transcription service at ${STT_SERVICE_URL}/transcribe`);
        const response = await axios.post(`${STT_SERVICE_URL}/transcribe`, form, {
            headers: form.getHeaders(),
            timeout: 60000 // 60 second timeout for transcription
        });
        
        if(response.status !== 200) {
            throw new Error(`Failed to transcribe audio: HTTP ${response.status}`);
        }
        
        if (response.data.error) {
            throw new Error(`Transcription error: ${response.data.error}`);
        }
        
        const text = response.data.text;
        if (!text) {
            throw new Error("Transcription service returned empty text. Please speak clearly.");
        }
        
        console.log('Transcription successful:', text.substring(0, 50) + '...');
        return text;
    }
    catch (err) {
        console.error('STT Error:', err.message);
        if (err.response?.data) {
            console.error('FastAPI Response:', err.response.data);
        }
        throw new Error(`Speech-to-text failed: ${err.message}`);
    }
};