# How to Debug & Verify Payment Tracking

## Quick Debug Checklist

### **1. Check Browser Console (Real-time)**

When you say "I paid 1000 rs", look for these logs:

```javascript
// Open DevTools: F12 → Console

// Should see:
[EntityResolver] intent=confirm_paid customer=none
[RiskProfiler] aging=current broken=0 tier=LOW
[Negotiator] Processing: confirm_paid with paymentAmount=1000
[ActionDispatcher] Updating due with PARTIAL_PAYMENT
```

### **2. Check Network Tab (WebSocket)**

Open DevTools: F12 → Network → WS (WebSocket)

**Look for:**
- `voice-message` frame sent (your audio)
- `voice-reply` frame received (AI response mentioning "partial payment")

**Example:**
```
Message sent:
{
  "audioBuffer": [...],
  "conversationId": "conv-abc123"
}

Message received:
{
  "message": "Thank you! We noted your partial payment of Rs.1000...",
  "negotiationOutcome": "PARTIAL_PAYMENT",
  "audioBuffer": [audio data]
}
```

---

## MongoDB Verification

### **Step 1: Connect to MongoDB**

```bash
# If running locally:
mongosh

# If running on HuggingFace Spaces:
mongosh "mongodb+srv://user:password@cluster.mongodb.net/databasename"
```

### **Step 2: Check User Collection**

```javascript
use your_database_name;

// Find your user
db.users.findOne({ email: "your@email.com" });

// Copy the _id for next queries
// Example: user123 = ObjectId("507f1f77bcf86cd799439011")
```

### **Step 3: Find Your Dues with Payments**

```javascript
// Find all dues with payment history
db.dues.find(
  {
    userId: ObjectId("507f1f77bcf86cd799439011"),  // ← Replace with your userId
    "metadata.payments": { $exists: true, $ne: [] }
  }
).pretty();
```

**Expected output:**
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439012"),
  userId: ObjectId("507f1f77bcf86cd799439011"),
  title: "cementPay",
  amount: 5000,
  status: "VERIFYING",
  
  metadata: {
    payments: [
      {
        amount: 1000,
        date: ISODate("2026-08-14T10:30:00.000Z"),
        status: "PENDING_VERIFICATION"
      }
    ]
  }
}
```

### **Step 4: Verify Amount Calculation**

```javascript
// Check total paid vs total due
db.dues.aggregate([
  {
    $match: {
      userId: ObjectId("507f1f77bcf86cd799439011"),
      "metadata.payments": { $exists: true }
    }
  },
  {
    $addFields: {
      totalPaid: {
        $sum: "$metadata.payments.amount"
      },
      outstandingBalance: {
        $subtract: ["$amount", { $sum: "$metadata.payments.amount" }]
      }
    }
  },
  {
    $project: {
      title: 1,
      amount: 1,
      totalPaid: 1,
      outstandingBalance: 1,
      status: 1,
      payments: "$metadata.payments"
    }
  }
]).pretty();
```

**Output example:**
```javascript
{
  _id: ObjectId(...),
  title: "cementPay",
  amount: 5000,
  totalPaid: 1000,
  outstandingBalance: 4000,
  status: "VERIFYING",
  payments: [
    { amount: 1000, date: ISODate(...), status: "PENDING_VERIFICATION" }
  ]
}
```

---

## Backend Log Verification

### **Check Server Logs**

If backend is running in terminal:

```bash
# Look for these logs:

[EntityResolver] intent=confirm_paid customer=none
[negotiator.js] Processing confirm_paid: paymentAmount=1000 vs dueAmount=5000
[ActionDispatcher] PARTIAL_PAYMENT recorded: Rs.1000 for due456
```

### **Enable Debug Logging** (Optional)

Edit `src/agent/nodes/actionDispatcher.js`:

```javascript
// Add after payment recording:
console.log('[ActionDispatcher] FULL STATE:', JSON.stringify({
  dueId: due._id,
  userId: userId,
  negotiationOutcome,
  paymentAmount: intentData?.paymentAmount,
  newMetadata: {
    payments: [...existingPayments, paymentRecord]
  }
}, null, 2));
```

Then restart backend and check logs again.

---

## API-Level Verification

### **Check via REST API**

```bash
# Get all dues with payment history
curl -X GET "http://localhost:3004/api/dues" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" | jq '.[] | select(.metadata.payments != null)'

# Expected response:
{
  "_id": "due456",
  "title": "cementPay",
  "amount": 5000,
  "status": "VERIFYING",
  "metadata": {
    "payments": [
      {
        "amount": 1000,
        "date": "2026-08-14T10:30:00.000Z",
        "status": "PENDING_VERIFICATION"
      }
    ]
  }
}
```

---

## Step-by-Step Test Scenario

### **Complete Payment Tracking Test**

**Setup:**
```
1. Fresh user account
2. 1 browser tab (customer)
3. Terminal access to MongoDB
```

**Step 1: Create Due**
```
Frontend: Say "Create 5000 rupees bill"
↓
Backend receives & creates due

Verify in MongoDB:
db.dues.findOne({ title: /bill/i })
→ Check: status = "UNPAID", amount = 5000
```

**Step 2: Make Partial Payment Claim**
```
Frontend: Say "I paid 1000"
↓
Check Browser Console:
[EntityResolver] intent=confirm_paid
[negotiator] PARTIAL_PAYMENT detected

Check Backend Logs:
[ActionDispatcher] Recording partial payment: 1000
```

**Step 3: Verify in Database**
```
MongoDB Query:
db.dues.findOne({ amount: 5000 }).metadata.payments

Expected:
[{ amount: 1000, status: "PENDING_VERIFICATION" }]
```

**Step 4: Check Conversation History**
```
db.conversations.find(
  { message: /paid/ }
).pretty()

Expected:
- User message: "I paid 1000"
- Assistant reply: "Thank you! Noted partial payment of Rs.1000..."
```

**Step 5: Verify Calculation**
```
db.dues.aggregate([
  { $match: { amount: 5000 } },
  {
    $addFields: {
      outstandingBalance: {
        $subtract: ["$amount", { $sum: "$metadata.payments.amount" }]
      }
    }
  }
])

Expected:
- totalPaid: 1000
- outstandingBalance: 4000
```

---

## Common Issues & Debugging

### **Issue 1: Payment not showing in metadata.payments**

**Check:**
```javascript
// Is the due being updated?
db.dues.findOne({ _id: ObjectId("due456") })
  .metadata.payments;

// If empty or null, check:
// 1. ActionDispatcher executed?
//    → Search backend logs for "PARTIAL_PAYMENT"
// 2. Due ID correct?
//    → Verify due456 exists and belongs to this user
// 3. Intent detected?
//    → Check console for "intent=confirm_paid"
```

**Fix:**
```javascript
// Manually add payment (for testing):
db.dues.updateOne(
  { _id: ObjectId("due456") },
  {
    $set: {
      status: "VERIFYING",
      "metadata.payments": [
        {
          amount: 1000,
          date: new Date(),
          status: "PENDING_VERIFICATION"
        }
      ]
    }
  }
);
```

### **Issue 2: Multiple dues, system asks for clarification**

**Expected behavior** (NEW FIX):
```
Backend: Finds 3 unpaid dues
→ Asks: "Which bill did you pay for? 
         1. bill1 Rs.5000; 
         2. bill2 Rs.3000;
         3. bill3 Rs.2000"

User: "The first one"
→ System records payment against bill1
```

**Check in logs:**
```javascript
[EntityResolver] Found multiple unpaid dues, asking for clarification
[EntityResolver] User selected: bill1
[ActionDispatcher] Recording payment for bill1
```

### **Issue 3: Razorpay webhook not marking payment as verified**

**Check webhook:**
```javascript
// Has webhook been received?
db.dues.findOne({ _id: ObjectId("due456") })
  .metadata.paymentVerified

// Should be: true (if webhook received)
// Or: false/undefined (if pending)

// Check payment ID:
db.dues.findOne({ _id: ObjectId("due456") })
  .metadata.razorpayPaymentId
```

**Verify webhook endpoint:**
```javascript
// Check if webhook handler is running
// Look in server logs for:
[Webhook] Razorpay payment confirmed: pay_xyz123

// If not appearing:
// 1. Verify webhook URL in Razorpay dashboard
// 2. Check network connectivity
// 3. Verify payment went through Razorpay
```

---

## Audit Trail Queries

### **See All Payments by User**

```javascript
db.conversations.find(
  {
    conversationId: /conv/,
    message: /paid|payment/i,
    roles: "USER"
  }
).sort({ createdAt: -1 })
.pretty();
```

### **See Payment Evolution (Timeline)**

```javascript
db.dues.findOne({ amount: 5000 })
  .metadata.payments
  .forEach(p => {
    console.log(`Rs.${p.amount} paid on ${p.date} [${p.status}]`);
  });

// Output:
// Rs.1000 paid on 2026-08-14T10:30:00Z [PENDING_VERIFICATION]
// Rs.2000 paid on 2026-08-14T14:15:00Z [VERIFIED]
// Rs.2000 paid on 2026-08-15T09:00:00Z [PENDING_VERIFICATION]
```

### **See Customer's Full Payment History**

```javascript
// Find customer
const customer = db.customers.findOne({ name: "test customer" });

// Find all dues for this customer with payments
db.dues.find(
  {
    customerId: customer._id,
    "metadata.payments": { $exists: true }
  }
).project({
  title: 1,
  amount: 1,
  status: 1,
  "metadata.payments": 1
}).pretty();
```

---

## Real-Time Monitoring Script

Create a script to watch payments in real-time:

```javascript
// monitor-payments.js
const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URI);

async function monitorPayments() {
  try {
    const db = client.db('your_database');
    
    // Watch for changes in dues collection
    const changeStream = db.collection('dues').watch([
      { $match: { "operationType": "update" } }
    ]);
    
    changeStream.on('change', (change) => {
      if (change.updateDescription?.updatedFields?.['metadata.payments']) {
        console.log('🔔 Payment Recorded!');
        console.log('Due ID:', change.documentKey._id);
        console.log('Updated Fields:', change.updateDescription.updatedFields);
      }
    });
    
    console.log('👀 Watching for payments...');
  } catch (err) {
    console.error('Error:', err);
  }
}

monitorPayments();
```

Run:
```bash
node monitor-payments.js
```

Then make a payment in the frontend. You'll see real-time updates in the terminal!

---

## Summary

**To verify payment tracking works:**

1. ✅ Create due → Check MongoDB status = "UNPAID"
2. ✅ Say "I paid X" → Check console for "confirm_paid" intent
3. ✅ Verify DB update → metadata.payments array has payment record
4. ✅ Check calculation → outstandingBalance = amount - totalPaid
5. ✅ Review audit trail → Conversations collection shows interaction
6. ✅ Monitor webhook → metadata.paymentVerified becomes true (when Razorpay confirms)

**Critical verifications:**
- userId matches (multi-user isolation)
- dueId matches (right bill is being paid)
- amount extracted correctly (from LLM parsing)
- timestamp recorded (server clock)
- status transitions: UNPAID → VERIFYING → PAID (if webhook confirms)
