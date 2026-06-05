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
      enum: ["PAID", "UNPAID", "OVERDUE"],
      default: "UNPAID"
    },
    snoozeDate: {
      type: Date,
      default: null
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
    required: true
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
    action:{
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
},{ timestamps: true });

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

module.exports = {
  User,
  Dues,
  Conversation,
  Reminder,
  ConversationSession
  ,Payment
};