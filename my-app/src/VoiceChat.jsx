import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import io from 'socket.io-client';
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { apiUrl, socketUrl } from './lib/api';
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
const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : 'No date');

const getMonthKey = (dateValue) => {
  const date = new Date(dateValue);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const NAV_ITEMS = [
  { key: 'conversations', label: 'Conversations', icon: 'dashboard' },
  { key: 'contacts', label: 'Contacts', icon: 'people' },
  { key: 'intellige', label: 'Intellige', icon: 'auto_awesome', soon: true },
  { key: 'finance', label: 'Finance', icon: 'account_balance_wallet' },
  { key: 'analytics', label: 'Analytics', icon: 'show_chart' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
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
  const [financeBottomTab, setFinanceBottomTab] = useState('paymentMethods');
  const [financeActionLoadingId, setFinanceActionLoadingId] = useState(null);
  const [financeActionNotice, setFinanceActionNotice] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  // ── Text input state ──────────────────────────────────────────────────────
  const [textInput, setTextInput] = useState('');
  // ── Notification center state ─────────────────────────────────────────────
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioRef = useRef(new Audio());
  const activeConversationIdRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const isCancelledRef = useRef(false);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [scannedReceiptData, setScannedReceiptData] = useState(null);
  const fileInputRef = useRef(null);
  const notifPanelRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textInputRef = useRef(null);

  // ── Contacts (Customers) state ────────────────────────────────────────────
  const [customers, setCustomers] = useState([]);
  const [isCustomersLoading, setIsCustomersLoading] = useState(false);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [customerActivity, setCustomerActivity] = useState(null);
  const [isDrawerLoading, setIsDrawerLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', contactNo: '', email: '', place: '', notes: '' });
  const [addCustomerLoading, setAddCustomerLoading] = useState(false);
  const [followupAllLoading, setFollowupAllLoading] = useState(false);

  // ── Customer Invoice Creation state ─────────────────────────────────────────
  const [showAddInvoiceModal, setShowAddInvoiceModal] = useState(false);
  const [newInvoiceForm, setNewInvoiceForm] = useState({ title: '', amount: '', dueDate: '', invoiceNo: '' });
  const [addInvoiceLoading, setAddInvoiceLoading] = useState(false);

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

    const response = await fetch(apiUrl(`/api/conversations/${conversationId}`), {
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
    const response = await fetch(apiUrl('/api/conversations'), {
      headers: getAuthHeaders(authToken)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conversations (${response.status})`);
    }

    const list = await response.json();
    const withDetails = (Array.isArray(list) ? list : []).map((conv) => {
      const msgList = normalizeMessages(conv.messages || []);
      const createdAt = conv.createdAt ? new Date(conv.createdAt) : new Date();
      const latestMessageTime = msgList.length > 0
        ? new Date(msgList[msgList.length - 1].timestamp)
        : createdAt;
      const inferredOutcome = conv.finalOutcomeAction || inferFinalOutcomeActionFromMessages(msgList);

      return {
        id: conv.conversationId || conv._id,
        dueId: conv.dueId,
        dueTitle: conv.dueTitle || 'Untitled Bill',
        dueDate: conv.dueDate || null,
        sessionDate: conv.sessionDate,
        status: conv.status,
        finalOutcomeAction: inferredOutcome,
        createdAt: createdAt,
        lastActivityAt: latestMessageTime,
        messages: msgList,
      };
    });

    setConversations(withDetails);
  };

  const safeJsonParse = async (res) => {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    const text = await res.text();
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      throw new Error(`Server endpoint not found (${res.status}). Ensure the backend server is running.`);
    }
    throw new Error(text.slice(0, 150) || `Server error (${res.status})`);
  };

  const refreshCustomers = async (tokenOverride) => {
    const token = tokenOverride || localStorage.getItem('authToken');
    if (!token) return;
    setIsCustomersLoading(true);
    try {
      const res = await fetch(apiUrl('/api/customers'), { headers: getAuthHeaders(token) });
      if (!res.ok) {
        const data = await safeJsonParse(res).catch(e => ({ message: e.message }));
        throw new Error(data.message || `Failed to fetch customers (${res.status})`);
      }
      const data = await safeJsonParse(res);
      setCustomers(Array.isArray(data?.customers) ? data.customers : []);
    } catch (err) {
      console.error('Failed to load customers:', err.message);
    } finally {
      setIsCustomersLoading(false);
    }
  };

  const loadCustomerActivity = async (customerId) => {
    const token = localStorage.getItem('authToken');
    if (!token || !customerId) return;
    setIsDrawerLoading(true);
    setCustomerActivity(null);
    try {
      const res = await fetch(apiUrl(`/api/customers/${customerId}/activity`), { headers: getAuthHeaders(token) });
      const data = await safeJsonParse(res);
      if (!res.ok) throw new Error(data.message || `Failed to load activity (${res.status})`);
      setCustomerActivity(data);
    } catch (err) {
      console.error('loadCustomerActivity error:', err.message);
    } finally {
      setIsDrawerLoading(false);
    }
  };

  const openCustomerDrawer = (customerId) => {
    setSelectedCustomerId(customerId);
    setCustomerDrawerOpen(true);
    loadCustomerActivity(customerId);
  };

  const closeCustomerDrawer = () => {
    setCustomerDrawerOpen(false);
    setSelectedCustomerId(null);
    setCustomerActivity(null);
  };

  const handleAddCustomer = async () => {
    if (!newCustomerForm.name.trim()) { alert('Customer name is required'); return; }
    const token = localStorage.getItem('authToken');
    if (!token) return;
    setAddCustomerLoading(true);
    try {
      const res = await fetch(apiUrl('/api/customers'), {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify(newCustomerForm),
      });
      const data = await safeJsonParse(res);
      if (!res.ok) throw new Error(data.message || 'Failed to create customer');
      setShowAddCustomerModal(false);
      setNewCustomerForm({ name: '', contactNo: '', email: '', place: '', notes: '' });
      await refreshCustomers(token);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setAddCustomerLoading(false);
    }
  };

  const handleAddInvoiceForCustomer = async () => {
    if (!newInvoiceForm.title.trim() || !newInvoiceForm.amount || !newInvoiceForm.dueDate) {
      alert('Title, amount, and due date are required');
      return;
    }
    const token = localStorage.getItem('authToken');
    if (!token || !selectedCustomerId) return;
    setAddInvoiceLoading(true);
    try {
      const res = await fetch(apiUrl('/api/dues'), {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          customerId: selectedCustomerId,
          title: newInvoiceForm.title.trim(),
          amount: Number(newInvoiceForm.amount),
          dueDate: newInvoiceForm.dueDate,
          invoiceNo: newInvoiceForm.invoiceNo?.trim() || null,
        }),
      });
      const data = await safeJsonParse(res);
      if (!res.ok) throw new Error(data.message || 'Failed to create invoice');
      setShowAddInvoiceModal(false);
      setNewInvoiceForm({ title: '', amount: '', dueDate: '', invoiceNo: '' });
      await loadCustomerActivity(selectedCustomerId);
      await refreshCustomers(token);
      await refreshDues(token);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setAddInvoiceLoading(false);
    }
  };

  const handleToggleFollowUp = async (customerId, currentValue) => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    try {
      const res = await fetch(apiUrl(`/api/customers/${customerId}`), {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ followUpEnabled: !currentValue }),
      });
      if (!res.ok) throw new Error('Failed to update');
      await refreshCustomers(token);
      if (selectedCustomerId === customerId) loadCustomerActivity(customerId);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleTriggerFollowupAll = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    setFollowupAllLoading(true);
    try {
      const res = await fetch(apiUrl('/api/customers/trigger-followup-all'), {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ channel: 'voiceCall' }),
      });
      const data = await res.json();
      alert(data.message || 'Follow-up triggered for all eligible customers');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setFollowupAllLoading(false);
    }
  };

  const refreshDues = async (tokenOverride) => {
    const token = tokenOverride || localStorage.getItem('authToken');
    if (!token) return;

    setIsAnalyticsLoading(true);
    try {
      const response = await fetch(apiUrl('/api/dues'), {
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
// Cron job trigger handler to create reminders and inject voice messages via sockets. This allows users to receive TTS reminders in the correct conversation threads even if they were created by the cron and not by user interactions.
  const finance = useMemo(() => {
    const now = new Date();
    const monthKey = getMonthKey(now);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const summary = {
      totalRevenue: 0,
      pendingInvoices: 0,
      pendingAmount: 0,
      overdueInvoices: 0,
      overdueAmount: 0,
      paidThisMonth: 0,
      paidThisMonthCount: 0,
    };

    const aging = {
      current: { count: 0, amount: 0 },
      d1to30: { count: 0, amount: 0 },
      d31to60: { count: 0, amount: 0 },
      d61plus: { count: 0, amount: 0 },
    };

    const recentTransactions = [];
    const monthlyCollections = new Map();
// Initialize last 6 months for the monthly collections chart.
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = getMonthKey(d);
      monthlyCollections.set(key, {
        key,
        label: d.toLocaleDateString(undefined, { month: 'short' }),
        amount: 0,
      });
    }
// Iterate through dues to populate all analytics sections.
    dues.forEach((due) => {
      const amount = Number(due?.amount) || 0;
      const status = normalizeDueStatus(due?.status);
      const dueDate = due?.dueDate ? new Date(due.dueDate) : null;
      const paidAt = due?.updatedAt ? new Date(due.updatedAt) : null;

      if (status === 'PAID') {
        summary.totalRevenue += amount;

        if (paidAt && getMonthKey(paidAt) === monthKey) {
          summary.paidThisMonth += amount;
          summary.paidThisMonthCount += 1;
        }

        if (paidAt && monthlyCollections.has(getMonthKey(paidAt))) {
          monthlyCollections.get(getMonthKey(paidAt)).amount += amount;
        }

        recentTransactions.push({
          id: due?._id || `${due?.title}-${paidAt?.toISOString?.() || Date.now()}`,
          title: due?.title || 'Payment',
          amount,
          paidAt,
          method: 'Manual',
          reference: `TXN-${String(due?._id || '').slice(-6).toUpperCase() || 'N/A'}`,
        });
        return;
      }

      if (status === 'OVERDUE') {
        summary.overdueInvoices += 1;
        summary.overdueAmount += amount;
      }

      summary.pendingInvoices += 1;
      summary.pendingAmount += amount;

      if (!dueDate || dueDate >= today) {
        aging.current.count += 1;
        aging.current.amount += amount;
        return;
      }
// Calculate aging buckets based on how many days past due the invoice is.
      const dayDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (dayDiff <= 30) {
        aging.d1to30.count += 1;
        aging.d1to30.amount += amount;
      } else if (dayDiff <= 60) {
        aging.d31to60.count += 1;
        aging.d31to60.amount += amount;
      } else {
        aging.d61plus.count += 1;
        aging.d61plus.amount += amount;
      }
    });

    recentTransactions.sort((a, b) => (b.paidAt?.getTime?.() || 0) - (a.paidAt?.getTime?.() || 0));

    const monthlySeries = Array.from(monthlyCollections.values());
    const monthlyMax = monthlySeries.reduce((max, item) => Math.max(max, item.amount), 0);
// Handler for cron-triggered reminders to emit socket events with TTS audio and system messages in the correct conversation threads.
    const paymentMethods = [
      {
        id: 'stripe',
        name: 'Stripe',
        status: 'Not Connected',
        note: 'Cards, wallets, subscriptions',
      },
      {
        id: 'paypal',
        name: 'PayPal',
        status: 'Not Connected',
        note: 'Global checkout option',
      },
      {
        id: 'bank-transfer',
        name: 'Bank Transfer',
        status: 'Manual',
        note: 'Reconcile payments via admin flow',
      },
    ];

    return {
      summary,
      aging,
      recentTransactions: recentTransactions.slice(0, 8),
      paymentMethods,
      monthlySeries,
      monthlyMax,
    };
  }, [dues]);

  const financeActionRows = useMemo(() => {
    const rows = dues
      .filter((due) => normalizeDueStatus(due?.status) !== 'PAID')
      .map((due) => ({
        id: due?._id,
        title: due?.title || 'Untitled Due',
        amount: Number(due?.amount) || 0,
        status: normalizeDueStatus(due?.status),
        dueDate: due?.dueDate || null,
        snoozeDate: due?.snoozeDate || null,
        // Carry metadata flags so PTP / VERIFYING badges can render
        metadata: due?.metadata || {},
      }))
      .sort((a, b) => {
        // PTP and VERIFYING sort just below OVERDUE
        const priority = (s) => s === 'OVERDUE' ? 0 : (s === 'PTP' || s === 'VERIFYING') ? 1 : 2;
        if (priority(a.status) !== priority(b.status)) return priority(a.status) - priority(b.status);
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      });

    return rows.slice(0, 10);
  }, [dues]);

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
    const newSocket = io(socketUrl, {
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
      } else if (result.message) {
        // Browser TTS fallback when server TTS is unavailable
        try {
          const utterance = new SpeechSynthesisUtterance(result.message);
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          window.speechSynthesis.speak(utterance);
        } catch (_) { /* no-op */ }
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
      // Listen for reminder events: inject system messages, push to notification center, and play TTS audio.
    newSocket.on('reminder-voice', (payload) => {
      const reminderMessage = {
        id: payload?.reminderId || Date.now() + Math.random(),
        role: 'SYSTEM',
        message: payload?.message || 'You have a pending due reminder.',
        timestamp: payload?.createdAt ? new Date(payload.createdAt) : new Date(),
      };

      // Push to notification center
      const notif = {
        id: payload?.reminderId || `notif-${Date.now()}`,
        type: 'reminder',
        title: 'Due Reminder',
        message: payload?.message || 'You have a pending due reminder.',
        timestamp: new Date(),
        read: false,
      };
      setNotifications((prev) => [notif, ...prev].slice(0, 50));
      setUnreadCount((prev) => prev + 1);

      if (payload?.conversationId) {
        setConversations((prev) => {
          const exists = prev.some((conv) => conv.id === payload.conversationId);
          if (!exists) {
            refreshConversations(authToken).catch(() => { /* no-op */ });
            return prev;
          }
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
        refreshConversations(authToken).catch(() => { /* no-op */ });
      }

      if (payload?.audioFile) {
        playAudioResponse({ audioFile: payload.audioFile });
      }
    });

    newSocket.on('disconnect', () => setIsConnected(false));

    // ── PTP / Verification real-time badge updates ─────────────────────────
    // When the AI receives a verbal payment promise on a call, refresh dues
    // so the ⏳ / 🔍 badge appears in the Finance tab immediately.
    newSocket.on('due-ptp', () => {
      const tok = localStorage.getItem('authToken');
      if (tok) refreshDues(tok);
    });
    newSocket.on('due-verifying', () => {
      const tok = localStorage.getItem('authToken');
      if (tok) refreshDues(tok);
    });

    setSocket(newSocket);

    refreshConversations(authToken).catch((err) => {
      console.error('Failed to auto-load conversations:', err.message);
    });
    refreshDues(authToken);
    refreshCustomers(authToken);

    return () => newSocket.close();
  }, []);

  const startRecording = async () => {
    try {
      isCancelledRef.current = false;
      transcriptRef.current = '';

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
        recognitionRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (isCancelledRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onresult = (event) => {
          const t = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join(' ');
          transcriptRef.current = t;
        };
        recognitionRef.current = recognition;
        try { recognition.start(); } catch(e){}
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch(e){}
          recognitionRef.current = null;
        }
        if (!isCancelledRef.current) {
          sendAudioToServer();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      isCancelledRef.current = true;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e){}
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const sendAudioToServer = () => {
    if (!socket || !activeConversationId) {
      alert('Please select a bill chat first');
      return;
    }

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const reader = new FileReader();

    reader.onload = (event) => {
      const audioBuffer = new Uint8Array(event.target.result);
      const finalTranscript = transcriptRef.current || '';

      // Ignore phantom clicks or tiny glitch headers with no speech
      if ((!audioBuffer || audioBuffer.length < 500) && !finalTranscript.trim()) {
        setIsLoading(false);
        return;
      }

      const userMessage = {
        id: Date.now() + Math.random(),
        role: 'USER',
        message: finalTranscript || '[Audio message sent]',
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
        audioBuffer: Array.from(audioBuffer),
        transcript: finalTranscript
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
        audioRef.current.play().catch(() => { /* no-op */ });
      } else if (result.audioFile) {
        audioRef.current.src = apiUrl(result.audioFile);
        audioRef.current.play().catch(() => { /* no-op */ });
      }
    } catch {
      // no-op
    }
  };

  // ── Scroll chat to bottom whenever messages update ────────────────────────
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isLoading]);

  // ── Close notification panel on outside click ─────────────────────────────
  useEffect(() => {
    if (!notifOpen) return;
    const handleClickOutside = (e) => {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  // ── Mark all notifications as read when panel opens ───────────────────────
  useEffect(() => {
    if (notifOpen) {
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }, [notifOpen]);

  // ── Send text message via socket (transcript-only path) ───────────────────
  const sendTextMessage = useCallback(() => {
    const trimmed = textInput.trim();
    if (!trimmed) return;
    if (!socket || !activeConversationId) {
      alert('Please select a bill chat first.');
      return;
    }

    const userMessage = {
      id: Date.now() + Math.random(),
      role: 'USER',
      message: trimmed,
      timestamp: new Date(),
    };

    setConversations((prev) => prev.map((conv) => {
      if (conv.id !== activeConversationId) return conv;
      return {
        ...conv,
        messages: [...conv.messages, userMessage],
        lastActivityAt: new Date(),
      };
    }));

    setTextInput('');
    setIsLoading(true);

    socket.emit('voice-message', {
      conversationId: activeConversationId,
      userId: localStorage.getItem('userId'),
      audioBuffer: [],
      transcript: trimmed,
    });
  }, [textInput, socket, activeConversationId]);

  // ── Handle Enter key in text box (Shift+Enter = newline) ─────────────────
  const handleTextKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  }, [sendTextMessage]);

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

      let response = await fetch(apiUrl('/api/conversations'), {
        method: 'POST',
        headers: getAuthHeaders(authToken),
        body: JSON.stringify({ dueTitle, channel: 'VOICE' })
      });

      if (response.status === 409) {
        // Duplicate bill titles require voice due-date disambiguation.
        const duplicateData = await response.json();
        if (duplicateData?.requiresDueDate) {
          const spokenDueDate = await captureSingleUtterance('Multiple bills found. Say the due date.');
          response = await fetch(apiUrl('/api/conversations'), {
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
        audioRef.current.src = apiUrl(data.audioFile);
        audioRef.current.play();
      }
    } catch (error) {
      alert(`Network Error: ${error.message}`);
    }
  };

  const handleReceiptUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsScanningReceipt(true);
      setScannedReceiptData(null);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const authToken = localStorage.getItem('authToken');
          const res = await fetch(apiUrl('/api/dues/scan'), {
            method: 'POST',
            headers: getAuthHeaders(authToken),
            body: JSON.stringify({ imageBase64: reader.result, mimeType: file.type })
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.message || data.error || 'Failed to scan receipt');
          }
          setScannedReceiptData(data.data);
        } catch (err) {
          alert('Failed to scan receipt: ' + err.message);
        } finally {
          setIsScanningReceipt(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
    } catch (error) {
      setIsScanningReceipt(false);
      alert('Error reading file: ' + error.message);
    }
  };

  const confirmScannedDue = async () => {
    if (!scannedReceiptData) return;
    try {
      const authToken = localStorage.getItem('authToken');
      const res = await fetch(apiUrl('/api/dues'), {
        method: 'POST',
        headers: getAuthHeaders(authToken),
        body: JSON.stringify({
          title: scannedReceiptData.title,
          amount: scannedReceiptData.amount,
          dueDate: scannedReceiptData.dueDate,
          category: scannedReceiptData.category
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to create due');
      }

      setScannedReceiptData(null);
      await refreshDues(authToken);
      await refreshConversations(authToken);
      alert('✅ Due created successfully from scanned receipt!');
    } catch (err) {
      alert('Failed to create due: ' + err.message);
    }
  };

  const completeConversation = async (action) => {
    if (!activeConversationId) return;

    try {
      const response = await fetch(apiUrl(`/api/conversations/${activeConversationId}/complete`), {
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

  const performFinanceDueAction = async (dueId, action) => {
    if (!dueId || !action) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('You are not logged in. Please login first.');
      return;
    }

    const endpoint = action === 'PAID'
      ? apiUrl(`/api/dues/${dueId}/pay`)
      : apiUrl(`/api/dues/${dueId}/snooze`);

    const body = action === 'SNOOZE'
      ? JSON.stringify({ snoozeDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
      : null;

    setFinanceActionLoadingId(`${dueId}:${action}`);
    setFinanceActionNotice('');

    try {
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: getAuthHeaders(token),
        body,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || data?.error || 'Action failed');
      }

      await refreshDues(token);
      await refreshConversations(token);
      setFinanceActionNotice(action === 'PAID' ? 'Due marked paid.' : 'Due snoozed for 7 days.');
    } catch (error) {
      alert(`Finance action failed: ${error.message}`);
    } finally {
      setFinanceActionLoadingId(null);
    }
  };

  /**
   * Load Razorpay Checkout script dynamically when needed.
   * Returns a promise that resolves when the script is available as `window.Razorpay`.
   */
  const loadRazorpayScript = () => new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Failed to load Razorpay script'));
    document.body.appendChild(script);
  });

  /**
   * Perform an immediate payment flow for a due:
   * 1) Call backend `POST /api/payments/create` with `dueId` to obtain `orderId` + `keyId`.
   * 2) Load Razorpay Checkout script and open Checkout with the returned order.
   * 3) On successful Checkout, Razorpay calls the `handler` with payment ids — send them to
   *    backend `POST /api/payments/verify` to validate signature and mark the Due as PAID.
   * 4) Refresh local state (dues and conversations) after verification.
   */
  const performPayNow = async (dueId) => {
    if (!dueId) return;
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('Please login to make a payment');
      return;
    }

    setFinanceActionLoadingId(`${dueId}:PAYNOW`);
    setFinanceActionNotice('');

    try {
      // 1) Create order on server
      const createRes = await fetch(apiUrl('/api/payments/create'), {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ dueId }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create payment order');
      }

      const orderData = await createRes.json();


      // 2) Load Razorpay script
      await loadRazorpayScript();

      // 3) Open Checkout
      const options = {
        key: orderData.keyId, // public key returned from server
        amount: orderData.amount, // amount in paise as returned by server
        currency: orderData.currency,
        order_id: orderData.orderId,
        name: 'ConvDash',
        description: `Pay due ${orderData.dueId}`,
        handler: async function (response) {
          try {
            // 4) Verify payment on server
            const verifyRes = await fetch(apiUrl('/api/payments/verify'), {
              method: 'POST',
              headers: getAuthHeaders(token),
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                dueId: orderData.dueId,
              }),
            });

            if (!verifyRes.ok) {
              const err = await verifyRes.json().catch(() => ({}));
              throw new Error(err.message || 'Payment verification failed');
            }

            // Success: refresh local state so UI reflects paid due
            await refreshDues(token);
            await refreshConversations(token);
            setFinanceActionNotice('Payment successful — due marked PAID.');
          } catch (err) {
            alert(`Payment verification error: ${err.message}`);
          } finally {
            setFinanceActionLoadingId(null);
          }
        },
        modal: {
          ondismiss: function () {
            // User closed the Checkout without paying
            setFinanceActionLoadingId(null);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      alert(`Pay Now failed: ${error.message}`);
      setFinanceActionLoadingId(null);
    }
  };

  const deleteConversation = async () => {
    if (!activeConversationId) return;

    const shouldDelete = window.confirm('Delete this conversation?');
    if (!shouldDelete) return;

    try {
      const response = await fetch(apiUrl(`/api/conversations/${activeConversationId}`), {
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
    <div className="flex w-full h-screen overflow-hidden bg-background dark:bg-background-dark text-on-surface dark:text-on-surface-dark transition-colors duration-300 relative z-0">
      {/* Absolute Ambient Background Orbs for Glassmorphism */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 dark:bg-blue-600/30 blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-teal-400/20 dark:bg-teal-500/20 blur-[140px] pointer-events-none -z-10"></div>
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-purple-500/15 dark:bg-purple-600/20 blur-[100px] pointer-events-none -z-10"></div>
      
      {/* Mobile Backdrop Overlay */}
      {!isSidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`h-full glass-panel border-r border-outline-variant dark:border-outline-variant-dark flex-col gap-stack-md transition-all duration-300 shrink-0 ${
        isSidebarCollapsed 
          ? 'hidden w-0 p-0 border-none overflow-hidden' 
          : 'flex fixed inset-y-0 left-0 z-40 w-[280px] p-6 md:relative md:w-[280px] md:z-30 shadow-2xl md:shadow-none bg-surface dark:bg-surface-dark md:bg-transparent'
      }`}>
        <div className={`flex items-center gap-stack-sm mb-stack-lg overflow-hidden ${isSidebarCollapsed ? 'justify-center w-full' : ''}`}>
          <div className="w-10 h-10 bg-primary dark:bg-primary-dark rounded flex items-center justify-center text-on-primary shrink-0">
            <span className="material-symbols-outlined font-bold">account_balance</span>
          </div>
          {!isSidebarCollapsed && (
            <div className="whitespace-nowrap">
              <h1 className="font-headline-md text-headline-md text-primary dark:text-primary-dark leading-none">ConvDash</h1>
              <p className="font-label-md text-label-md text-on-surface-variant dark:text-on-surface-variant-dark uppercase tracking-widest">Dashboard</p>
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden w-full">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <div
                key={item.key}
                onClick={() => {
                  setActiveTab(item.key);
                  if (typeof window !== 'undefined' && window.innerWidth < 768) setIsSidebarCollapsed(true);
                }}
                className={`flex items-center gap-stack-md ${isSidebarCollapsed ? 'justify-center p-3 w-full' : 'px-stack-md py-3 w-full'} rounded-lg cursor-pointer transition-all duration-200 ${
                  isActive 
                    ? 'text-primary dark:text-primary-dark font-bold bg-primary-container dark:bg-primary-container-dark' 
                    : 'text-on-surface-variant dark:text-on-surface-variant-dark font-medium hover:text-primary dark:hover:text-primary-dark hover:bg-surface-container-low dark:hover:bg-surface-container-low-dark'
                }`}
                title={item.label}
              >
                <span className="material-symbols-outlined shrink-0" data-icon={item.icon}>{item.icon}</span>
                {!isSidebarCollapsed && (
                  <span className="font-label-md text-label-md flex-1 whitespace-nowrap">
                    {item.label}
                    {item.soon && <span className="ml-2 text-[10px] bg-outline-variant/30 px-2 py-0.5 rounded">Soon</span>}
                  </span>
                )}
              </div>
            );
          })}
        </nav>
        <div className={`pt-stack-lg border-t border-outline-variant dark:border-outline-variant-dark space-y-1 overflow-hidden w-full ${isSidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
          <div className={`flex items-center gap-stack-md ${isSidebarCollapsed ? 'justify-center p-3 w-full' : 'px-stack-md py-3 w-full'} text-on-surface-variant dark:text-on-surface-variant-dark font-medium hover:text-primary dark:hover:text-primary-dark hover:bg-surface-container-low dark:hover:bg-surface-container-low-dark rounded-lg cursor-pointer transition-all duration-200`}>
            <span className="material-symbols-outlined shrink-0" data-icon="help_outline">help_outline</span>
            {!isSidebarCollapsed && <span className="font-label-md text-label-md whitespace-nowrap">Support</span>}
          </div>
          <div 
            className={`flex items-center gap-stack-md ${isSidebarCollapsed ? 'justify-center p-3 w-full' : 'px-stack-md py-3 w-full'} text-on-surface-variant dark:text-on-surface-variant-dark font-medium hover:text-error hover:bg-error/5 rounded-lg cursor-pointer transition-all duration-200`}
            onClick={() => { if (typeof onLogout === 'function') onLogout(); }}
          >
            <span className="material-symbols-outlined shrink-0" data-icon="logout">logout</span>
            {!isSidebarCollapsed && <span className="font-label-md text-label-md whitespace-nowrap">Sign Out</span>}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden transition-all duration-300">
        {/* TopNavBar */}
        <header className="w-full h-16 glass-panel border-b border-outline-variant dark:border-outline-variant-dark flex justify-between items-center px-container-padding sticky top-0 z-20 transition-colors duration-300 shrink-0">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className="text-on-surface-variant dark:text-on-surface-variant-dark hover:bg-surface-container-low p-2 rounded-full"
            >
              <span className="material-symbols-outlined">{isSidebarCollapsed ? 'menu_open' : 'menu'}</span>
            </button>
            <div className="flex items-center bg-surface-container-low dark:bg-surface-container-low-dark rounded-full px-3 py-1.5 w-32 sm:w-48 md:w-64 lg:w-96 border border-outline-variant/50 dark:border-outline-variant-dark/50 focus-within:border-primary transition-all duration-300">
              <span className="material-symbols-outlined text-on-surface-variant dark:text-on-surface-variant-dark mr-2" style={{fontSize: '18px'}}>search</span>
              <input 
                className="bg-transparent border-none focus:outline-none focus:ring-0 text-body-sm w-full placeholder:text-on-surface-variant dark:placeholder:text-on-surface-variant-dark text-on-surface dark:text-on-surface-dark" 
                placeholder="Search..." 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-stack-md">
            <div className="flex gap-2">
              <button 
                className="p-2 text-on-surface-variant dark:text-on-surface-variant-dark hover:bg-surface-container-low dark:hover:bg-surface-container-low-dark rounded-full transition-colors" 
                title="Toggle theme"
                onClick={() => {
                  const htmlElement = document.documentElement;
                  if (htmlElement.classList.contains('dark')) {
                      htmlElement.classList.remove('dark');
                      localStorage.setItem('theme', 'light');
                  } else {
                      htmlElement.classList.add('dark');
                      localStorage.setItem('theme', 'dark');
                  }
                }}
              >
                <span className="material-symbols-outlined dark:hidden">dark_mode</span>
                <span className="material-symbols-outlined hidden dark:block">light_mode</span>
              </button>
              {/* ── Notification Bell ── */}
              <div className="relative" ref={notifPanelRef}>
                <button
                  id="notif-bell-btn"
                  aria-label="Notifications"
                  aria-expanded={notifOpen}
                  aria-haspopup="true"
                  className="p-2 text-on-surface-variant dark:text-on-surface-variant-dark hover:bg-surface-container-low dark:hover:bg-surface-container-low-dark rounded-full transition-colors relative"
                  onClick={() => setNotifOpen((prev) => !prev)}
                >
                  <span className="material-symbols-outlined">notifications</span>
                  {unreadCount > 0 && (
                    <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                  {isConnected && unreadCount === 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 dark:bg-blue-400 rounded-full border border-white dark:border-surface-container" />
                  )}
                </button>

                {/* ── Notification Dropdown Panel ── */}
                {notifOpen && (
                  <div
                    id="notif-panel"
                    role="dialog"
                    aria-label="Notifications panel"
                    className="notif-panel"
                  >
                    <div className="notif-panel-header">
                      <span>Notifications</span>
                      {notifications.length > 0 && (
                        <button
                          className="notif-clear-btn"
                          onClick={() => { setNotifications([]); setUnreadCount(0); }}
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    <div className="notif-list">
                      {notifications.length === 0 ? (
                        <div className="notif-empty">
                          <span className="material-symbols-outlined" style={{ fontSize: 32, opacity: 0.35 }}>notifications_none</span>
                          <p>No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`notif-item ${notif.read ? 'read' : 'unread'}`}
                          >
                            <span className="notif-icon material-symbols-outlined">
                              {notif.type === 'reminder' ? 'alarm' : 'info'}
                            </span>
                            <div className="notif-content">
                              <p className="notif-title">{notif.title}</p>
                              <p className="notif-msg">{notif.message}</p>
                              <p className="notif-time">
                                {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 pl-stack-md border-l border-outline-variant dark:border-outline-variant-dark transition-colors duration-300">
              <div className="text-right hidden sm:block">
                <p className="font-label-md text-label-md text-on-surface dark:text-on-surface-dark font-semibold">{profile?.name || 'User'}</p>
                <p className="text-[10px] text-primary dark:text-primary-dark uppercase tracking-widest font-bold">{profile?.role || 'Member'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary-container dark:bg-primary-container-dark border border-primary/20 flex items-center justify-center font-bold text-primary dark:text-primary-dark">
                {profileInitials}
              </div>
            </div>
          </div>
        </header>

        {/* Canvas */}
        <div className="flex-1 p-container-padding space-y-gutter relative overflow-y-auto">
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 dark:bg-primary-dark/5 rounded-full blur-[120px] -z-10 translate-x-1/2 -translate-y-1/2 transition-colors duration-300 pointer-events-none"></div>

        {/* ── Contacts Tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'contacts' ? (
          <div style={{ padding: '0 0 32px 0' }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--color-on-surface, #e2e8f0)' }}>Contacts</h2>
                <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant, #94a3b8)', margin: '4px 0 0' }}>Customers & Suppliers — click any row to view activity</p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  id="contacts-followup-all-btn"
                  onClick={handleTriggerFollowupAll}
                  disabled={followupAllLoading}
                  style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 13, opacity: followupAllLoading ? 0.7 : 1 }}
                >
                  {followupAllLoading ? '⏳ Triggering...' : '🚀 Follow-Up ALL'}
                </button>
                <button
                  id="contacts-add-customer-btn"
                  onClick={() => setShowAddCustomerModal(true)}
                  style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.4)', padding: '9px 18px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                >
                  + Add Customer
                </button>
                <button
                  onClick={() => refreshCustomers()}
                  style={{ background: 'transparent', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.3)', padding: '9px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 13 }}
                  title="Refresh"
                >⟳</button>
              </div>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 16, maxWidth: 360 }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#64748b' }}>search</span>
              <input
                id="contacts-search-input"
                type="text"
                placeholder="Search by name, place..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                style={{ width: '100%', padding: '9px 12px 9px 38px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.25)', background: 'rgba(15,23,42,0.5)', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            {/* Customers Table */}
            {isCustomersLoading ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '60px 0' }}>Loading customers...</div>
            ) : customers.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '60px 0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>people_outline</span>
                <p style={{ margin: 0, fontSize: 15 }}>No customers yet</p>
                <p style={{ margin: '6px 0 0', fontSize: 12 }}>Click "Add Customer" to get started</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
                      {['Customer Name','Contact No','Place','Amount Due','Ageing','Status','Action'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customers
                      .filter(c => {
                        const q = customerSearch.toLowerCase();
                        return !q || c.name?.toLowerCase().includes(q) || c.place?.toLowerCase().includes(q) || c.contactNo?.includes(q);
                      })
                      .map(c => {
                        const agingColor = { current: '#22c55e', '0-30': '#f59e0b', '31-60': '#f97316', '61-90': '#ef4444', '90+': '#7f1d1d' };
                        return (
                          <tr key={c._id} style={{ borderBottom: '1px solid rgba(148,163,184,0.08)', transition: 'background 0.15s', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.06)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '12px 14px', fontWeight: 600, color: '#e2e8f0' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                                  {c.name?.[0]?.toUpperCase() || '?'}
                                </span>
                                {c.name}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', color: '#94a3b8' }}>{c.contactNo || '—'}</td>
                            <td style={{ padding: '12px 14px', color: '#94a3b8' }}>{c.place || '—'}</td>
                            <td style={{ padding: '12px 14px', fontWeight: 600, color: c.totalDue > 0 ? '#f87171' : '#22c55e' }}>
                              {formatCurrency(c.totalDue || 0)}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: agingColor[c.agingBucket || 'current'] + '22', color: agingColor[c.agingBucket || 'current'] }}>
                                {c.agingBucket || 'Current'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: c.status === 'Active' ? '#22c55e22' : '#ef444422', color: c.status === 'Active' ? '#22c55e' : '#ef4444' }}>
                                {c.status}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  id={`contacts-view-btn-${c._id}`}
                                  onClick={() => openCustomerDrawer(c._id)}
                                  style={{ fontSize: 11, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.1)', color: '#818cf8', cursor: 'pointer', fontWeight: 600 }}
                                >View</button>
                                <button
                                  id={`contacts-followup-btn-${c._id}`}
                                  onClick={async () => {
                                    const token = localStorage.getItem('authToken');
                                    if (!token) return;
                                    try {
                                      const res = await fetch(apiUrl(`/api/customers/${c._id}/trigger-followup`), { method: 'POST', headers: getAuthHeaders(token), body: JSON.stringify({ channel: 'voiceCall' }) });
                                      const d = await res.json();
                                      alert(d.message || 'Follow-up triggered');
                                    } catch(e) { alert('Error: ' + e.message); }
                                  }}
                                  style={{ fontSize: 11, padding: '5px 10px', borderRadius: 7, border: 'none', background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                                >Follow-Up</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Add Customer Modal ─────────────────────────────────────────── */}
            {showAddCustomerModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
                <div style={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 460, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
                  <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Add New Customer</h3>
                  {[
                    { key: 'name', label: 'Customer Name *', placeholder: 'e.g. Rajesh Traders', type: 'text' },
                    { key: 'contactNo', label: 'Contact Number', placeholder: 'e.g. +919876543210', type: 'text' },
                    { key: 'email', label: 'Email', placeholder: 'e.g. rajesh@example.com', type: 'email' },
                    { key: 'place', label: 'City / Place', placeholder: 'e.g. Mumbai', type: 'text' },
                    { key: 'notes', label: 'Notes', placeholder: 'Optional notes...', type: 'text' },
                  ].map(f => (
                    <div key={f.key} style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 5 }}>{f.label}</label>
                      <input
                        id={`add-customer-${f.key}`}
                        type={f.type}
                        placeholder={f.placeholder}
                        value={newCustomerForm[f.key]}
                        onChange={e => setNewCustomerForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(30,41,59,0.8)', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button onClick={() => { setShowAddCustomerModal(false); setNewCustomerForm({ name: '', contactNo: '', email: '', place: '', notes: '' }); }}
                      style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}>
                      Cancel
                    </button>
                    <button
                      id="add-customer-submit-btn"
                      onClick={handleAddCustomer}
                      disabled={addCustomerLoading}
                      style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: addCustomerLoading ? 0.7 : 1 }}>
                      {addCustomerLoading ? 'Saving...' : 'Add Customer'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Customer Activity Drawer ───────────────────────────────────── */}
            {customerDrawerOpen && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 900, display: 'flex' }}>
                {/* backdrop */}
                <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={closeCustomerDrawer} />
                {/* drawer panel */}
                <div style={{ width: '100%', maxWidth: 520, background: '#0f172a', borderLeft: '1px solid rgba(99,102,241,0.25)', overflowY: 'auto', padding: 28, boxShadow: '-20px 0 60px rgba(0,0,0,0.5)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>
                      {isDrawerLoading ? 'Loading...' : customerActivity?.customer?.name || 'Customer'}
                    </h3>
                    <button onClick={closeCustomerDrawer} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>✕</button>
                  </div>

                  {isDrawerLoading ? (
                    <div style={{ color: '#64748b', textAlign: 'center', padding: '40px 0' }}>Loading activity...</div>
                  ) : customerActivity ? (
                    <>
                      {/* Customer info row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                        {[
                          { label: 'Contact', value: customerActivity.customer?.contactNo || '—' },
                          { label: 'Email', value: customerActivity.customer?.email || '—' },
                          { label: 'Place', value: customerActivity.customer?.place || '—' },
                          { label: 'Status', value: customerActivity.customer?.status || '—' },
                        ].map(item => (
                          <div key={item.label} style={{ background: 'rgba(30,41,59,0.6)', borderRadius: 10, padding: '10px 14px' }}>
                            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>{item.label}</div>
                            <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{item.value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Summary stats */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                        <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: 10, padding: '12px 16px', border: '1px solid rgba(239,68,68,0.2)' }}>
                          <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 3 }}>Total Outstanding</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: '#f87171' }}>{formatCurrency(customerActivity.summary?.totalDue || 0)}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{customerActivity.summary?.pendingCount || 0} pending invoices</div>
                        </div>
                        <div style={{ background: 'rgba(34,197,94,0.1)', borderRadius: 10, padding: '12px 16px', border: '1px solid rgba(34,197,94,0.2)' }}>
                          <div style={{ fontSize: 11, color: '#22c55e', marginBottom: 3 }}>Total Collected</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: '#4ade80' }}>{formatCurrency(customerActivity.summary?.paidAmount || 0)}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>{customerActivity.summary?.paidCount || 0} paid invoices</div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                        <button
                          onClick={async () => {
                            const token = localStorage.getItem('authToken');
                            if (!token) return;
                            const r = await fetch(apiUrl(`/api/customers/${selectedCustomerId}/trigger-followup`), { method: 'POST', headers: getAuthHeaders(token), body: JSON.stringify({ channel: 'voiceCall' }) });
                            const d = await r.json();
                            alert(d.message || 'Follow-up triggered');
                          }}
                          style={{ flex: 1, minWidth: 120, padding: '9px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                        >🚀 Send Follow-Up</button>
                        <button
                          onClick={() => setShowAddInvoiceModal(true)}
                          style={{ flex: 1, minWidth: 120, padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.15)', color: '#818cf8', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                        >+ Add Invoice</button>
                        <button
                          onClick={() => handleToggleFollowUp(selectedCustomerId, customerActivity.customer?.followUpEnabled)}
                          style={{ flex: 1, minWidth: 120, padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.25)', background: 'transparent', color: customerActivity.customer?.followUpEnabled ? '#ef4444' : '#22c55e', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                        >{customerActivity.customer?.followUpEnabled ? '⏸ Stop' : '▶ Start'}</button>
                      </div>

                      {/* ── Add Invoice Modal for Customer ── */}
                      {showAddInvoiceModal && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
                          <div style={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
                            <h4 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Add Invoice for {customerActivity.customer?.name}</h4>
                            <div style={{ marginBottom: 12 }}>
                              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Title / Item Name *</label>
                              <input type="text" placeholder="e.g. Order #104 - Web Development" value={newInvoiceForm.title} onChange={e => setNewInvoiceForm(p => ({ ...p, title: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(30,41,59,0.8)', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                            </div>
                            <div style={{ marginBottom: 12 }}>
                              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Amount (₹) *</label>
                              <input type="number" placeholder="e.g. 15000" value={newInvoiceForm.amount} onChange={e => setNewInvoiceForm(p => ({ ...p, amount: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(30,41,59,0.8)', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                            </div>
                            <div style={{ marginBottom: 12 }}>
                              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Due Date *</label>
                              <input type="date" value={newInvoiceForm.dueDate} onChange={e => setNewInvoiceForm(p => ({ ...p, dueDate: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(30,41,59,0.8)', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                            </div>
                            <div style={{ marginBottom: 16 }}>
                              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Invoice No (Optional)</label>
                              <input type="text" placeholder="e.g. INV-2026-001" value={newInvoiceForm.invoiceNo} onChange={e => setNewInvoiceForm(p => ({ ...p, invoiceNo: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(30,41,59,0.8)', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box', outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => setShowAddInvoiceModal(false)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid rgba(148,163,184,0.2)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>Cancel</button>
                              <button onClick={handleAddInvoiceForCustomer} disabled={addInvoiceLoading} style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 12, opacity: addInvoiceLoading ? 0.7 : 1 }}>{addInvoiceLoading ? 'Saving...' : 'Add Invoice'}</button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Invoices list */}
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoices ({customerActivity.dues?.length || 0})</h4>
                      {(customerActivity.dues || []).length === 0 ? (
                        <p style={{ color: '#64748b', fontSize: 13 }}>No invoices linked to this customer yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {(customerActivity.dues || []).map(due => {
                            const statusColor = { PAID: '#22c55e', UNPAID: '#f59e0b', OVERDUE: '#ef4444', PTP: '#8b5cf6', VERIFYING: '#06b6d4' };
                            const agingColor = { current: '#22c55e', '0-30': '#f59e0b', '31-60': '#f97316', '61-90': '#ef4444', '90+': '#7f1d1d' };
                            return (
                              <div key={due._id} style={{ background: 'rgba(30,41,59,0.5)', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(148,163,184,0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div>
                                    <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 13 }}>{due.title}</div>
                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                                      {due.invoiceNo ? `#${due.invoiceNo} · ` : ''} Due {formatDate(due.dueDate)}
                                    </div>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: due.status === 'PAID' ? '#4ade80' : '#f87171' }}>{formatCurrency(due.amount)}</div>
                                    <div style={{ display: 'flex', gap: 4, marginTop: 4, justifyContent: 'flex-end' }}>
                                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: (statusColor[due.status] || '#94a3b8') + '22', color: statusColor[due.status] || '#94a3b8' }}>
                                        {due.status}
                                      </span>
                                      {due.status !== 'PAID' && (
                                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: (agingColor[due.agingBucket || 'current']) + '22', color: agingColor[due.agingBucket || 'current'] }}>
                                          {due.agingBucket || 'Current'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {due.status !== 'PAID' && (
                                  <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                                    <button
                                      onClick={async () => {
                                        const token = localStorage.getItem('authToken');
                                        if (!token) return;
                                        if (!window.confirm('Mark this invoice as PAID?')) return;
                                        const r = await fetch(apiUrl(`/api/dues/${due._id}/pay`), { method: 'PATCH', headers: getAuthHeaders(token) });
                                        if (r.ok) { await loadCustomerActivity(selectedCustomerId); await refreshCustomers(); }
                                        else alert('Failed to mark as paid');
                                      }}
                                      style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.1)', color: '#22c55e', cursor: 'pointer', fontWeight: 600 }}
                                    >✓ Mark Paid</button>
                                    <button
                                      onClick={async () => {
                                        const token = localStorage.getItem('authToken');
                                        if (!token) return;
                                        const r = await fetch(apiUrl(`/api/dues/${due._id}/snooze`), { method: 'PATCH', headers: getAuthHeaders(token), body: JSON.stringify({ snoozeDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }) });
                                        if (r.ok) { await loadCustomerActivity(selectedCustomerId); await refreshCustomers(); }
                                        else alert('Failed to snooze');
                                      }}
                                      style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(148,163,184,0.25)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}
                                    >⏰ Snooze 7d</button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'finance' ? (
          <div className="finance-dashboard glass-panel rounded-2xl shadow-xl">
            <div className="finance-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2>Finance</h2>
                <p>{isAnalyticsLoading ? 'Refreshing finance metrics...' : 'Operational billing and collections overview.'}</p>
              </div>
              <button 
                className="new-conversation-btn" 
                style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', margin: 0 }} 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isScanningReceipt}
              >
                {isScanningReceipt ? '🤖 Scanning...' : '📸 AI Scan Bill / Receipt'}
              </button>
            </div>

            <div className="finance-kpis">
              <article className="finance-kpi-card glass-panel rounded-xl">
                <span>Total Revenue</span>
                <strong>{formatCurrency(finance.summary.totalRevenue)}</strong>
                <small>All paid invoices</small>
              </article>
              <article className="finance-kpi-card glass-panel rounded-xl">
                <span>Invoice Pending</span>
                <strong>{finance.summary.pendingInvoices}</strong>
                <small>{formatCurrency(finance.summary.pendingAmount)} outstanding</small>
              </article>
              <article className="finance-kpi-card danger glass-panel rounded-xl">
                <span>Overdue</span>
                <strong>{finance.summary.overdueInvoices}</strong>
                <small>{formatCurrency(finance.summary.overdueAmount)} at risk</small>
              </article>
              <article className="finance-kpi-card success glass-panel rounded-xl">
                <span>Paid This Month</span>
                <strong>{formatCurrency(finance.summary.paidThisMonth)}</strong>
                <small>{finance.summary.paidThisMonthCount} invoices cleared</small>
              </article>
            </div>

            <div className="finance-middle-grid">
              <section className="finance-card glass-panel rounded-xl">
                <h3>Collections (Last 6 Months)</h3>
                <div className="collections-bars">
                  {finance.monthlySeries.map((point) => (
                    <div key={point.key} className="collections-row">
                      <span>{point.label}</span>
                      <div className="collections-track">
                        <div
                          className="collections-fill"
                          style={{ width: `${finance.monthlyMax > 0 ? Math.max((point.amount / finance.monthlyMax) * 100, point.amount > 0 ? 6 : 0) : 0}%` }}
                        ></div>
                      </div>
                      <b>{formatCurrency(point.amount)}</b>
                    </div>
                  ))}
                </div>
              </section>

              <section className="finance-card glass-panel rounded-xl">
                <h3>Invoice Aging</h3>
                <div className="aging-grid">
                  <div>
                    <span>Current</span>
                    <strong>{finance.aging.current.count}</strong>
                    <small>{formatCurrency(finance.aging.current.amount)}</small>
                  </div>
                  <div>
                    <span>1-30 Days</span>
                    <strong>{finance.aging.d1to30.count}</strong>
                    <small>{formatCurrency(finance.aging.d1to30.amount)}</small>
                  </div>
                  <div>
                    <span>31-60 Days</span>
                    <strong>{finance.aging.d31to60.count}</strong>
                    <small>{formatCurrency(finance.aging.d31to60.amount)}</small>
                  </div>
                  <div>
                    <span>61+ Days</span>
                    <strong>{finance.aging.d61plus.count}</strong>
                    <small>{formatCurrency(finance.aging.d61plus.amount)}</small>
                  </div>
                </div>
              </section>
            </div>

            <section className="finance-actions-card glass-panel rounded-xl">
              <div className="finance-actions-head">
                <h3>Finance Actions</h3>
                <span>Mark dues paid or snooze reminders directly from here.</span>
              </div>
              {financeActionNotice && <p className="finance-action-notice">{financeActionNotice}</p>}

              {financeActionRows.length === 0 ? (
                <p className="finance-empty">No actionable dues right now.</p>
              ) : (
                <div className="finance-actions-list">
                  {financeActionRows.map((item) => {
                    const payLoading = financeActionLoadingId === `${item.id}:PAID`;
                    const snoozeLoading = financeActionLoadingId === `${item.id}:SNOOZE`;
                    const payNowLoading = financeActionLoadingId === `${item.id}:PAYNOW`;

                    // Determine PTP / VERIFYING display metadata
                    const isPtp = item.status === 'PTP';
                    const isVerifying = item.status === 'VERIFYING';
                    const ptpDate = item.metadata?.promisedFor
                      ? formatDate(item.metadata.promisedFor)
                      : 'today';
                    const claimedDate = item.metadata?.claimedPaidAt
                      ? formatDate(item.metadata.claimedPaidAt)
                      : 'recently';

                    return (
                      <article key={item.id} className={`finance-action-row hover:bg-surface-container-low dark:hover:bg-surface-container-low-dark transition-colors duration-200${isPtp ? ' ptp-row' : ''}${isVerifying ? ' verifying-row' : ''}`}>
                        <div className="finance-action-main">
                          <h4>
                            {item.title}
                            {isPtp && (
                              <span className="ptp-badge" title="User promised to pay via voice call — not yet confirmed">
                                ⏳ Promised for Today
                              </span>
                            )}
                            {isVerifying && (
                              <span className="verifying-badge" title="User claimed payment on call — awaiting admin verification">
                                🔍 Verifying Payment
                              </span>
                            )}
                          </h4>
                          <p>
                            {formatCurrency(item.amount)} • Due {formatDate(item.dueDate)}
                            {isPtp && ` • AI heard promise on ${ptpDate} — will follow up if unpaid`}
                            {isVerifying && ` • User claimed paid on ${claimedDate} — please check your bank`}
                            {!isPtp && !isVerifying && item.snoozeDate ? ` • Snoozed until ${formatDate(item.snoozeDate)}` : ''}
                          </p>
                        </div>
                        <div className="finance-action-right">
                          <span className={`finance-row-status ${
                            item.status === 'OVERDUE' ? 'overdue'
                            : item.status === 'PTP' ? 'ptp'
                            : item.status === 'VERIFYING' ? 'verifying'
                            : 'pending'
                          }`}>
                            {item.status === 'PTP' ? 'Promise to Pay'
                              : item.status === 'VERIFYING' ? 'Verifying'
                              : item.status}
                          </span>
                          <button
                            type="button"
                            className="finance-inline-btn paid"
                            onClick={() => performFinanceDueAction(item.id, 'PAID')}
                            disabled={Boolean(financeActionLoadingId)}
                          >
                            {payLoading ? 'Saving...' : 'Mark Paid'}
                          </button>

                          {/* Pay Now button opens Razorpay Checkout and verifies payment */}
                          <button
                            type="button"
                            className="finance-inline-btn paynow"
                            onClick={() => performPayNow(item.id)}
                            disabled={Boolean(financeActionLoadingId)}
                          >
                            {payNowLoading ? 'Processing...' : 'Pay Now'}
                          </button>
                          <button
                            type="button"
                            className="finance-inline-btn snooze"
                            onClick={() => performFinanceDueAction(item.id, 'SNOOZE')}
                            disabled={Boolean(financeActionLoadingId)}
                          >
                            {snoozeLoading ? 'Saving...' : 'Snooze +7d'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="finance-bottom-card glass-panel rounded-xl">
              <div className="finance-bottom-tabs">
                <button
                  type="button"
                  className={`finance-tab-btn ${financeBottomTab === 'paymentMethods' ? 'active' : ''}`}
                  onClick={() => setFinanceBottomTab('paymentMethods')}
                >
                  Payment Methods
                </button>
                <button
                  type="button"
                  className={`finance-tab-btn ${financeBottomTab === 'recentTransactions' ? 'active' : ''}`}
                  onClick={() => setFinanceBottomTab('recentTransactions')}
                >
                  Recent Transactions
                </button>
              </div>

              {financeBottomTab === 'paymentMethods' ? (
                <div className="payment-methods-list">
                  {finance.paymentMethods.map((method) => (
                    <article key={method.id} className="payment-method-item">
                      <div>
                        <h4>{method.name}</h4>
                        <p>{method.note}</p>
                      </div>
                      <div className="payment-method-actions">
                        <span className={`method-status ${method.status === 'Not Connected' ? 'pending' : 'ready'}`}>{method.status}</span>
                        <button type="button">Configure</button>
                      </div>
                    </article>
                  ))}
                  <div className="integration-note">
                    Integration-ready: configure provider keys, webhooks, and payout settings when payment gateway is enabled.
                  </div>
                </div>
              ) : (
                <div className="transactions-list">
                  {finance.recentTransactions.length === 0 ? (
                    <p className="finance-empty">No paid transactions yet.</p>
                  ) : (
                    finance.recentTransactions.map((txn) => (
                      <article key={txn.id} className="transaction-item">
                        <div>
                          <h4>{txn.title}</h4>
                          <p>{txn.paidAt ? txn.paidAt.toLocaleString() : 'Date unavailable'}</p>
                        </div>
                        <div className="transaction-right">
                          <strong>{formatCurrency(txn.amount)}</strong>
                          <span>{txn.method} • {txn.reference}</span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'analytics' ? (
          <div className="analytics-dashboard glass-panel rounded-2xl shadow-xl">
            <div className="analytics-head">
              <h2>Analytics</h2>
              <p>{isAnalyticsLoading ? 'Refreshing metrics...' : 'Live overview of dues and voice collections.'}</p>
            </div>

            <div className="analytics-kpis">
              <article className="kpi-card glass-panel rounded-xl">
                <span className="kpi-label">Total Dues</span>
                <strong className="kpi-value">{analytics.duesCount}</strong>
                <small className="kpi-sub">{formatCurrency(analytics.totals.totalAmount)} tracked</small>
              </article>
              <article className="kpi-card glass-panel rounded-xl">
                <span className="kpi-label">Overdue Exposure</span>
                <strong className="kpi-value danger">{formatCurrency(analytics.totals.overdueAmount)}</strong>
                <small className="kpi-sub">{analytics.totals.overdue} overdue dues</small>
              </article>
              <article className="kpi-card glass-panel rounded-xl">
                <span className="kpi-label">Collected</span>
                <strong className="kpi-value success">{formatCurrency(analytics.totals.paidAmount)}</strong>
                <small className="kpi-sub">
                  {analytics.totals.paid} paid dues • Avg delay {formatDays(analytics.totals.avgPaymentDelayDays)}
                </small>
              </article>
              <article className="kpi-card glass-panel rounded-xl">
                <span className="kpi-label">Upcoming (7d)</span>
                <strong className="kpi-value">{analytics.totals.upcoming7Days}</strong>
                <small className="kpi-sub">Non-paid dues due soon</small>
              </article>
            </div>

            <div className="analytics-grid">
              <section className="analytics-card glass-panel rounded-xl">
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

              <section className="analytics-card glass-panel rounded-xl">
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

              <section className="analytics-card overdue-list-card glass-panel rounded-xl">
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
        ) : activeTab === 'intellige' ? (
          <div className="tab-placeholder glass-panel rounded-2xl shadow-xl">
            <h2>Intellige</h2>
            <p>Soon to be released.</p>
          </div>
        ) : activeTab !== 'conversations' ? (
          <div className="tab-placeholder glass-panel rounded-2xl shadow-xl">
            <h2>{NAV_ITEMS.find((n) => n.key === activeTab)?.label}</h2>
            <p>This tab is intentionally empty for now.</p>
          </div>
        ) : (
          <div className="conversation-dashboard">
            <div className="conversation-list-panel glass-panel rounded-xl">
              <div className="conversation-list-header">
                <h1>Conversations</h1>
                <p>Review and manage your AI voice interactions.</p>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button className="new-conversation-btn" style={{ flex: 1, marginBottom: 0 }} onClick={createConversation} disabled={!isConnected}>
                  + Add dues
                </button>
                <button 
                  className="new-conversation-btn" 
                  style={{ flex: 1, marginBottom: 0, background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff', border: 'none' }} 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isScanningReceipt}
                >
                  {isScanningReceipt ? '🤖 Scanning...' : '📸 Scan Receipt'}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*,application/pdf" 
                  style={{ display: 'none' }} 
                  onChange={handleReceiptUpload} 
                />
              </div>
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

            <div className="conversation-chat-panel glass-panel rounded-xl">
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
                    {/* Anchor element for auto-scroll to bottom */}
                    <div ref={messagesEndRef} style={{ height: 0 }} aria-hidden="true" />
                  </div>

                  <div className="controls">
                    {/* ── Single-row input bar: textarea | mic | send ── */}
                    <div className="wa-input-bar">
                      <textarea
                        ref={textInputRef}
                        id="chat-text-input"
                        className="chat-text-input"
                        rows={1}
                        placeholder={isRecording ? '🔴 Recording…' : 'Message or hold mic to speak…'}
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        onKeyDown={handleTextKeyDown}
                        disabled={isLoading || !activeConversationId || !isConnected}
                        aria-label="Type a message"
                      />

                      {/* Mic button — always visible, dims when typing */}
                      <button
                        type="button"
                        className={`wa-action-btn mic-btn${isRecording ? ' recording' : ''}${textInput.trim() ? ' dimmed' : ''}`}
                        onMouseDown={startRecording}
                        onMouseUp={stopRecording}
                        onTouchStart={startRecording}
                        onTouchEnd={stopRecording}
                        disabled={!!textInput.trim() || !isConnected || isLoading || !activeConversationId}
                        aria-label={isRecording ? 'Recording in progress' : 'Hold to record voice'}
                      >
                        <span className="material-symbols-outlined">
                          {isRecording ? 'radio_button_checked' : 'mic'}
                        </span>
                      </button>

                      {/* Send button — always visible, dims when no text */}
                      <button
                        id="chat-send-btn"
                        type="button"
                        className={`wa-action-btn send-btn${!textInput.trim() ? ' dimmed' : ''}`}
                        onClick={sendTextMessage}
                        disabled={!textInput.trim() || isLoading || !activeConversationId || !isConnected}
                        aria-label="Send message"
                      >
                        <span className="material-symbols-outlined">send</span>
                      </button>
                    </div>

                    {/* ── Compact action strip ── */}
                    <div className="action-buttons">
                      <button className="action-btn paid" onClick={() => completeConversation('PAID')} disabled={!activeConversationId}>Mark Paid</button>
                      <button className="action-btn snooze" onClick={() => completeConversation('SNOOZE')} disabled={!activeConversationId}>Snooze</button>
                      <button className="action-btn dismiss" onClick={() => completeConversation('DISMISSED')} disabled={!activeConversationId}>Dismiss</button>
                      <button className="action-btn delete" onClick={deleteConversation} disabled={!activeConversationId}>Delete</button>
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
        </div>
      </main>

      {scannedReceiptData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-panel" style={{
            width: '90%', maxWidth: '480px', padding: '24px', borderRadius: '20px',
            border: '1px solid rgba(168, 85, 247, 0.4)', boxShadow: '0 0 30px rgba(168, 85, 247, 0.25)',
            color: '#fff', background: '#111827'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontSize: '28px' }}>🤖</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', background: 'linear-gradient(90deg, #a855f7, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Gemini AI Vision OCR
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>Extracted from your receipt image</p>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', fontStyle: 'italic', color: '#d1d5db', borderLeft: '3px solid #a855f7' }}>
              "{scannedReceiptData.summary}"
            </div>

            <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bill Title / Vendor</label>
                <input 
                  type="text" 
                  value={scannedReceiptData.title || ''} 
                  onChange={(e) => setScannedReceiptData({ ...scannedReceiptData, title: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #374151', background: '#1f2937', color: '#fff', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={scannedReceiptData.amount || 0} 
                    onChange={(e) => setScannedReceiptData({ ...scannedReceiptData, amount: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #374151', background: '#1f2937', color: '#fff', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Due Date</label>
                  <input 
                    type="date" 
                    value={scannedReceiptData.dueDate || ''} 
                    onChange={(e) => setScannedReceiptData({ ...scannedReceiptData, dueDate: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #374151', background: '#1f2937', color: '#fff', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#9ca3af', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</label>
                <input 
                  type="text" 
                  value={scannedReceiptData.category || 'general'} 
                  onChange={(e) => setScannedReceiptData({ ...scannedReceiptData, category: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #374151', background: '#1f2937', color: '#fff', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={() => setScannedReceiptData(null)}
                style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #4b5563', background: 'transparent', color: '#e5e7eb', cursor: 'pointer', fontWeight: 600 }}
              >
                Discard
              </button>
              <button 
                type="button" 
                onClick={confirmScannedDue}
                style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
              >
                ✅ Confirm & Add Due
              </button>
            </div>
          </div>
        </div>
      )}

      <audio ref={audioRef} />
    </div>
  );
}

export default VoiceChat;
