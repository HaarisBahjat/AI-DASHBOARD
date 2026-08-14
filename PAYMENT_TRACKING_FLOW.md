# Payment Tracking Visual Flow

## Example Scenario: User Makes Partial Payment

### Step 1: User Creates a Due
```
Frontend (VoiceChat.jsx):
┌─────────────────────────────────────┐
│ User says: "Create 5000 bill"        │
│ Audio → STT → "Create 5000 bill"     │
└─────────────────────────────────────┘
          ↓
Socket.emit('voice-message', {
  audioBuffer: [...],
  conversationId: "conv-abc123"
})
          ↓
Backend (voice.socket.js + agent controller):
  thread_id = "conv-abc123"
  agentGraph.invoke({ 
    userText: "Create 5000 bill",
    userId: "user123",
    conversationId: "conv-abc123"
  })
          ↓
┌──────────────────────────────────────┐
│ entityResolver Node:                 │
│ ├ Gemini: { intent: "create_due",   │
│ │          amount: 5000 }            │
│ └ Creates Dues document:             │
│   {                                  │
│     _id: "due456",                   │
│     userId: "user123",               │
│     title: "bill",                   │
│     amount: 5000,                    │
│     status: "UNPAID"                 │
│   }                                  │
└──────────────────────────────────────┘
          ↓
LangGraph Checkpointer saves state:
checkpointer["conv-abc123"] = {
  userId: "user123",
  due: { _id: "due456", amount: 5000, status: "UNPAID" },
  ...other_state
}
```

---

### Step 2: User Claims Partial Payment
```
Frontend:
┌─────────────────────────────────────┐
│ User says: "I paid 1000 rs"          │
│ Audio → STT → "I paid 1000 rs"       │
└─────────────────────────────────────┘
          ↓
Socket.emit('voice-message', {
  audioBuffer: [...],
  conversationId: "conv-abc123"  ← SAME CONVERSATION
})
          ↓
Backend (agentGraph.invoke with SAME thread_id):
  thread_id = "conv-abc123"
  LangGraph LOADS previous state from checkpointer:
  {
    userId: "user123",
    due: { _id: "due456", amount: 5000 },
    ...
  }
          ↓
┌──────────────────────────────────────────────────────┐
│ entityResolver Node:                                 │
│                                                      │
│ 1. Detect Intent:                                   │
│    Gemini parses: {                                 │
│      intent: "confirm_paid",                        │
│      paymentAmount: 1000  ← NEW FIELD               │
│    }                                                 │
│                                                      │
│ 2. Due Resolution (NEW LOGIC):                      │
│    ├ Check if state.due exists? YES                 │
│    │  → due = { _id: "due456", amount: 5000 }       │
│    │                                                 │
│    └ Return:                                        │
│       {                                              │
│         intentData: { paymentAmount: 1000 },        │
│         due: { _id: "due456", amount: 5000 },       │
│         customer: {...}                             │
│       }                                              │
└──────────────────────────────────────────────────────┘
          ↓
┌──────────────────────────────────────────────────────┐
│ riskProfiler Node:                                   │
│ (skipped for confirm_paid in some cases)             │
└──────────────────────────────────────────────────────┘
          ↓
┌──────────────────────────────────────────────────────┐
│ negotiator Node:                                     │
│                                                      │
│ Reads:                                              │
│ - intent = "confirm_paid"                           │
│ - paymentAmount = 1000                              │
│ - dueAmount = 5000                                  │
│                                                      │
│ Logic:                                              │
│ if (1000 < 5000) {                                  │
│   negotiationOutcome = "PARTIAL_PAYMENT"            │
│   replyText = "Thank you! Noted partial payment     │
│               of Rs.1000. Outstanding: Rs.4000."    │
│   nextStep = "needs_compliance"                     │
│ }                                                   │
└──────────────────────────────────────────────────────┘
          ↓
┌──────────────────────────────────────────────────────┐
│ complianceGuard Node:                                │
│                                                      │
│ Check: Did Razorpay confirm this payment?           │
│ → NO (webhook not received yet)                     │
│                                                      │
│ Result:                                             │
│ {                                                   │
│   complianceStatus: "CLEAR",                        │
│   negotiationOutcome: "PARTIAL_PAYMENT",            │
│   replyText: "Our team will verify..."              │
│ }                                                   │
└──────────────────────────────────────────────────────┘
          ↓
┌──────────────────────────────────────────────────────┐
│ actionDispatcher Node:                               │
│                                                      │
│ Execute DB Update:                                  │
│                                                      │
│ Dues.findByIdAndUpdate("due456", {                  │
│   status: "VERIFYING",                              │
│   metadata: {                                       │
│     payments: [                                     │
│       {                                             │
│         amount: 1000,                               │
│         date: 2026-08-14T10:30:00Z,                 │
│         status: "PENDING_VERIFICATION"              │
│       }                                             │
│     ]                                               │
│   }                                                 │
│ })                                                  │
│                                                      │
│ Synthesize TTS:                                     │
│ "Thank you! Noted your partial payment of Rs.1000" │
│ → audioBuffer                                       │
└──────────────────────────────────────────────────────┘
          ↓
Return to Frontend:
{
  replyText: "Thank you! Noted partial payment...",
  audioBuffer: [audio data],
  negotiationOutcome: "PARTIAL_PAYMENT"
}
          ↓
Frontend plays audio to user ✓
```

---

### Step 3: Database State After Payment

#### **MongoDB Dues Collection:**
```javascript
db.dues.findOne({ _id: ObjectId("due456") })

Result:
{
  _id: ObjectId("due456"),
  userId: ObjectId("user123"),
  customerId: ObjectId("customer789"),
  title: "bill",
  amount: 5000,
  dueDate: ISODate("2026-08-15T00:00:00Z"),
  status: "VERIFYING",  // ← Changed from UNPAID
  category: "general",
  
  // ← PAYMENT HISTORY
  metadata: {
    payments: [
      {
        amount: 1000,
        date: ISODate("2026-08-14T10:30:00Z"),
        status: "PENDING_VERIFICATION"
      }
    ]
  },
  
  createdAt: ISODate("2026-08-14T09:00:00Z"),
  updatedAt: ISODate("2026-08-14T10:30:00Z")
}
```

#### **MongoDB Conversations Collection** (Audit Trail):
```javascript
db.conversations.find({ conversationId: "conv-abc123" })

Result:
[
  {
    conversationId: "conv-abc123",
    roles: "USER",
    message: "I paid 1000 rs",
    createdAt: ISODate("2026-08-14T10:30:00Z")
  },
  {
    conversationId: "conv-abc123",
    roles: "ASSISTANT",
    message: "Thank you! Noted partial payment of Rs.1000...",
    createdAt: ISODate("2026-08-14T10:30:01Z")
  }
]
```

---

### Step 4: Payment Verification (Later)

When Razorpay webhook confirms the payment:

```
Razorpay Webhook:
{
  event: "payment.authorized",
  payment_id: "pay_xyz123",
  amount: 1000,
  status: "captured"
}
          ↓
Backend webhook handler updates Dues:

Dues.findByIdAndUpdate("due456", {
  'metadata.paymentVerified': true,
  'metadata.verifiedAt': new Date(),
  'metadata.razorpayPaymentId': 'pay_xyz123',
  
  // Update payment record to VERIFIED
  'metadata.payments.0.status': 'VERIFIED'
})

          ↓
Result in DB:
{
  ...
  metadata: {
    paymentVerified: true,
    verifiedAt: ISODate("2026-08-14T10:35:00Z"),
    razorpayPaymentId: "pay_xyz123",
    
    payments: [
      {
        amount: 1000,
        date: ISODate("2026-08-14T10:30:00Z"),
        status: "VERIFIED"  // ← Updated from PENDING_VERIFICATION
      }
    ]
  }
}
```

---

## Identity Tracking at Each Stage

### **1. USER IDENTIFICATION**
```
┌──────────────────────────┐
│ Frontend (VoiceChat.jsx) │
└──────────────────────────┘
   ↓ JWT token in localStorage
   ↓ socket.handshake.auth.token
┌──────────────────────────┐
│ Backend Socket Auth      │
│ jwt.verify(token) →      │
│ userId = "user123"       │
└──────────────────────────┘
```

### **2. DUE IDENTIFICATION**
```
Option A: From Conversation State
┌────────────────────────────────────┐
│ LangGraph Checkpointer             │
│ thread_id = "conv-abc123"          │
│ Loads: state.due = { _id: "due456" }
└────────────────────────────────────┘

Option B: From DB Lookup (NEW LOGIC)
┌────────────────────────────────────┐
│ If no state.due:                   │
│ 1. Find unpaid dues for userId     │
│ 2. If 1 due → use it               │
│ 3. If >1 due → ask user to clarify │
└────────────────────────────────────┘
```

### **3. PAYMENT AMOUNT IDENTIFICATION**
```
┌──────────────────────────────────────┐
│ Gemini Intent Detection              │
│ Input: "I paid 1000 rs"              │
│ Output: {                            │
│   intent: "confirm_paid",            │
│   paymentAmount: 1000  ← EXTRACTED   │
│ }                                    │
└──────────────────────────────────────┘
```

### **4. CONTEXT IDENTIFICATION**
```
┌──────────────────────────────────────┐
│ Conversation Thread                  │
│ conversationId = "conv-abc123"       │
│ All messages belong to this thread   │
│ User sees full history when resumed  │
└──────────────────────────────────────┘
```

---

## Query Examples: Finding Who Paid What

### **Find all partial payments by user:**
```mongodb
db.dues.find(
  {
    userId: ObjectId("user123"),
    "metadata.payments": { $exists: true, $not: { $size: 0 } }
  }
)

Returns:
- All dues where this user made partial payments
- Shows payment history in metadata.payments array
```

### **Find verified payments:**
```mongodb
db.dues.find(
  {
    userId: ObjectId("user123"),
    "metadata.paymentVerified": true
  }
)

Returns:
- Only dues verified by Razorpay webhook
- Safe to trust these payments
```

### **Find pending verification payments:**
```mongodb
db.dues.find(
  {
    userId: ObjectId("user123"),
    status: "VERIFYING",
    "metadata.payments": { $exists: true }
  }
)

Returns:
- Dues with unverified partial or full payments
- Manual review needed
```

### **Audit trail: Find what user123 claimed to have paid:**
```mongodb
db.conversations.find(
  {
    conversationId: /conv-123/,  // User's conversation
    roles: "USER",
    message: /paid|payment/i
  }
).sort({ createdAt: -1 })

Returns:
- All payment claims by this user
- Timestamps of claims
- Exact words used
```

---

## Security Guarantees

### **1. User Isolation**
- Every query filters by `userId`
- User123 cannot see user456's dues or payments

### **2. Due Isolation**
- Every update verifies the due belongs to the requesting user
- Prevents payment from being recorded to wrong due

### **3. Conversation Isolation**
- Socket rooms (`user:${userId}`) prevent cross-user communication
- Payment alerts only go to the right owner

### **4. Audit Trail**
- Every payment is logged in Conversations collection
- Exact timestamp and message preserved
- Cannot be modified after creation

---

## Summary

**The system knows WHO paid WHAT through:**

| Layer | Storage | Example |
|-------|---------|---------|
| **USER** | JWT → userId | user123 |
| **DUE** | state.due (checkpointer) or DB lookup | due456 (5000 Rs bill) |
| **AMOUNT** | Gemini parsed intent data | paymentAmount: 1000 |
| **DATE** | Server timestamp | 2026-08-14T10:30:00Z |
| **VERIFICATION** | Razorpay webhook → metadata.paymentVerified | true/false |
| **HISTORY** | Conversations collection | Full audit trail |

**Multi-turn conversation continuity:**
- Same thread_id (conversationId) loads previous state
- Due context persists across messages
- User doesn't need to re-specify which bill

**If multiple dues exist:**
- New logic asks for clarification
- Prevents payment misallocation
- User explicitly confirms which bill they paid for
