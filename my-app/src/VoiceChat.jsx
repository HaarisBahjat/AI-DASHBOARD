import React, { useEffect, useMemo, useRef, useState } from 'react';
import io from 'socket.io-client';
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import './VoiceChat.css';

ChartJS.register(ArcElement, Tooltip, Legend);

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

const normalizeDueStatus = (status) => String(status || '').trim().toUpperCase();

const formatCurrency = (amount) => new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
}).format(Number(amount) || 0);

const formatDays = (days) => `${Number(days || 0).toFixed(1)} days`;

const NAV_ITEMS = [
  { key: 'conversations', label: 'Conversations' },
  { key: 'reminders', label: 'Reminders' },
  { key: 'finance', label: 'Finance' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'settings', label: 'Settings' },
];

// Normalizes backend message records into UI-friendly message objects.
const normalizeMessages = (items = []) => items.map((msg) => ({
  id: msg._id || Date.now() + Math.random(),
  role: (msg.roles || 'SYSTEM').toUpperCase(),
  message: msg.message || '',
  timestamp: msg.createdAt ? new Date(msg.createdAt) : new Date(),
}));

// Date-key helper used for grouping both thread cards and timeline separators.
const getDateKey = (dateValue) => {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Converts a day key to UX-friendly labels (Today/Yesterday/date).
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
  // Keep bill threads unique by dueId so same titles do not merge incorrectly.
  if (conversation?.dueId) return `due:${conversation.dueId}`;
  return `session:${conversation.id}`;
};

const getBillLabel = (conversation) => {
  const title = conversation?.dueTitle || 'Untitled Bill';
  const dueDate = conversation?.dueDate ? new Date(conversation.dueDate).toLocaleDateString() : null;
  return dueDate ? `${title} (${dueDate})` : title;
};

const buildBillThreads = (conversationList = []) => {
  // Build a map first so we can aggregate multiple daily sessions into one bill thread.
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
        status: 'STARTED',
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
      finalOutcomeAction: conversation.finalOutcomeAction || null,
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
    // Sort timeline oldest->newest, while sessions inside a thread keep newest session first.
    thread.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    thread.sessions.sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt));

    thread.activeConversationId = thread.sessions[0]?.id || null;
    thread.status = thread.sessions[0]?.status || 'STARTED';
    thread.finalOutcomeAction = thread.sessions[0]?.finalOutcomeAction || null;
    thread.lastActivityAt = thread.messages.length > 0
      ? new Date(thread.messages[thread.messages.length - 1].timestamp)
      : new Date(thread.sessions[0]?.lastActivityAt || new Date());
    thread.preview = thread.messages.length > 0
      ? thread.messages[thread.messages.length - 1].message
      : 'No messages yet';

    return thread;
  });

  // Requested order: bill name first, recent activity as tiebreaker.
  threads.sort((a, b) => {
    const nameCmp = a.dueTitle.localeCompare(b.dueTitle);
    if (nameCmp !== 0) return nameCmp;
    return new Date(b.lastActivityAt) - new Date(a.lastActivityAt);
  });

  return threads;
};

const groupThreadsByActivityDay = (threads = []) => {
  // Group sidebar cards by last activity day to mimic messaging app sections.
  const grouped = threads.reduce((acc, thread) => {
    const key = getDateKey(thread.lastActivityAt || new Date());
    if (!acc[key]) acc[key] = [];
    acc[key].push(thread);
    return acc;
  }, {});

  return Object.keys(grouped)
    .sort((a, b) => (a < b ? 1 : -1))
    .map((key) => ({
      key,
      label: getDateLabel(key),
      threads: grouped[key],
    }));
};

const getStatusLabel = (status, finalOutcomeAction) => {
  if (status === 'COMPLETED' && finalOutcomeAction === 'SNOOZE') return 'Snoozed';
  if (status === 'COMPLETED' && finalOutcomeAction === 'PAID') return 'Paid';
  if (status === 'COMPLETED' && finalOutcomeAction === 'DISMISSED') return 'Dismissed';
  if (status === 'COMPLETED') return 'Completed';
  if (status === 'IN_PROGRESS') return 'Active';
  return 'Started';
};

const getStatusPillClass = (status, finalOutcomeAction) => {
  if (status === 'COMPLETED' && finalOutcomeAction === 'SNOOZE') return 'snoozed';
  if (status === 'COMPLETED') return 'done';
  return 'active';
};
//snoozed, done, active
const inferFinalOutcomeActionFromMessages = (messageList = []) => {
  for (let i = messageList.length - 1; i >= 0; i -= 1) {
    const msg = messageList[i];
    const text = String(msg?.message || '');
    const match = text.match(/conversation completed with action:\s*([A-Z_]+)/i);
    if (match?.[1]) return match[1].toUpperCase();
  }
  return null;
};

function VoiceChat({ onLogout, profile }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedThreadKey, setSelectedThreadKey] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [dues, setDues] = useState([]);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [voiceSetupHint, setVoiceSetupHint] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('conversations');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioRef = useRef(new Audio());
  const activeConversationIdRef = useRef(null);

  const profileInitials = useMemo(() => {
    const displayName = profile?.name || 'User';
    const source = displayName.trim();
    if (!source) return 'U';
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [profile]);

  const loadConversation = async (conversationId, tokenOverride) => {
    const token = tokenOverride || localStorage.getItem('authToken');
    if (!token || !conversationId) return null;

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

  // Derived threaded view used by the conversation list and chat pane.
  const billThreads = useMemo(() => buildBillThreads(conversations), [conversations]);
  // Search is applied on thread label + preview + activity date text.
  const filteredThreads = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return billThreads;

    return billThreads.filter((thread) => {
      const label = thread.billLabel.toLowerCase();
      const preview = thread.preview.toLowerCase();
      const dateText = new Date(thread.lastActivityAt).toLocaleString().toLowerCase();
      return label.includes(q) || preview.includes(q) || dateText.includes(q);
    });
  }, [billThreads, searchTerm]);

  const threadSections = useMemo(
    () => groupThreadsByActivityDay(filteredThreads),
    [filteredThreads]
  );

  const selectedThread = useMemo(
    () => billThreads.find((thread) => thread.threadKey === selectedThreadKey) || null,
    [billThreads, selectedThreadKey]
  );

  useEffect(() => {
    // Keep selected thread / active session / message timeline synchronized.
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
    // Full refresh: list sessions then hydrate each with messages.
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
      finalOutcomeAction: conv.finalOutcomeAction || null,
      createdAt: conv.createdAt ? new Date(conv.createdAt) : new Date(),
      lastActivityAt: conv.createdAt ? new Date(conv.createdAt) : new Date(),
      messages: [],
    }));

    const withDetails = await Promise.all(normalizedList.map(async (conv) => {
      try {
        const convData = await loadConversation(conv.id, authToken);
        const msgList = convData?.messages || [];
        const latestMessageTime = msgList.length > 0
          ? new Date(msgList[msgList.length - 1].timestamp)
          : conv.lastActivityAt;
        const inferredOutcome = conv.finalOutcomeAction || inferFinalOutcomeActionFromMessages(msgList);

        return {
          ...conv,
          messages: msgList,
          finalOutcomeAction: inferredOutcome,
          lastActivityAt: latestMessageTime,
        };
      } catch {
        return conv;
      }
    }));

    setConversations(withDetails);
  };

  const refreshDues = async (tokenOverride) => {
    const token = tokenOverride || localStorage.getItem('authToken');
    if (!token) return;

    setIsAnalyticsLoading(true);
    try {
      const response = await fetch('http://localhost:3004/api/dues', {
        headers: getAuthHeaders(token)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch dues (${response.status})`);
      }

      const data = await response.json();
      setDues(Array.isArray(data?.dues) ? data.dues : []);
    } catch (err) {
      console.error('Failed to auto-load dues:', err.message);
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  const analytics = useMemo(() => {
    const totals = {
      paid: 0,
      unpaid: 0,
      overdue: 0,
      paidAmount: 0,
      unpaidAmount: 0,
      overdueAmount: 0,
      totalAmount: 0,
      upcoming7Days: 0,
      avgPaymentDelayDays: 0,
      latePaidCount: 0,
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next7 = new Date(today);
    next7.setDate(next7.getDate() + 7);

    const overdueItems = [];
    let paidDelayTotalDays = 0;

    dues.forEach((due) => {
      const amount = Number(due?.amount) || 0;
      const normalizedStatus = normalizeDueStatus(due?.status);
      const dueDate = due?.dueDate ? new Date(due.dueDate) : null;

      totals.totalAmount += amount;

      if (normalizedStatus === 'PAID') {
        totals.paid += 1;
        totals.paidAmount += amount;

        if (dueDate && due?.updatedAt) {
          const paidAt = new Date(due.updatedAt);
          const delayMs = paidAt.getTime() - dueDate.getTime();
          const delayDays = delayMs / (1000 * 60 * 60 * 24);

          if (delayDays > 0) {
            totals.latePaidCount += 1;
            paidDelayTotalDays += delayDays;
          }
        }
      } else if (normalizedStatus === 'OVERDUE') {
        totals.overdue += 1;
        totals.overdueAmount += amount;
        overdueItems.push({
          title: due?.title || 'Untitled Due',
          amount,
          dueDate,
        });
      } else {
        totals.unpaid += 1;
        totals.unpaidAmount += amount;
      }

      if (dueDate && dueDate >= today && dueDate <= next7 && normalizedStatus !== 'PAID') {
        totals.upcoming7Days += 1;
      }
    });

    overdueItems.sort((a, b) => b.amount - a.amount);
    const topOverdue = overdueItems.slice(0, 5);

    totals.avgPaymentDelayDays = totals.latePaidCount > 0
      ? paidDelayTotalDays / totals.latePaidCount
      : 0;

    const conversationTotals = {
      threads: billThreads.length,
      sessions: conversations.length,
      activeSessions: conversations.filter((conv) => conv.status !== 'COMPLETED').length,
      completedSessions: conversations.filter((conv) => conv.status === 'COMPLETED').length,
      totalMessages: conversations.reduce((acc, conv) => acc + (conv.messages?.length || 0), 0),
    };

    return {
      duesCount: dues.length,
      totals,
      topOverdue,
      conversationTotals,
    };
  }, [dues, billThreads.length, conversations]);

  const billStatusChartData = useMemo(() => ({
    labels: ['Paid', 'Unpaid', 'Overdue'],
    datasets: [
      {
        label: 'Bill Count',
        data: [analytics.totals.paid, analytics.totals.unpaid, analytics.totals.overdue],
        backgroundColor: [
          'rgba(52, 211, 153, 0.86)',
          'rgba(79, 142, 247, 0.86)',
          'rgba(248, 113, 113, 0.9)',
        ],
        borderColor: [
          'rgba(52, 211, 153, 1)',
          'rgba(79, 142, 247, 1)',
          'rgba(248, 113, 113, 1)',
        ],
        borderWidth: 1,
        hoverOffset: 6,
      },
    ],
  }), [analytics.totals.overdue, analytics.totals.paid, analytics.totals.unpaid]);

  const billStatusChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#c5d7f2',
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 10,
          padding: 16,
        },
      },
      tooltip: {
        callbacks: {
          label(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            return `${label}: ${value}`;
          },
        },
      },
    },
  }), []);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.warn('No auth token found. Please login first.');
      return;
    }

    // Socket lifecycle for real-time assistant replies.
    const newSocket = io('http://localhost:3004', {
      auth: { token: authToken }
    });

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('connect_error', () => setIsConnected(false));

    newSocket.on('voice-reply', (result) => {
      setIsLoading(false);

      const assistantMessage = {
        id: Date.now() + Math.random(),
        role: 'ASSISTANT',
        message: result.message,
        timestamp: new Date(),
      };

      if (activeConversationIdRef.current) {
        // Attach live assistant reply to the currently active session.
        setConversations((prev) => prev.map((conv) => {
          if (conv.id !== activeConversationIdRef.current) return conv;
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
      setIsLoading(false);
      const systemMessage = {
        id: Date.now() + Math.random(),
        role: 'SYSTEM',
        message: `Error: ${error.message}`,
        timestamp: new Date(),
      };

      if (activeConversationIdRef.current) {
        // Persist socket errors in-thread as system messages for visibility.
        setConversations((prev) => prev.map((conv) => {
          if (conv.id !== activeConversationIdRef.current) return conv;
          return {
            ...conv,
            messages: [...conv.messages, systemMessage],
            lastActivityAt: new Date(),
          };
        }));
      }
    });
      // Listen for reminder events to inject system messages and play TTS audio.
    newSocket.on('reminder-voice', (payload) => {
      // Reminder messages are injected as SYSTEM messages into the relevant conversation thread.
      const reminderMessage = {
        id: payload?.reminderId || Date.now() + Math.random(),
        role: 'SYSTEM',
        message: payload?.message || 'You have a pending due reminder.',
        timestamp: payload?.createdAt ? new Date(payload.createdAt) : new Date(),
      };

      if (payload?.conversationId) {
        setConversations((prev) => {
          const exists = prev.some((conv) => conv.id === payload.conversationId);
          if (!exists) {
            // If this session was created by cron and is not loaded yet, refresh so the reminder text appears.
            refreshConversations(authToken).catch(() => {
              // no-op
            });
            return prev;
          }
    // Inject reminder message into the correct conversation thread based on conversationId.
          return prev.map((conv) => {
            if (conv.id !== payload.conversationId) return conv;
            return {
              ...conv,
              messages: [...conv.messages, reminderMessage],
              lastActivityAt: new Date(),
            };
          });
        });
      } else {
        // If no conversationId is provided, show the reminder as a system message in the currently active thread.
        refreshConversations(authToken).catch(() => {
          // no-op
        });
      }

      if (payload?.audioFile) {
        playAudioResponse({ audioFile: payload.audioFile });
      }
    });

    newSocket.on('disconnect', () => setIsConnected(false));

    setSocket(newSocket);

    refreshConversations(authToken).catch((err) => {
      console.error('Failed to auto-load conversations:', err.message);
    });
    refreshDues(authToken);

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
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
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

      // Optimistic local append so chat feels instant before server reply arrives.
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
    } catch {
      // no-op
    }
  };

  const setupSpeechRecognition = () => {
    // Used only for creating/selecting bill sessions by voice prompts.
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    return recognition;
  };

  const captureSingleUtterance = (hintText) => new Promise((resolve, reject) => {
    const recognition = setupSpeechRecognition();
    if (!recognition) {
      reject(new Error('Speech recognition is not supported in this browser.'));
      return;
    }

    let finalText = '';
    setVoiceSetupHint(hintText || 'Listening...');

    recognition.onresult = (event) => {
      finalText = Array.from(event.results)
        .map((result) => result[0].transcript)
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

  const createConversation = async () => {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      alert('You are not logged in. Please log in first.');
      return;
    }

    try {
      const dueTitle = await captureSingleUtterance('Say the bill title now.');

      let response = await fetch('http://localhost:3004/api/conversations', {
        method: 'POST',
        headers: getAuthHeaders(authToken),
        body: JSON.stringify({ dueTitle, channel: 'VOICE' })
      });

      if (response.status === 409) {
        // Duplicate bill titles require voice due-date disambiguation.
        const duplicateData = await response.json();
        if (duplicateData?.requiresDueDate) {
          const spokenDueDate = await captureSingleUtterance('Multiple bills found. Say the due date.');
          response = await fetch('http://localhost:3004/api/conversations', {
            method: 'POST',
            headers: getAuthHeaders(authToken),
            body: JSON.stringify({ dueTitle, dueDate: spokenDueDate, channel: 'VOICE' })
          });
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Failed to create conversation'}`);
        return;
      }

      const data = await response.json();
      await refreshConversations(authToken);
      // Auto-focus the thread we just created/reused.
      setSelectedThreadKey(data?.dueId ? `due:${data.dueId}` : `session:${data.conversationId}`);

      if (data.audioFile) {
        audioRef.current.src = `http://localhost:3004${data.audioFile}`;
        audioRef.current.play();
      }
    } catch (error) {
      alert(`Network Error: ${error.message}`);
    }
  };

  const completeConversation = async (action) => {
    if (!activeConversationId) return;

    try {
      const response = await fetch(`http://localhost:3004/api/conversations/${activeConversationId}/complete`, {
        method: 'POST',
        headers: getAuthHeaders(localStorage.getItem('authToken')),
        body: JSON.stringify({
          action,
          snoozeDate: action === 'SNOOZE' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null
        })
      });

      if (!response.ok) {
        const data = await response.json();
        alert(`Error: ${data.error}`);
        return;
      }

      const authToken = localStorage.getItem('authToken');
      if (authToken) {
        await refreshConversations(authToken);
        await refreshDues(authToken);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const deleteConversation = async () => {
    if (!activeConversationId) return;

    const shouldDelete = window.confirm('Delete this conversation?');
    if (!shouldDelete) return;

    try {
      const response = await fetch(`http://localhost:3004/api/conversations/${activeConversationId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(localStorage.getItem('authToken'))
      });

      if (!response.ok) {
        const data = await response.json();
        alert(`Error: ${data.error || 'Failed to delete conversation'}`);
        return;
      }

      const userId = localStorage.getItem('userId');
      if (userId) {
        // Keep local cache clean when a session is removed server-side.
        localStorage.removeItem(`voiceAssistantHistory_${userId}_${activeConversationId}`);
      }

      const authToken = localStorage.getItem('authToken');
      if (authToken) {
        await refreshConversations(authToken);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className={`voice-chat-container dashboard-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">ConvDash</div>
        <div className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`sidebar-nav-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => setActiveTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
          <button className="sidebar-nav-item" type="button">Help Center</button>
          <button
            className="sidebar-nav-item danger"
            type="button"
            onClick={() => {
              if (typeof onLogout === 'function') onLogout();
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      <section className="dashboard-main">
        <div className="dashboard-topbar">
          <button
            className="sidebar-toggle-btn"
            type="button"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? '>' : '<'}
          </button>
          <input
            className="dashboard-search"
            type="text"
            placeholder="Search conversations, titles, or dates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="dashboard-topbar-right">
            <button
              className="notif-btn"
              type="button"
              aria-label={isConnected ? 'Notifications (connected)' : 'Notifications (disconnected)'}
              title={isConnected ? 'Connected' : 'Disconnected'}
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M12 4a4 4 0 0 1 4 4v1.3c0 .9.27 1.79.78 2.53l1.08 1.58A1 1 0 0 1 17.04 15H6.96a1 1 0 0 1-.82-1.59l1.08-1.58A4.4 4.4 0 0 0 8 9.3V8a4 4 0 0 1 4-4Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9.8 17a2.2 2.2 0 0 0 4.4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              <span className={`notif-dot ${isConnected ? 'on' : 'off'}`}></span>
            </button>
            <div className="topbar-divider" aria-hidden="true"></div>
            <div className="dashboard-user" role="group" aria-label="Profile">
              <div className="dashboard-user-meta">
                <strong>{profile?.name || 'User'}</strong>
                <span>{profile?.role || 'Member'}</span>
              </div>
              <div className="dashboard-avatar" aria-hidden="true">{profileInitials}</div>
            </div>
          </div>
        </div>

        {activeTab === 'analytics' ? (
          <div className="analytics-dashboard">
            <div className="analytics-head">
              <h2>Analytics</h2>
              <p>{isAnalyticsLoading ? 'Refreshing metrics...' : 'Live overview of dues and voice collections.'}</p>
            </div>

            <div className="analytics-kpis">
              <article className="kpi-card">
                <span className="kpi-label">Total Dues</span>
                <strong className="kpi-value">{analytics.duesCount}</strong>
                <small className="kpi-sub">{formatCurrency(analytics.totals.totalAmount)} tracked</small>
              </article>
              <article className="kpi-card">
                <span className="kpi-label">Overdue Exposure</span>
                <strong className="kpi-value danger">{formatCurrency(analytics.totals.overdueAmount)}</strong>
                <small className="kpi-sub">{analytics.totals.overdue} overdue dues</small>
              </article>
              <article className="kpi-card">
                <span className="kpi-label">Collected</span>
                <strong className="kpi-value success">{formatCurrency(analytics.totals.paidAmount)}</strong>
                <small className="kpi-sub">
                  {analytics.totals.paid} paid dues • Avg delay {formatDays(analytics.totals.avgPaymentDelayDays)}
                </small>
              </article>
              <article className="kpi-card">
                <span className="kpi-label">Upcoming (7d)</span>
                <strong className="kpi-value">{analytics.totals.upcoming7Days}</strong>
                <small className="kpi-sub">Non-paid dues due soon</small>
              </article>
            </div>

            <div className="analytics-grid">
              <section className="analytics-card">
                <h3>Status Distribution</h3>
                <div className="status-chart-wrap">
                  <Doughnut data={billStatusChartData} options={billStatusChartOptions} />
                </div>
                <div className="status-chart-summary">
                  <span>Paid: {analytics.totals.paid} ({formatCurrency(analytics.totals.paidAmount)})</span>
                  <span>Unpaid: {analytics.totals.unpaid} ({formatCurrency(analytics.totals.unpaidAmount)})</span>
                  <span>Overdue: {analytics.totals.overdue} ({formatCurrency(analytics.totals.overdueAmount)})</span>
                </div>
              </section>

              <section className="analytics-card">
                <h3>Conversation Throughput</h3>
                <div className="mini-stats">
                  <div>
                    <span>Bill Threads</span>
                    <strong>{analytics.conversationTotals.threads}</strong>
                  </div>
                  <div>
                    <span>Sessions</span>
                    <strong>{analytics.conversationTotals.sessions}</strong>
                  </div>
                  <div>
                    <span>Active Sessions</span>
                    <strong>{analytics.conversationTotals.activeSessions}</strong>
                  </div>
                  <div>
                    <span>Completed Sessions</span>
                    <strong>{analytics.conversationTotals.completedSessions}</strong>
                  </div>
                  <div>
                    <span>Total Messages</span>
                    <strong>{analytics.conversationTotals.totalMessages}</strong>
                  </div>
                  <div>
                    <span>Avg Payment Delay</span>
                    <strong>{formatDays(analytics.totals.avgPaymentDelayDays)}</strong>
                  </div>
                </div>
              </section>

              <section className="analytics-card overdue-list-card">
                <h3>Top Overdue Dues</h3>
                {analytics.topOverdue.length === 0 ? (
                  <p className="analytics-empty">No overdue dues right now.</p>
                ) : (
                  <div className="overdue-list">
                    {analytics.topOverdue.map((item, idx) => (
                      <div key={`${item.title}-${idx}`} className="overdue-item">
                        <div>
                          <strong>{item.title}</strong>
                          <span>{item.dueDate ? item.dueDate.toLocaleDateString() : 'No due date'}</span>
                        </div>
                        <b>{formatCurrency(item.amount)}</b>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : activeTab !== 'conversations' ? (
          <div className="tab-placeholder">
            <h2>{NAV_ITEMS.find((n) => n.key === activeTab)?.label}</h2>
            <p>This tab is intentionally empty for now.</p>
          </div>
        ) : (
          <div className="conversation-dashboard">
            <div className="conversation-list-panel">
              <div className="conversation-list-header">
                <h1>Conversations</h1>
                <p>Review and manage your AI voice interactions.</p>
              </div>

              <button className="new-conversation-btn" onClick={createConversation} disabled={!isConnected}>
                + New Session
              </button>
              {voiceSetupHint && <div className="hint-line">{voiceSetupHint}</div>}

              <div className="conversations-list">
                {threadSections.map((section) => (
                  <div key={section.key}>
                    <div className="section-label">{section.label}</div>
                    {section.threads.map((thread) => (
                      <div
                        key={thread.threadKey}
                        className={`conversation-item ${selectedThreadKey === thread.threadKey ? 'active' : ''}`}
                        onClick={() => setSelectedThreadKey(thread.threadKey)}
                      >
                        <div className="conversation-item-title">{thread.billLabel}</div>
                        <div className="conversation-item-sub">{thread.preview}</div>
                        <div className="conversation-meta-row">
                          <span className={`status-pill ${getStatusPillClass(thread.status, thread.finalOutcomeAction)}`}>
                            {getStatusLabel(thread.status, thread.finalOutcomeAction)}
                          </span>
                          <span className="conv-time">{new Date(thread.lastActivityAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="conversation-chat-panel">
              {selectedThread ? (
                <>
                  <div className="chat-panel-header">
                    <div>
                      <h3>{selectedThread.billLabel}</h3>
                      <p>{getStatusLabel(selectedThread.status, selectedThread.finalOutcomeAction)} • {new Date(selectedThread.lastActivityAt).toLocaleString()}</p>
                    </div>
                    <button className="three-dot-btn" type="button">...</button>
                  </div>

                  <div className="messages">
                    {messages.map((msg, index) => {
                      const previous = messages[index - 1];
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
                      {isRecording ? 'Recording...' : 'Hold to Record'}
                    </button>

                    <div className="action-buttons">
                      <button className="action-btn paid" onClick={() => completeConversation('PAID')} disabled={!activeConversationId}>Mark Paid</button>
                      <button className="action-btn snooze" onClick={() => completeConversation('SNOOZE')} disabled={!activeConversationId}>Snooze</button>
                      <button className="action-btn dismiss" onClick={() => completeConversation('DISMISSED')} disabled={!activeConversationId}>Dismiss</button>
                      <button className="action-btn dismiss" onClick={deleteConversation} disabled={!activeConversationId}>Delete</button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">◌</div>
                  <p>Select a bill thread to start</p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <audio ref={audioRef} />
    </div>
  );
}

export default VoiceChat;
