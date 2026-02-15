const axios = require('axios');
const formData = require('form-data');




exports.speechToText = async (audioBuffer) => {
    try {
        const form = new formData();
        form.append('file', audioBuffer, {
            filename: 'audio.mp3',
            contentType: 'audio/mpeg'
        });
        const response = await axios.post('http://localhost:8000/transcribe', form, {
            headers: form.getHeaders(),
           
        });
        if(response.status !== 200) {
            throw new Error(`Failed to transcribe audio: ${response.status}`);
        }
        return response.data.text;
    }
    catch (err) {
        console.error('STT Error:', err.message);
        throw err;
    }
};