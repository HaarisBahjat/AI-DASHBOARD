import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './VoiceChat.css';

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

const groupConversationsBySessionDate = (items = []) => {
  const grouped = items.reduce((acc, conversation) => {
    const key = conversation.sessionDate || getDateKey(conversation.createdAt || new Date());
    if (!acc[key]) acc[key] = [];
    acc[key].push(conversation);
    return acc;
  }, {});

  return Object.keys(grouped)
    .sort((a, b) => (a < b ? 1 : -1))
    .map((key) => ({
      key,
      label: getDateLabel(key),
      conversations: grouped[key],
    }));
};

const upsertConversation = (list, nextConversation) => {
  const withoutCurrent = list.filter((item) => item.id !== nextConversation.id);
  return [nextConversation, ...withoutCurrent];
};

const VoiceChat = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
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
    setSelectedConversation(conversationId);
    setMessages(normalizeMessages(data.messages || []));
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

      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'ASSISTANT',
        message: result.message,
        timestamp: new Date()
      }]);

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
          dueLabel: conv.dueLabel || conv.dueId,
          sessionDate: conv.sessionDate,
          createdAt: conv.createdAt ? new Date(conv.createdAt) : new Date(),
          systemText: conv.systemText || '',
          lastActivityAt: conv.createdAt ? new Date(conv.createdAt) : new Date(),
        }));

        const withActivity = await Promise.all(normalizedList.map(async (conv) => {
          try {
            const convResp = await fetch(`http://localhost:3004/api/conversations/${conv.id}`, {
              headers: getAuthHeaders(authToken)
            });

            if (!convResp.ok) {
              return conv;
            }

            const convData = await convResp.json();
            const messages = Array.isArray(convData?.messages) ? convData.messages : [];
            const latestMessageTime = messages
              .map((m) => new Date(m.createdAt).getTime())
              .filter((t) => !Number.isNaN(t))
              .sort((a, b) => b - a)[0];

            return {
              ...conv,
              lastActivityAt: latestMessageTime ? new Date(latestMessageTime) : conv.lastActivityAt,
              systemText: conv.systemText || messages.find((m) => m.roles === 'SYSTEM')?.message || ''
            };
          } catch {
            return conv;
          }
        }));

        withActivity.sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt));

        setConversations(withActivity);

        if (withActivity.length > 0) {
          await loadConversation(withActivity[0].id, authToken);
        }
      } catch (error) {
        console.error('Failed to auto-load conversations:', error.message);
      }
    };

    fetchConversations();

    return () => newSocket.close();
  }, []);

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
    if (!socket || !selectedConversation) {
      alert('Please select a conversation first');
      return;
    }

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
    const reader = new FileReader();

    reader.onload = (event) => {
      const audioBuffer = new Uint8Array(event.target.result);

      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'USER',
        message: '[Audio message sent]',
        timestamp: new Date()
      }]);

      setIsLoading(true);

      socket.emit('voice-message', {
        conversationId: selectedConversation,
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

      setConversations(prev => upsertConversation(prev, {
        id: data.conversationId,
        dueLabel: dueTitle,
        systemText: data.systemText,
        sessionDate: data?.sessionDate || new Date().toISOString().split('T')[0],
        createdAt: data?.createdAt ? new Date(data.createdAt) : new Date(),
        lastActivityAt: new Date()
      }));

      await selectConversation(data.conversationId, data.systemText);

      if (data.audioFile) {
        audioRef.current.src = `http://localhost:3004${data.audioFile}`;
        audioRef.current.play();
      }
    } catch (error) {
      alert(`? Network Error: Make sure server is running on port 3004\n\nDetails: ${error.message}`);
    }
  };

  const selectConversation = async (conversationId, systemText) => {
    try {
      await loadConversation(conversationId);
    } catch (error) {
      console.error('Error loading conversation details:', error.message);
      setSelectedConversation(conversationId);
      setMessages([{ id: Date.now(), role: 'SYSTEM', message: systemText || 'Conversation loaded', timestamp: new Date() }]);
    }
  };

  const completeConversation = async (action) => {
    if (!selectedConversation) return;

    try {
      const response = await fetch(`http://localhost:3004/api/conversations/${selectedConversation}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ action: action, snoozeDate: action === 'SNOOZE' ? new Date(Date.now() + 7*24*60*60*1000).toISOString() : null })
      });

      if (response.ok) {
        alert(`? Conversation completed with action: ${action}`);
        setSelectedConversation(null);
        setMessages([]);
      } else {
        const data = await response.json();
        alert(`? Error: ${data.error}`);
      }
    } catch (error) {
      alert(`? Error: ${error.message}`);
    }
  };

  const deleteConversation = async () => {
    if (!selectedConversation) return;

    const shouldDelete = window.confirm('Delete this conversation?');
    if (!shouldDelete) return;

    try {
      const response = await fetch(`http://localhost:3004/api/conversations/${selectedConversation}`, {
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
        localStorage.removeItem(`voiceAssistantHistory_${userId}_${selectedConversation}`);
      }

      const remaining = conversations.filter((conv) => conv.id !== selectedConversation);
      setConversations(remaining);

      if (remaining.length > 0) {
        await selectConversation(remaining[0].id, remaining[0].systemText);
      } else {
        setSelectedConversation(null);
        setMessages([]);
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
            {groupConversationsBySessionDate(conversations).map((section) => (
              <div key={section.key}>
                <div style={{ fontSize: '12px', fontWeight: 700, opacity: 0.8, margin: '10px 0 6px 0' }}>{section.label}</div>
                {section.conversations.map((conv) => (
                  <div key={conv.id} className={`conversation-item ${selectedConversation === conv.id ? 'active' : ''}`} onClick={() => selectConversation(conv.id, conv.systemText)}>
                    <div className="conv-due-id">Due: {(conv.dueLabel || conv.dueId || 'N/A').toString()}</div>
                    <div className="conv-time">{new Date(conv.createdAt).toLocaleTimeString()}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="chat-area">
          {selectedConversation ? (
            <>
              <div className="messages">
                {messages.map(msg => (
                  <div key={msg.id} className={`message ${msg.role.toLowerCase()}`}>
                    <div className="message-role">{msg.role}</div>
                    <div className="message-text">{msg.message}</div>
                    <div className="message-time">{msg.timestamp.toLocaleTimeString()}</div>
                  </div>
                ))}
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
                  disabled={!isConnected || isLoading}
                >
                  {isRecording ? '??? Recording...' : '??? Hold to Record'}
                </button>

                <div className="action-buttons">
                  <button className="action-btn paid" onClick={() => completeConversation('PAID')} disabled={!selectedConversation}>Mark as Paid</button>
                  <button className="action-btn snooze" onClick={() => completeConversation('SNOOZE')} disabled={!selectedConversation}>Snooze</button>
                  <button className="action-btn dismiss" onClick={() => completeConversation('DISMISSED')} disabled={!selectedConversation}>Dismiss</button>
                  <button className="action-btn dismiss" onClick={deleteConversation} disabled={!selectedConversation}>Delete Chat</button>
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
