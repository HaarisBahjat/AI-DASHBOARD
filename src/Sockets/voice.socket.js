const { audio } = require('@elevenlabs/elevenlabs-js/api/resources/dubbing');
const {processVoiceMessage} = require('../Service/voice.service');
module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('A user connected: ' + socket.id);
        socket.on('voice-message', async (data) => {
               
            try {
                console.log("Voice message received");
                console.log("Audio size:", data.audioBuffer.length);
                const result = await processVoiceMessage({
                    audioBuffer: Buffer.from(data.audioBuffer),
                    conversationId: data.conversationId,
                    userId: data.userId
                });
                socket.emit('voice-reply', result);
            }
            catch (error) {
                console.error("Voice processing error:", error);
                socket.emit('voice-reply', {
                    message: "Something went wrong: " + error.message,
                    audioBuffer: null
                });
            }
        });
        socket.on('disconnect', () => {
            console.log('User disconnected: ' + socket.id);
        });
    });
};