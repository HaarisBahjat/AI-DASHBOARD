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

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
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
  }
},{ timestamps: true });

const User = mongoose.model("User", userSchema);
const Dues = mongoose.model("Dues", duesSchema);
const Conversation = mongoose.model("Conversation", conversationSchema);
const Reminder = mongoose.model("Reminder", reminderSchema);

module.exports = {
  User,
  Dues,
  Conversation,
  Reminder
};