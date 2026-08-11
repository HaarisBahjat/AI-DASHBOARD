/**
 * src/Sockets/voice.socket.js
 *
 * WHAT THIS FILE DOES:
 *   Handles Socket.io 'voice-message' events from the frontend.
 *   Routes each message through the LangGraph Multi-Agent StateGraph.
 *
 * HOW IT CONNECTS TO THE AGENT SYSTEM:
 *   1. Frontend emits: socket.emit('voice-message', { audioBuffer, transcript, conversationId })
 *   2. This handler receives it, authenticates the user via JWT
 *   3. Calls agentGraph.invoke() — runs all 5 nodes (entityResolver → riskProfiler
 *      → negotiator → complianceGuard/humanApproval → actionDispatcher)
 *   4. agentGraph returns finalState with { replyText, audioBuffer, negotiationOutcome }
 *   5. This handler emits: socket.emit('voice-reply', { message, audioBuffer })
 *   6. Frontend receives it, shows text in chat and plays audio
 *
 * STT PIPELINE:
 *   If audioBuffer is sent, we run Whisper STT first to get userText.
 *   If transcript is sent (browser SpeechRecognition fallback), we use that.
 *   The resulting userText is what the agent graph processes.
 *
 * FALLBACK:
 *   If agentGraph fails (e.g. LangGraph package issue), we fall back to
 *   the legacy processVoiceMessage from voice.service.js.
 */

const { agentGraph } = require('../agent/graph');
const { processVoiceMessage } = require('../Service/voice.service');
const sttService = require('../Service/stt.service');
const { textToSpeech } = require('../Service/tts.service');
const jwt = require('jsonwebtoken');
const { HumanMessage } = require('@langchain/core/messages');

const SECRET_KEY = process.env.JWT_SECRET || 'fallback_dev_secret';

module.exports = (io) => {
    io.on('connection', (socket) => {
        // STEP 1: Authenticate the socket connection via JWT.
        // The frontend passes the auth token in socket.handshake.auth.token.
        // We decode it to get userId and store it on socket.data.userId.
        // Every subsequent event on this socket uses this userId.
        try {
            const authToken = socket.handshake?.auth?.token;
            if (authToken) {
                const decoded = jwt.verify(authToken, SECRET_KEY);
                if (decoded?.userId) {
                    // Join a private room keyed by userId so the server can
                    // emit targeted events (e.g. HITL alerts) to this user only.
                    socket.join(`user:${decoded.userId}`);
                    socket.data.userId = String(decoded.userId);
                }
            }
        } catch (err) {
            console.warn('Socket auth parse failed:', err.message);
        }

        console.log('Socket connected:', socket.id);

        socket.on('voice-message', async (data) => {
            try {
                const userId = socket.data.userId;
                if (!userId) throw new Error('Socket authentication required. Please refresh.');

                const hasAudio      = data.audioBuffer && Array.isArray(data.audioBuffer) && data.audioBuffer.length > 0;
                const hasTranscript = data.transcript && typeof data.transcript === 'string' && data.transcript.trim() !== '';

                if (!hasAudio && !hasTranscript) {
                    throw new Error('No audio or speech captured. Please check your microphone or type a message.');
                }

                // STEP 2: Convert audio → text (STT pipeline).
                // Priority: Whisper STT (server-side) → browser SpeechRecognition fallback
                let userText = '';
                if (hasAudio) {
                    try {
                        userText = await sttService.speechToText(Buffer.from(data.audioBuffer));
                    } catch (sttErr) {
                        console.warn('[STT] Whisper failed, using transcript fallback:', sttErr.message);
                    }
                }
                if (!userText && hasTranscript) {
                    userText = data.transcript.trim();
                }
                if (!userText) {
                    throw new Error("I didn't catch that. Could you speak a bit louder or type your message?");
                }

                // STEP 3: Route through LangGraph Multi-Agent Graph.
                // The thread_id is the conversationId — MemorySaver uses it to
                // recall previous turns of this same conversation.
                const threadId = data.conversationId || ('socket-' + userId + '-' + Date.now());

                let finalState;
                try {
                    finalState = await agentGraph.invoke(
                        {
                            userId,
                            conversationId: data.conversationId || null,
                            userText,
                            messages: [new HumanMessage(userText)],
                        },
                        { configurable: { thread_id: threadId } }
                    );
                } catch (graphErr) {
                    // Check if this is a GraphInterrupt (HITL pause)
                    if (graphErr.name === 'GraphInterrupt' || (graphErr.message && graphErr.message.toLowerCase().includes('interrupt'))) {
                        // Notify the business owner's browser session about the approval request
                        io.to(`user:${userId}`).emit('hitl-approval-required', {
                            threadId,
                            message: 'An owner approval is required to proceed.',
                        });
                        socket.emit('voice-reply', {
                            message: 'I have sent an approval request to the business owner. Please wait for their response.',
                            audioBuffer: null,
                        });
                        return;
                    }

                    // For other graph errors, fall back to legacy processVoiceMessage
                    console.warn('[VoiceSocket] LangGraph failed, falling back to legacy:', graphErr.message);
                    const legacyResult = await processVoiceMessage({
                        audioBuffer: hasAudio ? Buffer.from(data.audioBuffer) : Buffer.alloc(0),
                        conversationId: data.conversationId,
                        userId,
                        fallbackText: userText,
                    });
                    socket.emit('voice-reply', legacyResult);
                    return;
                }

                // STEP 4: Emit result back to the frontend.
                // The frontend's voice-reply listener shows the message in chat
                // and plays the audioBuffer via the browser Audio API.
                socket.emit('voice-reply', {
                    message: finalState.replyText || 'Done.',
                    audioBuffer: finalState.audioBuffer || null,
                });

            } catch (error) {
                console.error('Voice socket error:', error.message);
                socket.emit('voice-reply', {
                    message: 'Something went wrong: ' + error.message,
                    audioBuffer: null,
                });
            }
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected:', socket.id);
        });
    });
};