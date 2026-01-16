const mongoose = require('mongoose');
const schema = mongoose.Schema;
mongoose.connect("mongodb+srv://haarismalick4_db_user:Lz5zswsFfrEAF5r1@cluster88.fozut1k.mongodb.net/dataBase")
const ObjectId = mongoose.Schema.Types.ObjectId; // ✅ correct way

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

module.exports = mongoose.model("User", userSchema);
module.exports = mongoose.model("Dues", duesSchema);
module.exports = mongoose.model("Conversation", conversationSchema);