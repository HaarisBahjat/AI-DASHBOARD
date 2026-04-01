import React,{ useState, useEffect ,useRef} from 'react';
import { io } from 'socket.io-client';
import './VoiceAssistant.css';

const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const normalizeMessages = (items = []) => {
    return items.map((item) => {
        const role = (item.roles || item.type || '').toUpperCase();
        return {
            type: role === 'USER' ? 'user' : role === 'SYSTEM' ? 'assistant' : (item.type || 'assistant'),
            message: item.message,
            timestamp: item.createdAt || item.timestamp || new Date().toISOString(),
            transcript: item.transcript || '',
        };
    });
};

const upsertConversation = (list, nextConversation) => {
    const nextId = nextConversation.conversationId || nextConversation._id;
    const withoutCurrent = list.filter((item) => (item.conversationId || item._id) !== nextId);
    return [nextConversation, ...withoutCurrent];
};

export default function VoiceAssistant({ userId, profile: _profile }) {

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recognitionRef = useRef(null);
    const socketRef = useRef(null);

    const [isRecording, setIsRecording] = useState(false);
    const [replyMessage, setReplyMessage] = useState('');
    const [conversationId, setConversationId] = useState(null);
    const [conversationList, setConversationList] = useState([]);
    const [messages, setMessages] = useState([]);
    const [speechTranscript, setSpeechTranscript] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [voiceStepHint, setVoiceStepHint] = useState('');

    const historyKey = userId && conversationId ? `voiceAssistantHistory_${userId}_${conversationId}` : null;

    // Fetch conversations from backend and load first available
    useEffect(() => {
        if (!userId) return;

        const fetchConversations = async () => {
            setLoading(true);
            setError(null);
            try {
                const resp = await fetch('http://localhost:3004/api/conversations', {
                    headers: getAuthHeaders(),
                });
                if (!resp.ok) throw new Error(`Unable to load conversations ${resp.status}`);
                const convos = await resp.json();
                setConversationList(convos);
                if (convos.length > 0) {
                    await loadConversation(convos[0].conversationId || convos[0]._id);
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

    // Socket lifecycle for assistant voice replies
    useEffect(() => {
        if (!userId) return;

        const authToken = localStorage.getItem('authToken');
        const socket = io('http://localhost:3004', authToken ? {
            auth: { token: authToken }
        } : undefined);

        socketRef.current = socket;

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
            } else if (data.audioFile) {
                const audio = new Audio(`http://localhost:3004${data.audioFile}`);
                audio.play();
            }
        };

        const onConnectError = () => {
            setError('Realtime connection failed. Please refresh and try again.');
        };

        socket.on('voice-reply', onVoiceReply);
        socket.on('connect_error', onConnectError);

        return () => {
            socket.off('voice-reply', onVoiceReply);
            socket.off('connect_error', onConnectError);
            socket.disconnect();
            if (socketRef.current === socket) socketRef.current = null;
        };
    }, [userId]);

    const loadConversation = async (id) => {
        if (!userId || !id) return;

        setLoading(true);
        setError(null);
        try {
            const resp = await fetch(`http://localhost:3004/api/conversations/${encodeURIComponent(id)}`, {
                headers: getAuthHeaders(),
            });
            if (!resp.ok) throw new Error(`Unable to load conversation ${resp.status}`);
            const conv = await resp.json();
            setConversationId(id);
            setMessages(normalizeMessages(conv.messages || []));
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
            const dueTitle = await captureSingleUtterance('Say the due title now (example: electricity bill).');

            let resp = await fetch('http://localhost:3004/api/conversations', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ dueTitle, channel: 'VOICE' }),
            });

            if (resp.status === 409) {
                const duplicateData = await resp.json();
                if (duplicateData?.requiresDueDate) {
                    const spokenDueDate = await captureSingleUtterance('Multiple dues found. Say the due date, for example March 30 2026.');
                    resp = await fetch('http://localhost:3004/api/conversations', {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({ dueTitle, dueDate: spokenDueDate, channel: 'VOICE' }),
                    });
                }
            }

            if (!resp.ok) throw new Error(`Unable to create conversation ${resp.status}`);
            const created = await resp.json();
            setConversationList(prev => upsertConversation(prev, {
                conversationId: created.conversationId,
                dueId: created?.dueId || null,
                channel: 'VOICE',
                status: created?.reused ? 'IN_PROGRESS' : 'STARTED',
                createdAt: created?.createdAt || new Date().toISOString(),
                sessionDate: created?.sessionDate || new Date().toISOString().split('T')[0],
            }));
            await loadConversation(created.conversationId);
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

    const captureSingleUtterance = (hintText) => {
        return new Promise((resolve, reject) => {
            const recognition = setupSpeechRecognition();
            if (!recognition) {
                reject(new Error('Speech recognition is not supported in this browser.'));
                return;
            }

            let finalText = '';
            setVoiceStepHint(hintText || 'Listening...');

            recognition.onresult = (event) => {
                finalText = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join(' ')
                    .trim();
                setSpeechTranscript(finalText);
            };

            recognition.onerror = (event) => {
                setVoiceStepHint('');
                reject(new Error(`Speech recognition error: ${event.error}`));
            };

            recognition.onend = () => {
                setVoiceStepHint('');
                if (!finalText) {
                    reject(new Error('No speech captured. Please try again.'));
                    return;
                }
                resolve(finalText);
            };

            recognition.start();
        });
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

            if (!socketRef.current) {
                setError('Realtime socket unavailable. Please refresh and try again.');
                return;
            }

            socketRef.current.emit('voice-message', {
                audioBuffer: Array.from(new Uint8Array(arrayBuffer)),
                userId,
                conversationId,
                transcript: speechTranscript,
            });
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

    const removeConversationFromLocalStorage = (targetConversationId) => {
        if (!targetConversationId) return;
        const currentUserId = userId || localStorage.getItem('userId');
        if (!currentUserId) return;
        const key = `voiceAssistantHistory_${currentUserId}_${targetConversationId}`;
        localStorage.removeItem(key);
    };

    const deleteConversation = async () => {
        if (!conversationId) {
            setError('Please select a conversation to delete.');
            return;
        }

        const shouldDelete = window.confirm('Delete this conversation? This also clears its local history.');
        if (!shouldDelete) return;

        setLoading(true);
        setError(null);
        try {
            const targetId = conversationId;
            const resp = await fetch(`http://localhost:3004/api/conversations/${encodeURIComponent(targetId)}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (!resp.ok) throw new Error(`Unable to delete conversation ${resp.status}`);

            removeConversationFromLocalStorage(targetId);

            const nextList = conversationList.filter((c) => (c.conversationId || c._id) !== targetId);
            setConversationList(nextList);

            if (nextList.length > 0) {
                await loadConversation(nextList[0].conversationId || nextList[0]._id);
            } else {
                setConversationId(null);
                setMessages([]);
                setReplyMessage('');
                setSpeechTranscript('');
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="assistant-container">
            <div className="assistant-header">
                <div>
                    <h2>Voice Assistant</h2>
                    <p>uid:{userId || 'anonymous'}</p>
                </div>
                <span className={`assistant-state-pill ${error ? 'error' : 'ok'}`}>{error ? 'Issue' : 'Ready'}</span>
            </div>

            <div className="assistant-metrics">
                <span>Session {conversationId ? '✓' : '—'}</span>
                <span>Messages {messages.length}</span>
                <span>Conversations {conversationList.length}</span>
            </div>

            {loading && <p className="assistant-status-line">Loading...</p>}
            {error && <p className="assistant-status-line error">Error: {error}</p>}

            <div className="assistant-toolbar">
                <button className="assistant-primary-btn" onClick={createConversation}>+ New Session</button>
                <select
                    className="assistant-select"
                    value={conversationId || ''}
                    onChange={e => loadConversation(e.target.value)}
                >
                    <option value='' disabled>Select session...</option>
                    {conversationList.map(c => (
                        <option key={c.conversationId || c._id} value={c.conversationId || c._id}>{c.conversationId || c._id}</option>
                    ))}
                </select>
                <button className="assistant-danger-btn" onClick={deleteConversation} disabled={!conversationId}>Delete</button>
            </div>

            <div className="assistant-history-panel">
                {messages.length === 0 ? (
                    <div className="assistant-empty">No messages yet — start talking</div>
                ) : messages.map((msg, idx) => (
                    <div key={idx} className={`assistant-message ${msg.type === 'user' ? 'user' : 'assistant'}`}>
                        <div className="assistant-message-top">
                            <strong>{msg.type === 'user' ? 'You' : 'Assistant'}</strong>
                            <small>{new Date(msg.timestamp).toLocaleString()}</small>
                        </div>
                        <div>{msg.message}</div>
                        {msg.transcript && <small className="assistant-transcript">STT: {msg.transcript}</small>}
                    </div>
                ))}
            </div>

            <div className="assistant-footer-meta">
                <span>Live STT <em>{speechTranscript || 'Waiting for speech...'}</em></span>
                <span>Voice setup <em>{voiceStepHint || 'Idle'}</em></span>
            </div>

            <div className="assistant-controls-row">
                {!isRecording ? (
                    <button className="assistant-start-btn" onClick={startRecording} disabled={!conversationId}>Start Talking</button>
                ) : (
                    <button className="assistant-start-btn recording" onClick={stopRecording}>Stop Talking</button>
                )}
                <div className="assistant-reply-block">
                    <span>Last Reply</span>
                    <p>{replyMessage || 'No reply yet'}</p>
                </div>
            </div>
        </div>
    );
}
