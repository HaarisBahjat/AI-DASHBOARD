import React, { useEffect, useMemo, useRef, useState } from 'react';
import io from 'socket.io-client';
import './VoiceChat.css';

/*
  Architecture Notes (VoiceChat)
  - Thread identity: A bill thread is keyed by dueId (fallback: session id). This prevents
    accidental merging when different bills share the same title.
  - Data model in UI: conversations[] contains session-level entries; billThreads[] is a
    derived view that groups sessions by bill and combines their messages.
  - Timeline behavior: Inside each bill thread, messages are sorted chronologically and
    rendered with day separators (Today/Yesterday/date) for WhatsApp-like readability.
  - Active routing: Voice recording and live socket replies are always bound to the
    latest active session id inside the selected bill thread.
*/

const getAuthHeaders = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

const normalizeMessages = (items = []) => {
  return items.map((msg) => ({
    id: msg._id || Date.now() + Math.random(),
    role: (msg.roles || 'SYSTEM').toUpperCase(),
    message: msg.message || '',
    timestamp: msg.createdAt ? new Date(msg.createdAt) : new Date(),
  }));
};

const getDateKey = (dateValue) => {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDateLabel = (dateKey) => {
  const now = new Date();
  const todayKey = getDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = getDateKey(yesterday);

  if (dateKey === todayKey) return 'Today';
  if (dateKey === yesterdayKey) return 'Yesterday';

  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getThreadKey = (conversation) => {
  // Do not merge different bills with the same title; dueId is the primary thread identity.
  if (conversation?.dueId) return `due:${conversation.dueId}`;
  return `session:${conversation.id}`;
};

const getBillLabel = (conversation) => {
  const title = conversation?.dueTitle || 'Untitled Bill';
  const dueDate = conversation?.dueDate ? new Date(conversation.dueDate).toLocaleDateString() : null;
  return dueDate ? `${title} (${dueDate})` : title;
};

const buildBillThreads = (conversationList = []) => {
  const threadMap = new Map();

  for (const conversation of conversationList) {
    const threadKey = getThreadKey(conversation);
    if (!threadMap.has(threadKey)) {
      threadMap.set(threadKey, {
        threadKey,
        dueId: conversation?.dueId || null,
        dueTitle: conversation?.dueTitle || 'Untitled Bill',
        dueDate: conversation?.dueDate || null,
        billLabel: getBillLabel(conversation),
        sessions: [],
        messages: [],
        activeConversationId: null,
        lastActivityAt: new Date(conversation.createdAt || new Date()),
        preview: 'No messages yet',
      });
    }

    const thread = threadMap.get(threadKey);
    const sessionMessages = Array.isArray(conversation.messages) ? conversation.messages : [];
    const conversationLastActivity = sessionMessages.length > 0
      ? new Date(sessionMessages[sessionMessages.length - 1].timestamp)
      : new Date(conversation.lastActivityAt || conversation.createdAt || new Date());

    thread.sessions.push({
      id: conversation.id,
      sessionDate: conversation.sessionDate,
      createdAt: conversation.createdAt,
      status: conversation.status,
      lastActivityAt: conversationLastActivity,
    });

    // Collect messages from all sessions under the same bill thread.
    thread.messages.push(...sessionMessages.map((msg) => ({
      ...msg,
      conversationId: conversation.id,
      timestamp: new Date(msg.timestamp),
    })));
  }

  const threads = Array.from(threadMap.values()).map((thread) => {
    // Within a bill thread, messages are stacked chronologically (WhatsApp-like timeline).
    thread.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    thread.sessions.sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt));
    thread.activeConversationId = thread.sessions[0]?.id || null;
    thread.lastActivityAt = thread.messages.length > 0
      ? new Date(thread.messages[thread.messages.length - 1].timestamp)
      : new Date(thread.sessions[0]?.lastActivityAt || new Date());
    thread.preview = thread.messages.length > 0
      ? thread.messages[thread.messages.length - 1].message
      : 'No messages yet';

    return thread;
  });

  // Sidebar order: bill name first, then latest activity for same-name ties.
  threads.sort((a, b) => {
    const nameCmp = a.dueTitle.localeCompare(b.dueTitle);
    if (nameCmp !== 0) return nameCmp;
    return new Date(b.lastActivityAt) - new Date(a.lastActivityAt);
  });

  return threads;
};

const VoiceChat = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedThreadKey, setSelectedThreadKey] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [voiceSetupHint, setVoiceSetupHint] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioRef = useRef(new Audio());

  const loadConversation = async (conversationId, tokenOverride) => {
    const token = tokenOverride || localStorage.getItem('authToken');
    if (!token || !conversationId) return;

    const response = await fetch(`http://localhost:3004/api/conversations/${conversationId}`, {
      headers: getAuthHeaders(token)
    });

    if (!response.ok) {
      throw new Error(`Failed to load conversation (${response.status})`);
    }

    const data = await response.json();
    return {
      session: data.session,
      messages: normalizeMessages(data.messages || []),
    };
  };

  const billThreads = useMemo(() => buildBillThreads(conversations), [conversations]);
  const selectedThread = useMemo(
    () => billThreads.find((thread) => thread.threadKey === selectedThreadKey) || null,
    [billThreads, selectedThreadKey]
  );

  useEffect(() => {
    if (billThreads.length === 0) {
      setActiveConversationId(null);
      setMessages([]);
      if (selectedThreadKey !== null) setSelectedThreadKey(null);
      return;
    }

    if (!selectedThread) {
      setSelectedThreadKey(billThreads[0].threadKey);
      return;
    }

    setActiveConversationId(selectedThread.activeConversationId);
    setMessages(selectedThread.messages);
  }, [billThreads, selectedThread, selectedThreadKey]);

  const refreshConversations = async (authToken) => {
    const response = await fetch('http://localhost:3004/api/conversations', {
      headers: getAuthHeaders(authToken)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conversations (${response.status})`);
    }

    const list = await response.json();
    const normalizedList = (Array.isArray(list) ? list : []).map((conv) => ({
      id: conv.conversationId || conv._id,
      dueId: conv.dueId,
      dueTitle: conv.dueTitle || 'Untitled Bill',
      dueDate: conv.dueDate || null,
      sessionDate: conv.sessionDate,
      status: conv.status,
      createdAt: conv.createdAt ? new Date(conv.createdAt) : new Date(),
      lastActivityAt: conv.createdAt ? new Date(conv.createdAt) : new Date(),
      messages: [],
    }));

    // Hydrate each session with its message list to build accurate bill threads and previews.
    const withDetails = await Promise.all(normalizedList.map(async (conv) => {
      try {
        const convData = await loadConversation(conv.id, authToken);
        const msgList = convData?.messages || [];
        const latestMessageTime = msgList.length > 0
          ? new Date(msgList[msgList.length - 1].timestamp)
          : conv.lastActivityAt;
        return {
          ...conv,
          messages: msgList,
          lastActivityAt: latestMessageTime,
        };
      } catch {
        return conv;
      }
    }));

    setConversations(withDetails);
  };

  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.warn('?? No auth token found. Please login first.');
      return;
    }

    const newSocket = io('http://localhost:3004', {
      auth: {
        token: authToken
      }
    });

    newSocket.on('connect', () => {
      console.log('?? Connected to server');
      setIsConnected(true);
    });

    newSocket.on('connect_error', (error) => {
      console.error('?? Connection error:', error.message);
      setIsConnected(false);
    });

    newSocket.on('voice-reply', (result) => {
      console.log('?? Received reply:', result);
      setIsLoading(false);

      const assistantMessage = {
        id: Date.now() + Math.random(),
        role: 'ASSISTANT',
        message: result.message,
        timestamp: new Date(),
      };

      if (activeConversationId) {
        // Keep real-time assistant replies attached to the currently active session/thread.
        setConversations((prev) => prev.map((conv) => {
          if (conv.id !== activeConversationId) return conv;
          return {
            ...conv,
            messages: [...conv.messages, assistantMessage],
            lastActivityAt: new Date(),
          };
        }));
      }

      if (result.audioFile || result.audioBuffer) {
        playAudioResponse(result);
      }
    });

    newSocket.on('voice-error', (error) => {
      console.error('? Voice error:', error);
      setIsLoading(false);
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'SYSTEM',
        message: `? Error: ${error.message}`,
        timestamp: new Date()
      }]);
    });

    newSocket.on('disconnect', () => {
      console.log('?? Disconnected from server');
      setIsConnected(false);
    });

    setSocket(newSocket);

    const fetchConversations = async () => {
      try {
        await refreshConversations(authToken);
      } catch (error) {
        console.error('Failed to auto-load conversations:', error.message);
      }
    };

    fetchConversations();

    return () => newSocket.close();
  }, [activeConversationId]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        sendAudioToServer();
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const sendAudioToServer = () => {
    if (!socket || !activeConversationId) {
      alert('Please select a bill chat first');
      return;
    }

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
    const reader = new FileReader();

    reader.onload = (event) => {
      const audioBuffer = new Uint8Array(event.target.result);

      const userMessage = {
        id: Date.now() + Math.random(),
        role: 'USER',
        message: '[Audio message sent]',
        timestamp: new Date()
      };

      // Optimistic update for immediate UX while backend processes audio and emits final reply.
      setConversations((prev) => prev.map((conv) => {
        if (conv.id !== activeConversationId) return conv;
        return {
          ...conv,
          messages: [...conv.messages, userMessage],
          lastActivityAt: new Date(),
        };
      }));

      setIsLoading(true);

      socket.emit('voice-message', {
        conversationId: activeConversationId,
        userId: localStorage.getItem('userId'),
        audioBuffer: Array.from(audioBuffer)
      });
    };

    reader.readAsArrayBuffer(audioBlob);
    audioChunksRef.current = [];
  };

  const playAudioResponse = (result) => {
    try {
      if (result.audioBuffer) {
        const blob = new Blob([new Uint8Array(result.audioBuffer)], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        audioRef.current.src = url;
        audioRef.current.play();
      } else if (result.audioFile) {
        audioRef.current.src = `http://localhost:3004${result.audioFile}`;
        audioRef.current.play();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const setupSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
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
      setVoiceSetupHint(hintText || 'Listening...');

      recognition.onresult = (event) => {
        finalText = Array.from(event.results)
          .map(result => result[0].transcript)
          .join(' ')
          .trim();
      };

      recognition.onerror = (event) => {
        setVoiceSetupHint('');
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      recognition.onend = () => {
        setVoiceSetupHint('');
        if (!finalText) {
          reject(new Error('No speech captured. Please try again.'));
          return;
        }
        resolve(finalText);
      };

      recognition.start();
    });
  };

  const createConversation = async () => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      alert('?? You are not logged in. Please log in first.');
      return;
    }

    try {
      const dueTitle = await captureSingleUtterance('Say the due title now (example: electricity bill).');

      let response = await fetch('http://localhost:3004/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ dueTitle, channel: 'VOICE' })
      });

      if (response.status === 409) {
        const duplicateData = await response.json();
        if (duplicateData?.requiresDueDate) {
          const spokenDueDate = await captureSingleUtterance('Multiple dues found. Say the due date, for example March 30 2026.');
          response = await fetch('http://localhost:3004/api/conversations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ dueTitle, dueDate: spokenDueDate, channel: 'VOICE' })
          });
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        alert(`? Error: ${errorData.error || 'Failed to create conversation'}`);
        return;
      }

      const data = await response.json();
      await refreshConversations(authToken);
      if (data?.dueId) {
        setSelectedThreadKey(`due:${data.dueId}`);
      } else {
        setSelectedThreadKey(`session:${data.conversationId}`);
      }

      if (data.audioFile) {
        audioRef.current.src = `http://localhost:3004${data.audioFile}`;
        audioRef.current.play();
      }
    } catch (error) {
      alert(`? Network Error: Make sure server is running on port 3004\n\nDetails: ${error.message}`);
    }
  };

  const selectThread = (threadKey) => {
    setSelectedThreadKey(threadKey);
  };

  const completeConversation = async (action) => {
    if (!activeConversationId) return;

    try {
      const response = await fetch(`http://localhost:3004/api/conversations/${activeConversationId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ action: action, snoozeDate: action === 'SNOOZE' ? new Date(Date.now() + 7*24*60*60*1000).toISOString() : null })
      });

      if (response.ok) {
        alert(`? Conversation completed with action: ${action}`);
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
          await refreshConversations(authToken);
        }
      } else {
        const data = await response.json();
        alert(`? Error: ${data.error}`);
      }
    } catch (error) {
      alert(`? Error: ${error.message}`);
    }
  };

  const deleteConversation = async () => {
    if (!activeConversationId) return;

    const shouldDelete = window.confirm('Delete this conversation?');
    if (!shouldDelete) return;

    try {
      const response = await fetch(`http://localhost:3004/api/conversations/${activeConversationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        alert(`? Error: ${data.error || 'Failed to delete conversation'}`);
        return;
      }

      const userId = localStorage.getItem('userId');
      if (userId) {
        localStorage.removeItem(`voiceAssistantHistory_${userId}_${activeConversationId}`);
      }

      const authToken = localStorage.getItem('authToken');
      if (authToken) {
        await refreshConversations(authToken);
      }
    } catch (error) {
      alert(`? Error: ${error.message}`);
    }
  };

  return (
    <div className="voice-chat-container">
      <div className="header">
        <h1>Voice Assistant Chat</h1>
        <div className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '?? Connected' : '?? Disconnected'}
        </div>
      </div>

      <div className="main-content">
        <div className="sidebar">
          <button className="new-conversation-btn" onClick={createConversation} disabled={!isConnected}>
            + New Conversation
          </button>
          {voiceSetupHint && <div style={{ fontSize: '12px', margin: '8px 0', color: '#555' }}>{voiceSetupHint}</div>}
          <div className="conversations-list">
            {billThreads.map((thread) => (
              <div
                key={thread.threadKey}
                className={`conversation-item ${selectedThreadKey === thread.threadKey ? 'active' : ''}`}
                onClick={() => selectThread(thread.threadKey)}
              >
                <div className="conversation-item-title">{thread.billLabel}</div>
                <div className="conversation-item-sub">{thread.preview}</div>
                <div className="conv-time">{new Date(thread.lastActivityAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="chat-area">
          {selectedThread ? (
            <>
              <div className="messages">
                {messages.map((msg, index) => {
                  const previous = messages[index - 1];
                  // Add date headers when the message day changes in the timeline.
                  const showDateDivider = !previous || getDateKey(previous.timestamp) !== getDateKey(msg.timestamp);

                  return (
                    <React.Fragment key={msg.id}>
                      {showDateDivider && (
                        <div className="message-date-divider">{getDateLabel(getDateKey(msg.timestamp))}</div>
                      )}
                      <div className={`message ${msg.role.toLowerCase()}`}>
                        <div className="message-role">{msg.role}</div>
                        <div className="message-text">{msg.message}</div>
                        <div className="message-time">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </React.Fragment>
                  );
                })}
                {isLoading && (
                  <div className="message loading">
                    <div className="spinner"></div>
                    <span>Processing...</span>
                  </div>
                )}
              </div>

              <div className="controls">
                <button
                  className={`record-btn ${isRecording ? 'recording' : ''}`}
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  disabled={!isConnected || isLoading || !activeConversationId}
                >
                  {isRecording ? '??? Recording...' : '??? Hold to Record'}
                </button>

                <div className="action-buttons">
                  <button className="action-btn paid" onClick={() => completeConversation('PAID')} disabled={!activeConversationId}>Mark as Paid</button>
                  <button className="action-btn snooze" onClick={() => completeConversation('SNOOZE')} disabled={!activeConversationId}>Snooze</button>
                  <button className="action-btn dismiss" onClick={() => completeConversation('DISMISSED')} disabled={!activeConversationId}>Dismiss</button>
                  <button className="action-btn dismiss" onClick={deleteConversation} disabled={!activeConversationId}>Delete Chat</button>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">??</div>
              <p>Select or create a conversation to start</p>
            </div>
          )}
        </div>
      </div>

      <audio ref={audioRef} />
    </div>
  );
};

export default VoiceChat;
