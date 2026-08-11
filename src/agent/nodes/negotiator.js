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

  if (intent === 'list_dues') {
    const filter = { userId };
    let label = '';
    if (customer) { filter.customerId = customer._id; label = ' for ' + customer.name; }
    const dues = await Dues.find(filter).sort({ dueDate: 1 }).lean();
    if (!dues.length) return { replyText: 'No dues found' + label + '.', negotiationOutcome: 'GENERAL_REPLY', nextStep: 'dispatch' };
    const total = dues.reduce((s, d) => s + (d.amount || 0), 0);
    const lines = dues.slice(0, 5).map((d, i) => (i+1) + '. ' + d.title + ': Rs.' + d.amount + ' (' + new Date(d.dueDate).toLocaleDateString() + ') [' + d.status + ']').join('; ');
    return { replyText: 'Found ' + dues.length + ' due(s)' + label + ' totalling Rs.' + total.toFixed(2) + ': ' + lines, negotiationOutcome: 'GENERAL_REPLY', nextStep: 'dispatch' };
  }

  if (intent === 'sum_dues') {
    const dues = await Dues.find({ userId, status: { $in: ['UNPAID', 'OVERDUE'] } }).lean();
    const total = dues.reduce((s, d) => s + (d.amount || 0), 0);
    return { replyText: 'You have Rs.' + total.toFixed(2) + ' outstanding across ' + dues.length + ' unpaid dues.', negotiationOutcome: 'GENERAL_REPLY', nextStep: 'dispatch' };
  }

  if (intent === 'top_upcoming') {
    const k = (intentData.topK && intentData.topK > 0) ? intentData.topK : 3;
    const dues = await Dues.find({ userId }).sort({ dueDate: 1 }).limit(k).lean();
    const lines = dues.map((d, i) => (i+1) + '. ' + d.title + ': Rs.' + d.amount + ' due ' + new Date(d.dueDate).toDateString()).join('; ');
    return { replyText: 'Your top ' + dues.length + ' upcoming dues: ' + lines, negotiationOutcome: 'GENERAL_REPLY', nextStep: 'dispatch' };
  }

  if (intent === 'get_customer_info') {
    if (!customer) return { replyText: 'No customer named "' + (intentData.customerName || 'that') + '" found in your contacts.', negotiationOutcome: 'GENERAL_REPLY', nextStep: 'dispatch' };
    const pending = await Dues.find({ userId, customerId: customer._id, status: { $in: ['UNPAID', 'OVERDUE'] } }).lean();
    const total = pending.reduce((s, d) => s + (d.amount || 0), 0);
    return {
      replyText: customer.name + ': phone=' + (customer.phone || 'N/A') + ', email=' + (customer.email || 'N/A') + ', status=' + (customer.status || 'Active') + '. Outstanding: Rs.' + total + ' across ' + pending.length + ' invoices.',
      negotiationOutcome: 'GENERAL_REPLY', nextStep: 'dispatch',
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
    // Route to complianceGuard — never mark PAID on customer's word alone
    return { negotiationOutcome: 'PAID', replyText: 'Thank you! Our team will verify your payment within 1-2 business days.', nextStep: 'needs_compliance' };
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
