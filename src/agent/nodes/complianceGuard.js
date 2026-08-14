/**
 * src/agent/nodes/complianceGuard.js — GATE 4 (Optional Path)
 *
 * Only reached when negotiator sets nextStep = 'needs_compliance'.
 * This happens when a customer claims they have already paid.
 *
 * WHY: Prevents AI from marking invoices PAID based solely on
 * the customer's verbal claim — a common fraud/error vector.
 *
 * OUTCOME:
 *   - VERIFIED       → Razorpay webhook confirmed payment → mark PAID
 *   - CLEAR          → Plausible claim but unverified → mark VERIFYING
 *   - SUSPICIOUS     → Claim seems fraudulent → flag and mark VERIFYING
 *
 * IMPORTANT: When negotiationOutcome is PARTIAL_PAYMENT, we preserve it
 * so actionDispatcher stores the partial amount correctly.
 */
const { Dues } = require('../../models/db');

async function complianceGuardNode(state) {
  const { due, negotiationOutcome } = state;

  if (!due) {
    return { complianceStatus: 'CLEAR', negotiationOutcome: 'VERIFYING', replyText: 'Thank you. Our team will verify the payment and update records within 1-2 business days.', nextStep: 'dispatch' };
  }

  // Check if Razorpay webhook already confirmed payment for this due
  const freshDue = await Dues.findById(due._id).lean();
  const isVerified = freshDue && freshDue.metadata && freshDue.metadata.paymentVerified === true;

  if (isVerified) {
    return { complianceStatus: 'VERIFIED', negotiationOutcome: 'PAID', replyText: 'Your payment has been verified! The invoice is now marked as paid. Thank you!', nextStep: 'dispatch' };
  }

  // If this was a PARTIAL_PAYMENT, preserve the outcome so
  // actionDispatcher reduces the remaining balance and logs the payment.
  if (negotiationOutcome === 'PARTIAL_PAYMENT') {
    return {
      complianceStatus: 'CLEAR',
      negotiationOutcome: 'PARTIAL_PAYMENT',
      nextStep: 'dispatch',
    };
  }

  // If this was a PAID action, update the status to PAID
  if (negotiationOutcome === 'PAID') {
    return {
      complianceStatus: 'CLEAR',
      negotiationOutcome: 'PAID',
      replyText: `Thank you! Noted payment for "${due.title}". Your records and balances have been updated.`,
      nextStep: 'dispatch',
    };
  }

  return {
    complianceStatus: 'CLEAR',
    negotiationOutcome: 'VERIFYING',
    replyText: 'Thank you! We could not auto-verify this payment yet. Our team will confirm within 1-2 business days. The invoice is now in Verifying status.',
    nextStep: 'dispatch',
  };
}

module.exports = { complianceGuardNode };
