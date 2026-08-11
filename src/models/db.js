const mongoose = require('mongoose');
const schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId; //  correct way

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },

    passwordHash: {
      type: String,
      required: true
    },

    refreshToken: {
      type: String
    },

    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER"
    },

    isEmailVerified: {
      type: Boolean,
      default: false
    },

    isActive: {
      type: Boolean,
      default: true
    },

    lastLoginAt: {
      type: Date
    },

    // ── Twilio / phone notifications ──────────────────────────────────────
    // Store in E.164 format e.g. +923001234567
    phone: {
      type: String,
      default: null,
      trim: true
    },
    phoneVerified: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const duesSchema = new mongoose.Schema(
  {
    userId: {
      type: ObjectId,
      ref: "User",
      required: true
    },
    // Optional: link due/invoice to a Customer entity (Phase 1)
    customerId: {
      type: ObjectId,
      ref: "Customer",
      default: null
    },
    invoiceNo: {
      type: String,
      default: null,
      trim: true
    },
    amount: {
      type: Number,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    dueDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ["PAID", "UNPAID", "OVERDUE", "PTP", "VERIFYING"],
      default: "UNPAID"
    },
    snoozeDate: {
      type: Date,
      default: null
    },
    // Promise to Pay date captured from AI voice conversation
    promiseDate: {
      type: Date,
      default: null
    },
    // Ageing bucket computed on creation/update: 0-30, 31-60, 61-90, 90+
    agingBucket: {
      type: String,
      enum: ["current", "0-30", "31-60", "61-90", "90+"],
      default: "current"
    },
    // Flexible bag for AI-set flags: promiseToPay, verificationPending,
    // disputed, disputedAt — avoids schema migrations for minor flags.
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

const reminderSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  dueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Dues",
    required: true
  },
  reminderType: {
    type: String,
    enum: ["UPCOMING_DUE", "DUE_TODAY", "OVERDUE"],
    required: true
  },
  messageText: {
    type: String,
    required: true
  },
  triggerSource: {
    type: String,
    enum: ["CRON_JOB", "MANUAL"],
    default: "CRON_JOB"
  },
  metadata: {
    type: Object
  }
}, { timestamps: true });


const conversationSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  dueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Dues",
    required: false,
    default: null
  },
  sessionDate: {
    type: String,
    required: false
  },
  parentConversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ConversationSession",
    required: false,
    default: null
  },
  reminderLogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ReminderLog",
    required: false
  },

  channel: {
    type: String,
    enum: ["TEXT", "VOICE"],
    default: "VOICE"
  },
  status: {
    type: String,
    enum: ["STARTED", "IN_PROGRESS", "COMPLETED"],
    default: "STARTED"
  },
  clarificationState: {
    type: String,
    enum: ["NONE", "AWAITING"],
    default: "NONE"
  },

  pendingIntent: {
    type: String,
    default: null
  },

  pendingData: {
    type: Object,
    default: null
  },
  finalOutcome: {
    action: {
      type: String,
      enum: ["PAID", "SNOOZE", "DISMISSED", "NO_RESPONSE"],
    },
    notes: String
  }

}, { timestamps: true });






const conversationMessageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ConversationSession",
    required: true
  },
  roles: {
    type: String,
    enum: ["USER", "ASSISTANT", "SYSTEM"],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  rawAudioUrl: {
    type: String // optional, future voice storage
  }
}, { timestamps: true });

// Payment records for audit, idempotency, and reconciliation with Razorpay
const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  dueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dues',
    required: false,
  },
  orderId: { type: String, required: true, index: true },
  paymentId: { type: String, required: true, unique: true, index: true },
  signature: { type: String },
  amount: { type: Number },
  currency: { type: String },
  status: { type: String, enum: ['CREATED', 'CAPTURED', 'FAILED'], default: 'CREATED' },
  rawEvent: { type: Object },
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
const Dues = mongoose.model("Dues", duesSchema);
const Conversation = mongoose.model("Conversation", conversationMessageSchema);
const Reminder = mongoose.model("Reminder", reminderSchema);
const ConversationSession = mongoose.model("ConversationSession", conversationSessionSchema);
const Payment = mongoose.model('Payment', paymentSchema);

// ── Customer — top-level contact entity for B2B collections (Phase 1) ────────
const customerSchema = new mongoose.Schema({
  // The business owner / logged-in user who owns this customer contact
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  // Primary contact phone in E.164 format e.g. +919876543210
  contactNo: {
    type: String,
    default: null,
    trim: true
  },
  email: {
    type: String,
    default: null,
    lowercase: true,
    trim: true
  },
  // City / location of the customer's business
  place: {
    type: String,
    default: null,
    trim: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  // Free-form notes about this customer
  notes: {
    type: String,
    default: null
  },
  // Whether AI follow-up is enabled for this customer
  followUpEnabled: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// ── Wallet — prepaid credit balance for SaaS billing (Phase 2) ───────────────
const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  creditBalance: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'CR'
  }
}, { timestamps: true });

// ── WalletTransaction — per-call / per-message credit deduction log (Phase 2) ─
const walletTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // RECHARGE = top-up, DEDUCTION = usage cost
  type: {
    type: String,
    enum: ['RECHARGE', 'DEDUCTION'],
    required: true
  },
  amount: { type: Number, required: true },
  activityType: {
    type: String,
    enum: ['AI_VOICE_CALL', 'WHATSAPP_CALL', 'SMS', 'EMAIL', 'RECHARGE', null],
    default: null
  },
  callDuration: { type: Number, default: null },  // seconds
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  // Razorpay order ID for top-ups
  orderId: { type: String, default: null },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'PENDING'],
    default: 'SUCCESS'
  },
  note: { type: String, default: null }
}, { timestamps: true });

// ── AgentSettings — per-user AI agent intelligence configuration (Phase 3) ───
const agentSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  channels: {
    voiceCall: { type: Boolean, default: true },
    whatsappCall: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    email: { type: Boolean, default: false },
    pushNotification: { type: Boolean, default: false },
    pushInApp: { type: Boolean, default: true }
  },
  agentLanguage: {
    type: String,
    enum: ['English', 'Hindi'],
    default: 'English'
  },
  agentGender: {
    type: String,
    enum: ['Male', 'Female'],
    default: 'Female'
  },
  agentTone: {
    type: String,
    enum: ['Friendly', 'Professional', 'Polite', 'Firm', 'Urgent', 'Warning'],
    default: 'Professional'
  },
  reminderStages: {
    firstReminderDays:  { type: Number, default: 7 },   // days before due date
    secondReminderDays: { type: Number, default: 3 },
    finalReminderDays:  { type: Number, default: 1 },
    dueDateReminder:    { type: Boolean, default: true }
  },
  escalation: {
    maxDailyMessagesPerCustomer: { type: Number, default: 2 },
    businessHoursStart: { type: String, default: '09:30' }, // 24-hr HH:MM
    businessHoursEnd:   { type: String, default: '19:00' },
    escalateAfterBrokenPromises: { type: Number, default: 2 }
  }
}, { timestamps: true });

// ── CallLog — persists every AI-driven outbound call for audit + dashboard ──
const callLogSchema = new mongoose.Schema({
  callSid: { type: String, index: true },       // Twilio Call SID
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dues',
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  status: {
    type: String,
    enum: ['initiated', 'in-progress', 'completed', 'failed', 'no-answer'],
    default: 'initiated'
  },
  duration: { type: Number, default: 0 },       // seconds
  transcript: { type: String, default: null },   // full conversation transcript
  // Twilio recording URL — null after user deletes the recording (Phase 4)
  recordingUrl: { type: String, default: null },
  llmIntent: {
    type: String,
    enum: ['confirm_paid', 'will_pay_today', 'snooze', 'dispute', 'no_response', null],
    default: null
  },
  llmConfidence: { type: String, default: null },
  snoozeDays: { type: Number, default: null },
  outcome: { type: String, default: null },      // human-readable result description
}, { timestamps: true });

const Customer = mongoose.model('Customer', customerSchema);
const Wallet = mongoose.model('Wallet', walletSchema);
const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);
const AgentSettings = mongoose.model('AgentSettings', agentSettingsSchema);
const CallLog = mongoose.model('CallLog', callLogSchema);

module.exports = {
  User,
  Dues,
  Conversation,
  Reminder,
  ConversationSession,
  Payment,
  Customer,
  Wallet,
  WalletTransaction,
  AgentSettings,
  CallLog
};