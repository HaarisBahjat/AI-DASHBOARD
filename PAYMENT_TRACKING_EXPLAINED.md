# How AI-DASHBOARD Tracks Partial Payments

## Quick Answer
The system tracks payments through **4 layers of identity**:

1. **User ID** - Who is logged in (via JWT token)
2. **Due/Invoice ID** - Which bill is being paid (stored in state)
3. **Payment Record** - Amount + timestamp (in metadata.payments array)
4. **Conversation Thread** - Context of payment discussion (via thread_id/conversationId)

---

## Data Flow: "I paid 1000 rs"

### **Step 1: User Authentication** 
```
Browser sends: JWT token
↓
Socket/HTTP handler decodes: userId = "user123"
↓
Every operation is scoped to this userId
```

### **Step 2: Conversation Context (Checkpointer)**
```
User creates: "Rs.5000 cementPay bill"
↓
LangGraph state stored:
  thread_id: "conv-abc123"
  userId: "user123"
  due: {
    _id: "due456",
    userId: "user123",
    customerId: "customer789",
    title: "cementPay",
    amount: 5000,
    status: "UNPAID"
  }
↓
checkpointer["conv-abc123"] = { ...full state... }
```

### **Step 3: Payment Claim**
```
User says: "I paid 1000 rs"
↓
Message travels through agent pipeline:
  - EntityResolver: Detects intent="confirm_paid", paymentAmount=1000
  - RiskProfiler: Evaluates risk
  - Negotiator: Compares 1000 < 5000 → PARTIAL_PAYMENT
  - ActionDispatcher: Records payment
```

### **Step 4: Payment Recording in MongoDB**
```
Dues.findByIdAndUpdate("due456", {
  status: "VERIFYING",
  metadata: {
    payments: [
      {
        amount: 1000,
        date: 2026-08-14T10:30:00Z,
        status: "PENDING_VERIFICATION"
      }
    ]
  }
})
↓
Database now shows:
  Dues Collection:
    _id: due456
    userId: user123
    customerId: customer789
    title: "cementPay"
    amount: 5000
    status: VERIFYING
    metadata: {
      payments: [
        { amount: 1000, date: 2026-08-14T10:30:00Z }
      ]
    }
```

---

## Complete Payment Tracking Chain

```
┌─────────────────────────────────────────────────────────────────┐
│                    PAYMENT IDENTITY CHAIN                        │
└─────────────────────────────────────────────────────────────────┘

WHO?            USER ID
┌──────────────────────────────────────────────────┐
│ user123 (logged in via JWT)                     │
│ Name: Haaris Bahjat                             │
│ Email: haaris@example.com                       │
└──────────────────────────────────────────────────┘
         ↓
        TRACKS
         ↓
┌──────────────────────────────────────────────────┐
WHAT?           DUE/INVOICE
┌──────────────────────────────────────────────────┐
│ _id: due456                                      │
│ title: "cementPay"                              │
│ amount: Rs.5000                                 │
│ customerId: customer789 (linked customer)       │
│ status: UNPAID → VERIFYING                      │
└──────────────────────────────────────────────────┘
         ↓
        PAID BY
         ↓
┌──────────────────────────────────────────────────┐
HOW MUCH?       PAYMENT RECORD
┌──────────────────────────────────────────────────┐
│ amount: 1000 Rs                                 │
│ date: 2026-08-14T10:30:00Z                      │
│ status: PENDING_VERIFICATION                    │
│ claimed_in: thread_id="conv-abc123"             │
└──────────────────────────────────────────────────┘
         ↓
        VERIFIED BY
         ↓
┌──────────────────────────────────────────────────┐
PROOF?          RAZORPAY / MANUAL
┌──────────────────────────────────────────────────┐
│ [ComplianceGuard checks webhook]                │
│ Razorpay confirmed: YES/NO                      │
│ Verified by: Admin / Razorpay webhook           │
│ Updated: 2026-08-14T14:00:00Z                   │
└──────────────────────────────────────────────────┘
```

---

## Where Is Each Layer Stored?

### **Layer 1: USER ID**
- ✅ JWT token (localStorage on frontend)
- ✅ Socket connection authentication
- ✅ Every request headers: `Authorization: Bearer {token}`

### **Layer 2: DUE IDENTIFICATION**
- ✅ LangGraph state.due (in-memory, loaded from checkpointer)
- ✅ MongoDB Dues collection:
  ```javascript
  db.dues.findOne({ _id: due456, userId: user123 })
  ```
- ✅ Socket conversation context (which due is being discussed)

### **Layer 3: PAYMENT RECORD**
- ✅ MongoDB Dues.metadata.payments array:
  ```javascript
  db.dues.findOne({ _id: due456 }).metadata.payments
  // Returns: [{ amount: 1000, date: ..., status: "PENDING_VERIFICATION" }]
  ```

### **Layer 4: CONVERSATION CONTEXT**
- ✅ LangGraph checkpointer (thread_id = conversationId)
- ✅ Conversation collection (for audit trail):
  ```javascript
  db.conversations.find({ conversationId: "conv-abc123" })
  // Returns all messages in this payment discussion
  ```

---

## Complete MongoDB Query to See All Payment History

```javascript
// Find all partial payments made by user123
db.dues.find(
  { 
    userId: user123,
    "metadata.payments": { $exists: true, $ne: [] }
  },
  {
    title: 1,
    amount: 1,
    customerId: 1,
    "metadata.payments": 1,
    status: 1
  }
)

// Result:
[
  {
    _id: ObjectId("due456"),
    title: "cementPay",
    amount: 5000,
    customerId: ObjectId("customer789"),
    status: "VERIFYING",
    metadata: {
      payments: [
        {
          amount: 1000,
          date: ISODate("2026-08-14T10:30:00Z"),
          status: "PENDING_VERIFICATION"
        }
      ]
    }
  }
]
```

---

## Current Limitation & Future Improvement

### **CURRENT**
When user says "I paid 1000 rs", system assumes it's for the **last due in the conversation context**.

```javascript
// entityResolver doesn't explicitly ask WHICH bill
// It uses state.due from checkpointer
```

### **POTENTIAL ISSUE**
```
Scenario: User talking about multiple dues

Turn 1: "Create Rs.5000 cementPay bill"
        → state.due = cementPay (5000)

Turn 2: "Create Rs.3000 electricity bill"
        → state.due = electricity (3000)  ← Latest due

Turn 3: "I paid 1000"
        → System: Which bill? Uses electricity (3000) ← MIGHT BE WRONG
        → User meant: cementPay, but gets recorded for electricity
```

### **SUGGESTED ENHANCEMENT**
Add due disambiguation:

```javascript
// In entityResolver, for confirm_paid:
if (intent === 'confirm_paid' && !intentData.dueTitle) {
  // Ask user to clarify which bill
  return {
    replyText: 'Which bill did you pay for? cementPay (5000) or electricity (3000)?',
    nextStep: 'dispatch'
  };
}
```

---

## Complete Payment Tracking Example

### **Scenario: 3 Partial Payments on 1 Bill**

```
Timeline:

[Day 1]
User: "Create 10000 rupee bill"
→ Dues: { _id: due789, amount: 10000, status: "UNPAID" }

[Day 3]
User: "I paid 3000"
→ Dues: {
    _id: due789,
    amount: 10000,
    status: "VERIFYING",
    metadata: { 
      payments: [{ amount: 3000, date: 2026-08-16, status: "PENDING_VERIFICATION" }]
    }
  }
→ Outstanding: 7000

[Day 5]
User: "Paid another 2000"
→ Dues: {
    _id: due789,
    amount: 10000,
    status: "VERIFYING",
    metadata: { 
      payments: [
        { amount: 3000, date: 2026-08-16 },
        { amount: 2000, date: 2026-08-18, status: "PENDING_VERIFICATION" }
      ]
    }
  }
→ Outstanding: 5000

[Day 8]
User: "I paid 5000 to complete this"
→ Dues: {
    _id: due789,
    amount: 10000,
    status: "VERIFYING",
    metadata: { 
      payments: [
        { amount: 3000, date: 2026-08-16 },
        { amount: 2000, date: 2026-08-18 },
        { amount: 5000, date: 2026-08-21, status: "PENDING_VERIFICATION" }
      ]
    }
  }
→ Total Paid: 10000 (FULL)
→ Outstanding: 0 ✓
```

---

## API to Retrieve Payment History

### **For a Specific Due:**
```bash
GET /api/dues/:dueId
Response:
{
  _id: "due456",
  title: "cementPay",
  amount: 5000,
  status: "VERIFYING",
  metadata: {
    payments: [
      { amount: 1000, date: "2026-08-14T10:30:00Z", status: "PENDING_VERIFICATION" }
    ]
  }
}
```

### **For a Specific Customer:**
```bash
GET /api/customers/:customerId/dues
Response:
[
  {
    _id: "due456",
    title: "cementPay",
    amount: 5000,
    amountPaid: 1000,
    amountRemaining: 4000,
    payments: [{ amount: 1000, date: "2026-08-14T10:30:00Z" }]
  },
  {
    _id: "due789",
    title: "electricity",
    amount: 3000,
    amountPaid: 0,
    amountRemaining: 3000
  }
]
```

---

## Security & Isolation

### **Multi-User Isolation**
```javascript
// CRITICAL: Every query is scoped to userId
db.dues.find({ userId: user123 })  // NEVER: db.dues.find({})

// User123 can NEVER see user456's payments
// Even if they guess a due ID, filter protects:
db.dues.findOne({ _id: due456, userId: user123 })  // ✓ Allowed
db.dues.findOne({ _id: due456, userId: user789 })  // ✗ Forbidden (userId mismatch)
```

### **Conversation Privacy**
```javascript
// Each thread is tied to userId
thread_id: "user123-conv-abc123"
// User456 cannot invoke same thread

// Socket rooms prevent message leaks:
socket.join(`user:${userId}`)  // Only this user receives alerts
io.to(`user:user123`).emit('hitl-approval-required', ...)  // Only user123 sees
```

---

## Summary

| Component | How It Identifies Payment |
|-----------|---------------------------|
| **USER** | JWT token → userId |
| **INVOICE** | Conversation state → state.due._id |
| **AMOUNT** | LLM parsing → intentData.paymentAmount |
| **TIMESTAMP** | Server clock → new Date() |
| **VERIFICATION** | Razorpay webhook → metadata.paymentVerified |
| **AUDIT TRAIL** | Conversation collection → message history |
| **ISOLATION** | Every query filtered by userId |

The system knows **WHO paid WHAT AMOUNT for WHICH BILL** through the combination of:
- ✅ User authentication (JWT)
- ✅ Conversation context (LangGraph checkpointer)
- ✅ LLM parsing (Gemini detects payment amount)
- ✅ Database schema (Dues linked to userId + customerId)
- ✅ Payment metadata (payments array with timestamps)
