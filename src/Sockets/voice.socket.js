const { audio } = require('@elevenlabs/elevenlabs-js/api/resources/dubbing');
const {processVoiceMessage} = require('../Service/voice.service');
module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('A user connected: ' + socket.id);
        socket.on('voice-message', async (data) => {
               
            try {
                console.log("Voice message received");
                
                // Validate audio data
                if (!data.audioBuffer) {
                    throw new Error("No audio buffer provided");
                }
                
                if (!Array.isArray(data.audioBuffer)) {
                    throw new Error("Audio buffer must be an array");
                }
                
                console.log("Audio buffer length:", data.audioBuffer.length);
                console.log("User ID:", data.userId);
                console.log("Conversation ID:", data.conversationId);
                
                if (data.audioBuffer.length === 0) {
                    throw new Error("Audio buffer is empty - no audio was recorded");
                }
                
                const result = await processVoiceMessage({
                    audioBuffer: Buffer.from(data.audioBuffer),
                    conversationId: data.conversationId,
                    userId: data.userId
                });
                socket.emit('voice-reply', result);
            }
            catch (error) {
                console.error("Voice processing error:", error.message);
                console.error("Full error:", error);
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