const {processVoiceMessage} = require('../Service/voice.service');
module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('A user connected: ' + socket.id);
        socket.on('voice-message', async (data) => {

            try {
                const {audioBuffer, userId, conversationId  } = data;
                socket.emit('transcription-started', {message: 'Transcription started'});
                const result = await processVoiceMessage ({audioBuffer: Buffer.from(audioBuffer), userId, conversationId});

                socket.emit('transcription-completed', {message: result.message,
                    audioBuffer: result.audioBuffer
                });

            } catch (error) {
                console.error('Error processing voice message:', error);
                socket.emit('transcription-error', {error: 'Failed to process voice message'});
            }
        });
        socket.on('disconnect', () => {
            console.log('User disconnected: ' + socket.id);
        });
    });
};

