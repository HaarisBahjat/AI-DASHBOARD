/**
 * src/agent/nodes/negotiator.js — GATE 3: The Brain
 *
 * Handles ALL conversational intents. For each intent it:
 *   - Runs the appropriate DB query / business logic
 *   - Enforces policyLimits (from riskProfiler) for snooze/waiver requests
 *   - Sets nextStep to route to: "dispatch" | "needs_compliance" | "needs_approval"
 *   - Sets replyText for what to say to the user
 *   - Sets negotiationOutcome for actionDispatcher to execute
 *
 * INTENTS HANDLED:
 *   list_dues, sum_dues, top_upcoming, get_customer_info, list_customers,
 *   call_customer, confirm_paid, snooze, will_pay_today, dispute,
 *   financial_advice, general_chat
 */
const llmService = require('../../Service/llm.service');
const { Customer, Dues } = require('../../models/db');

async function negotiatorNode(state) {
  const { intentData, customer, due, policyLimits, userId, userText } = state;
  const intent = intentData ? intentData.intent : 'general_chat';

  // ── LIST DUES ──────────────────────────────────────────────────────────────
  if (intent === 'list_dues') {
    const filter = { userId };
    let statusLabel = '';
    const textLower = (userText || '').toLowerCase();

    // Check if user specifically requested UNPAID, OVERDUE, or PAID status
    if (textLower.includes('all')) {
      statusLabel = ' (all statuses)';
    } else if (textLower.includes('paid') && !textLower.includes('unpaid')) {
      filter.status = 'PAID';
      statusLabel = ' paid';
    } else if (textLower.includes('overdue')) {
      filter.status = 'OVERDUE';
      statusLabel = ' overdue';
    } else {
      // Default: show active outstanding dues (UNPAID, OVERDUE, PTP, VERIFYING)
      filter.status = { $in: ['UNPAID', 'OVERDUE', 'PTP', 'VERIFYING'] };
      statusLabel = ' outstanding';
    }

    let label = '';
    if (customer) {
      label = ' for customer ' + customer.name;
      const safeName = customer.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      filter.$or = [
        { customerId: customer._id },
        { title: { $regex: safeName, $options: 'i' } }
      ];
    } else if (intentData && intentData.customerName && intentData.customerName.trim()) {
      const name = intentData.customerName.trim();
      const safeName = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      label = ' matching "' + name + '"';
      filter.$or = [
        { title: { $regex: safeName, $options: 'i' } },
        { category: { $regex: safeName, $options: 'i' } }
      ];
    }

    const dues = await Dues.find(filter).sort({ dueDate: 1 }).lean();
    if (!dues.length) {
      return { replyText: 'No' + statusLabel + ' dues found' + label + '.', negotiationOutcome: 'GENERAL_REPLY', nextStep: 'dispatch' };
    }
    const total = dues.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const lines = dues.slice(0, 5).map((d, i) =>
      (i + 1) + '. ' + d.title + ': Rs.' + Number(d.amount).toFixed(2) + ' (Due ' + new Date(d.dueDate).toLocaleDateString() + ') [' + d.status + ']'
    ).join('; ');
    return {
      replyText: 'Found ' + dues.length + statusLabel + ' due(s)' + label + ' totalling Rs.' + total.toFixed(2) + ': ' + lines,
      negotiationOutcome: 'GENERAL_REPLY',
      nextStep: 'dispatch',
    };
  }

  // ── SUM DUES ───────────────────────────────────────────────────────────────
  if (intent === 'sum_dues') {
    const dues = await Dues.find({ userId, status: { $in: ['UNPAID', 'OVERDUE', 'PTP', 'VERIFYING'] } }).lean();
    const total = dues.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    return {
      replyText: 'You have Rs.' + total.toFixed(2) + ' outstanding across ' + dues.length + ' active due(s).',
      negotiationOutcome: 'GENERAL_REPLY',
      nextStep: 'dispatch',
    };
  }

  // ── TOP UPCOMING ───────────────────────────────────────────────────────────
  if (intent === 'top_upcoming') {
    const k = (intentData && intentData.topK && intentData.topK > 0) ? intentData.topK : 3;
    const dues = await Dues.find({ userId, status: { $in: ['UNPAID', 'OVERDUE', 'PTP', 'VERIFYING'] } }).sort({ dueDate: 1 }).limit(k).lean();
    const lines = dues.map((d, i) => (i + 1) + '. ' + d.title + ': Rs.' + Number(d.amount).toFixed(2) + ' due ' + new Date(d.dueDate).toDateString()).join('; ');
    return {
      replyText: 'Your top ' + dues.length + ' upcoming dues: ' + lines,
      negotiationOutcome: 'GENERAL_REPLY',
      nextStep: 'dispatch',
    };
  }

  // ── GET CUSTOMER INFO ─────────────────────────────────────────────────────
  if (intent === 'get_customer_info') {
    if (!customer) {
      const name = (intentData && intentData.customerName) || 'that customer';
      return {
        replyText: 'No customer named "' + name + '" found in your contacts.',
        negotiationOutcome: 'GENERAL_REPLY',
        nextStep: 'dispatch',
      };
    }
    const safeName = customer.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const pending = await Dues.find({
      userId,
      status: { $in: ['UNPAID', 'OVERDUE', 'PTP', 'VERIFYING'] },
      $or: [
        { customerId: customer._id },
        { title: { $regex: safeName, $options: 'i' } }
      ]
    }).lean();
    const total = pending.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    return {
      replyText: customer.name + ': phone=' + (customer.contactNo || customer.phone || 'N/A') + ', email=' + (customer.email || 'N/A') + ', status=' + (customer.status || 'Active') + '. Outstanding: Rs.' + total.toFixed(2) + ' across ' + pending.length + ' active invoices.',
      negotiationOutcome: 'GENERAL_REPLY',
      nextStep: 'dispatch',
    };
  }

  if (intent === 'list_customers') {
    const customers = await Customer.find({ userId }).sort({ name: 1 }).lean();
    if (!customers.length) return { replyText: 'No customer contacts yet. Add one by creating an invoice for them.', negotiationOutcome: 'CUSTOMER_LISTED', nextStep: 'dispatch' };
    const names = customers.slice(0, 8).map((c, i) => (i+1) + '. ' + c.name).join(', ');
    return { replyText: 'You have ' + customers.length + ' customers: ' + names + (customers.length > 8 ? '...' : ''), negotiationOutcome: 'CUSTOMER_LISTED', nextStep: 'dispatch' };
  }

  if (intent === 'call_customer') {
    if (!customer) return { replyText: 'Customer "' + (intentData.customerName || 'that') + '" not found. Add them to contacts first.', negotiationOutcome: 'GENERAL_REPLY', nextStep: 'dispatch' };
    return { negotiationOutcome: 'CALL_REQUESTED', replyText: 'Triggering a follow-up voice call to ' + customer.name + ' now.', nextStep: 'dispatch' };
  }

  if (intent === 'confirm_paid') {
    // MUST have a due to process payment
    if (!due) {
      return { 
        negotiationOutcome: 'GENERAL_REPLY',
        replyText: 'I could not identify which invoice you paid for. Please specify which customer or bill title you paid.',
        nextStep: 'dispatch' 
      };
    }

    // Always fetch fresh due from MongoDB to get 100% accurate current balance
    const freshDue = due._id ? await Dues.findById(due._id).lean() : due;
    const dueAmount = Number(freshDue?.amount || due?.amount || 0);
    const rawPayment = (intentData && intentData.paymentAmount != null) ? Number(intentData.paymentAmount) : null;
    
    // Strict validation: if payment amount was provided, ensure it is positive
    if (rawPayment !== null && (isNaN(rawPayment) || rawPayment <= 0)) {
      return {
        negotiationOutcome: 'GENERAL_REPLY',
        replyText: 'Please provide a valid positive payment amount.',
        nextStep: 'dispatch'
      };
    }

    // Partial payment: payment amount is less than current outstanding balance
    if (rawPayment !== null && rawPayment < dueAmount) {
      const paymentAmount = Math.round(rawPayment * 100) / 100;
      const remaining = Math.round((dueAmount - paymentAmount) * 100) / 100;
      return { 
        negotiationOutcome: 'PARTIAL_PAYMENT', 
        replyText: `Recorded partial payment of Rs.${paymentAmount.toFixed(2)} for "${freshDue.title}". Remaining balance is Rs.${remaining.toFixed(2)}. Customer and invoice records have been updated.`,
        nextStep: 'needs_compliance' 
      };
    }
    
    // Full payment: either rawPayment >= dueAmount or payment amount not explicitly specified
    const fullAmount = (rawPayment !== null && rawPayment >= dueAmount) ? rawPayment : dueAmount;
    return { 
      negotiationOutcome: 'PAID', 
      replyText: `Recorded full payment of Rs.${fullAmount.toFixed(2)} for "${freshDue.title}". Outstanding balance is now Rs.0.00. Customer and invoice records have been updated.`,
      nextStep: 'needs_compliance' 
    };
  }

  if (intent === 'snooze') {
    const days = intentData.snoozeDays || 3;
    if (policyLimits.maxSnoozeDays === 0 || days > policyLimits.maxSnoozeDays) {
      return {
        pendingApproval: { requestType: 'snooze', requestedValue: days, dueId: due ? due._id : null },
        replyText: 'This snooze requires owner approval. I have sent an alert. Please wait.',
        negotiationOutcome: 'AWAITING_APPROVAL', nextStep: 'needs_approval',
      };
    }
    return { negotiationOutcome: 'SNOOZE', replyText: 'Snoozed this invoice for ' + days + ' days.', nextStep: 'dispatch' };
  }

  if (intent === 'will_pay_today') {
    return { negotiationOutcome: 'PTP', replyText: 'Payment promise noted. We will follow up tomorrow if payment has not arrived.', nextStep: 'dispatch' };
  }

  if (intent === 'dispute') {
    return { negotiationOutcome: 'DISPUTE', replyText: 'We apologize. Our team will review this invoice and contact you within 2 business days.', nextStep: 'dispatch' };
  }

  // financial_advice / general_chat — use Gemini financial insight
  const dues = await Dues.find({ userId }).lean();
  const aiReply = await llmService.generateFinancialInsight(userText || '', dues);
  return { replyText: aiReply, negotiationOutcome: 'GENERAL_REPLY', nextStep: 'dispatch' };
}

module.exports = { negotiatorNode };
