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
                
                // Validate audio data
                if (!data.audioBuffer) {
                    throw new Error("No audio buffer provided");
                }
                
                if (!Array.isArray(data.audioBuffer)) {
                    throw new Error("Audio buffer must be an array");
                }
                
                console.log("Audio buffer length:", data.audioBuffer.length);
                console.log("Conversation ID:", data.conversationId);

                if (!authenticatedUserId) {
                    throw new Error("Socket authentication required");
                }
                
                if (data.audioBuffer.length === 0) {
                    throw new Error("Audio buffer is empty - no audio was recorded");
                }
                
                const result = await processVoiceMessage({
                    audioBuffer: Buffer.from(data.audioBuffer),
                    conversationId: data.conversationId,
                    userId: authenticatedUserId
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