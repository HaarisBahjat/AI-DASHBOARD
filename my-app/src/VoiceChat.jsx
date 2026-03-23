import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './VoiceChat.css';

const VoiceChat = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioRef = useRef(new Audio());

  // Initialize WebSocket connection
  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.warn('⚠️ No auth token found. Please login first.');
      return;
    }

    const newSocket = io('http://localhost:3004', {
      auth: {
        token: authToken
      }
    });

    newSocket.on('connect', () => {
      console.log('🟢 Connected to server');
      setIsConnected(true);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔴 Connection error:', error.message);
      setIsConnected(false);
    });

    newSocket.on('voice-reply', (result) => {
      console.log('📨 Received reply:', result);
      setIsLoading(false);

      // Add assistant message
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'ASSISTANT',
        message: result.message,
        timestamp: new Date()
      }]);

      // Play audio response if available
      if (result.audioFile || result.audioBuffer) {
        playAudioResponse(result);
      }
    });

    newSocket.on('voice-error', (error) => {
      console.error('❌ Voice error:', error);
      setIsLoading(false);
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'SYSTEM',
        message: `❌ Error: ${error.message}`,
        timestamp: new Date()
      }]);
    });

    newSocket.on('disconnect', () => {
      console.log('🔴 Disconnected from server');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  // Start recording audio
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

  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  // Send audio to server via WebSocket
  const sendAudioToServer = () => {
    if (!socket || !selectedConversation) {
      alert('Please select a conversation first');
      return;
    }

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
    const reader = new FileReader();

    reader.onload = (event) => {
      const audioBuffer = new Uint8Array(event.target.result);

      // Add user message to chat
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'USER',
        message: '[Audio message sent]',
        timestamp: new Date()
      }]);

      setIsLoading(true);

      // Send via WebSocket
      socket.emit('voice-message', {
        conversationId: selectedConversation,
        userId: localStorage.getItem('userId'),
        audioBuffer: Array.from(audioBuffer)
      });
    };

    reader.readAsArrayBuffer(audioBlob);
    audioChunksRef.current = [];
  };

  // Play audio response
  const playAudioResponse = (result) => {
    try {
      if (result.audioBuffer) {
        // If we receive raw buffer
        const blob = new Blob([new Uint8Array(result.audioBuffer)], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        audioRef.current.src = url;
        audioRef.current.play();
      } else if (result.audioFile) {
        // If we receive a URL
        audioRef.current.src = `http://localhost:3004${result.audioFile}`;
        audioRef.current.play();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  // Create new conversation
  const createConversation = async () => {
    const dueId = prompt('Enter Due ID:');
    if (!dueId) return;

    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      alert('⚠️ You are not logged in. Please log in first.');
      return;
    }

    try {
      const response = await fetch('http://localhost:3004/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          dueId: dueId,
          channel: 'VOICE'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', response.status, errorData);
        alert(`❌ Error: ${errorData.error || 'Failed to create conversation'}`);
        return;
      }

      const data = await response.json();

      setConversations(prev => [...prev, {
        id: data.conversationId,
        dueId: dueId,
        systemText: data.systemText,
        createdAt: new Date()
      }]);

      // Select and load conversation
      selectConversation(data.conversationId, data.systemText);

      // Play initial system message
      if (data.audioFile) {
        audioRef.current.src = `http://localhost:3004${data.audioFile}`;
        audioRef.current.play();
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert(`❌ Network Error: Make sure server is running on port 3004\n\nDetails: ${error.message}`);
    }
  };

  // Select a conversation
  const selectConversation = (conversationId, systemText) => {
    setSelectedConversation(conversationId);
    setMessages([{
      id: Date.now(),
      role: 'SYSTEM',
      message: systemText,
      timestamp: new Date()
    }]);
  };

  // Complete conversation
  const completeConversation = async (action) => {
    if (!selectedConversation) return;

    try {
      const response = await fetch(
        `http://localhost:3004/api/conversations/${selectedConversation}/complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({
            action: action,
            snoozeDate: action === 'SNOOZE' ? new Date(Date.now() + 7*24*60*60*1000).toISOString() : null
          })
        }
      );

      if (response.ok) {
        alert(`✅ Conversation completed with action: ${action}`);
        setSelectedConversation(null);
        setMessages([]);
      } else {
        const data = await response.json();
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error completing conversation:', error);
      alert(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div className="voice-chat-container">
      <div className="header">
        <h1>Voice Assistant Chat</h1>
        <div className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </div>

      <div className="main-content">
        {/* Conversations List */}
        <div className="sidebar">
          <button 
            className="new-conversation-btn" 
            onClick={createConversation}
            disabled={!isConnected}
          >
            + New Conversation
          </button>

          <div className="conversations-list">
            {conversations.map(conv => (
              <div
                key={conv.id}
                className={`conversation-item ${selectedConversation === conv.id ? 'active' : ''}`}
                onClick={() => selectConversation(conv.id, conv.systemText)}
              >
                <div className="conv-due-id">Due: {conv.dueId.slice(0, 8)}...</div>
                <div className="conv-time">
                  {new Date(conv.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="chat-area">
          {selectedConversation ? (
            <>
              <div className="messages">
                {messages.map(msg => (
                  <div key={msg.id} className={`message ${msg.role.toLowerCase()}`}>
                    <div className="message-role">{msg.role}</div>
                    <div className="message-text">{msg.message}</div>
                    <div className="message-time">
                      {msg.timestamp.toLocaleTimeString()}
                    </div>
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
                  {isRecording ? '🎙️ Recording...' : '🎙️ Hold to Record'}
                </button>

                <div className="action-buttons">
                  <button 
                    className="action-btn paid"
                    onClick={() => completeConversation('PAID')}
                    disabled={!selectedConversation}
                  >
                    Mark as Paid
                  </button>
                  <button 
                    className="action-btn snooze"
                    onClick={() => completeConversation('SNOOZE')}
                    disabled={!selectedConversation}
                  >
                    Snooze
                  </button>
                  <button 
                    className="action-btn dismiss"
                    onClick={() => completeConversation('DISMISSED')}
                    disabled={!selectedConversation}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
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
