import React,{ useState, useEffect ,useRef} from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3004'); // Adjust the URL as needed

export default function VoiceAssistant({ userId }) {

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recognitionRef = useRef(null);

    const [isRecording, setIsRecording] = useState(false);
    const [replyMessage, setReplyMessage] = useState('');
    const [conversationId, setConversationId] = useState(null);
    const [conversationList, setConversationList] = useState([]);
    const [messages, setMessages] = useState([]);
    const [speechTranscript, setSpeechTranscript] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const historyKey = userId && conversationId ? `voiceAssistantHistory_${userId}_${conversationId}` : null;

    // Fetch conversations from backend and load first available
    useEffect(() => {
        if (!userId) return;

        const fetchConversations = async () => {
            setLoading(true);
            setError(null);
            try {
                const resp = await fetch(`http://localhost:3004/api/conversations?userId=${encodeURIComponent(userId)}`);
                if (!resp.ok) throw new Error(`Unable to load conversations ${resp.status}`);
                const convos = await resp.json();
                setConversationList(convos);
                if (convos.length > 0) {
                    await loadConversation(convos[0].conversationId);
                }
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchConversations();
    }, [userId]);

    // Persist messages to localStorage for conversation
    useEffect(() => {
        if (!historyKey) return;
        localStorage.setItem(historyKey, JSON.stringify(messages));
    }, [historyKey, messages]);

    // Rehydrate localStorage history on conversation change
    useEffect(() => {
        if (!historyKey) return;
        const saved = localStorage.getItem(historyKey);
        if (saved) {
            try {
                setMessages(JSON.parse(saved));
            } catch (err) {
                console.warn('Failed to parse saved history', err);
            }
        }
    }, [historyKey]);

    // Socket listener for assistant voice replies
    useEffect(() => {
        const onVoiceReply = (data) => {
            setReplyMessage(data.message);
            setMessages(prev => [...prev, {
                type: 'assistant',
                message: data.message,
                timestamp: new Date().toISOString(),
                audioBuffer: data.audioBuffer || null,
            }]);

            if (data.audioBuffer) {
                const blob = new Blob([new Uint8Array(data.audioBuffer)], { type: 'audio/mpeg' });
                const audio = new Audio(URL.createObjectURL(blob));
                audio.play();
            }
        };

        socket.on('voice-reply', onVoiceReply);
        return () => socket.off('voice-reply', onVoiceReply);
    }, []);

    const loadConversation = async (id) => {
        if (!userId || !id) return;

        setLoading(true);
        setError(null);
        try {
            const resp = await fetch(`http://localhost:3004/api/conversations/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`);
            if (!resp.ok) throw new Error(`Unable to load conversation ${resp.status}`);
            const conv = await resp.json();
            setConversationId(id);
            setMessages(conv.messages || []);
            setReplyMessage('');
            setSpeechTranscript('');
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const createConversation = async () => {
        if (!userId) {
            setError('userId required');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const resp = await fetch('http://localhost:3004/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            if (!resp.ok) throw new Error(`Unable to create conversation ${resp.status}`);
            const created = await resp.json();
            setConversationList(prev => [created, ...prev]);
            setConversationId(created.conversationId);
            setMessages([]);
            setReplyMessage('');
            setSpeechTranscript('');
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const setupSpeechRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return null;

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            const t = Array.from(event.results)
                .map(result => result[0].transcript)
                .join(' ');
            setSpeechTranscript(t);
        };

        recognition.onerror = (event) => {
            console.warn('Speech recognition error', event.error);
        };

        recognition.onend = () => {
            console.log('Speech recognition ended');
        };

        return recognition;
    };

    const startRecording = async () => {
        if (!conversationId) {
            setError('Please start or select a conversation first.');
            return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        const recognition = setupSpeechRecognition();
        if (recognition) {
            recognitionRef.current = recognition;
            recognition.start();
        }

        recorder.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };

        recorder.onstop = async () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }

            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const arrayBuffer = await audioBlob.arrayBuffer();

            const userMessage = speechTranscript || '[Voice message]';
            setMessages(prev => [...prev, {
                type: 'user',
                message: userMessage,
                transcript: speechTranscript,
                timestamp: new Date().toISOString(),
            }]);

            socket.emit('voice-message', {
                audioBuffer: Array.from(new Uint8Array(arrayBuffer)),
                userId,
                conversationId,
                transcript: speechTranscript,
            });

            try {
                await fetch(`http://localhost:3004/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, type: 'user', text: userMessage, transcript: speechTranscript, timestamp: new Date().toISOString() }),
                });
            } catch (err) {
                console.warn('Failed to persist message to backend', err);
            }
        };

        recorder.start();
        setIsRecording(true);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    };

    return (
        <div style={{ padding: 40 }}>
            <h2>Voice Assistant</h2>

            {loading && <p>Loading...</p>}
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}

            <div style={{ marginBottom: 12 }}>
                <button onClick={createConversation}>Create New Conversation</button>
                <select
                    value={conversationId || ''}
                    onChange={e => loadConversation(e.target.value)}
                    style={{ marginLeft: 12 }}
                >
                    <option value='' disabled>Select existing</option>
                    {conversationList.map(c => (
                        <option key={c.conversationId} value={c.conversationId}>{c.conversationId}</option>
                    ))}
                </select>
            </div>

            <p>User: {userId || 'anonymous'}</p>
            <p>Conversation: {conversationId || '[none]'}</p>

            <div style={{ marginBottom: 20, maxHeight: 260, overflowY: 'auto', border: '1px solid #ddd', padding: 10 }}>
                <h3>History</h3>
                {messages.length === 0 ? <small>No history yet.</small> : messages.map((msg, idx) => (
                    <div key={idx} style={{ marginBottom: 8, padding: 8, backgroundColor: msg.type === 'user' ? '#e3f2fd' : '#f3e5f5', borderRadius: 4 }}>
                        <strong>{msg.type === 'user' ? 'You' : 'Assistant'}:</strong> {msg.message}
                        <div><small>{new Date(msg.timestamp).toLocaleString()}</small></div>
                        {msg.transcript && <div><small>STT: {msg.transcript}</small></div>}
                    </div>
                ))}
            </div>

            <p><strong>Live STT:</strong> {speechTranscript || '...'}</p>
            <p><strong>Latest assistant:</strong> {replyMessage || '...'}</p>

            {!isRecording ? (
                <button onClick={startRecording} disabled={!conversationId}>Start Talking</button>
            ) : (
                <button onClick={stopRecording}>Stop Talking</button>
            )}
        </div>
    );
}
