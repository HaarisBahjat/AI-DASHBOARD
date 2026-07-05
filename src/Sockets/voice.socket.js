const {processVoiceMessage} = require('../Service/voice.service');
const jwt = require('jsonwebtoken');

// [G] Read JWT secret from env — must match auth.controller and auth middleware
const SECRET_KEY = process.env.JWT_SECRET || 'fallback_dev_secret';


module.exports = (io) => {
    io.on('connection', (socket) => {
        // Attempt to authenticate socket connection using token from handshake auth
        try {
            const authToken = socket.handshake?.auth?.token;
            if (authToken) {
                const decoded = jwt.verify(authToken, SECRET_KEY);
                if (decoded?.userId) {
                    socket.join(`user:${decoded.userId}`);
                    socket.data.userId = String(decoded.userId);
                }
            }
        } catch (err) {
            console.warn('Socket auth parse failed:', err.message);
        }

        console.log('A user connected: ' + socket.id);
        socket.on('voice-message', async (data) => {
               
            try {
                console.log("Voice message received");
                const authenticatedUserId = socket.data.userId;
                
                // Validate audio data or transcript
                const hasAudio = data.audioBuffer && Array.isArray(data.audioBuffer) && data.audioBuffer.length > 0;
                const hasTranscript = data.transcript && typeof data.transcript === 'string' && data.transcript.trim() !== '';

                if (!hasAudio && !hasTranscript) {
                    throw new Error("No audio or speech captured. Please check your microphone.");
                }
                
                console.log("Audio buffer length:", hasAudio ? data.audioBuffer.length : 0);
                console.log("Conversation ID:", data.conversationId);

                if (!authenticatedUserId) {
                    throw new Error("Socket authentication required");
                }
                
                const result = await processVoiceMessage({
                    audioBuffer: hasAudio ? Buffer.from(data.audioBuffer) : Buffer.alloc(0),
                    conversationId: data.conversationId,
                    userId: authenticatedUserId,
                    fallbackText: data.transcript || ''
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