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
 *   - VERIFIED  → Razorpay webhook confirmed payment → mark PAID
 *   - CLEAR     → Plausible claim but unverified → mark VERIFYING
 *   - SUSPICIOUS → Claim seems fraudulent → flag and mark VERIFYING
 */
const { Dues } = require('../../models/db');

async function complianceGuardNode(state) {
  const { due } = state;

  if (!due) {
    return { complianceStatus: 'CLEAR', negotiationOutcome: 'VERIFYING', replyText: 'Thank you. Our team will verify the payment and update records within 1-2 business days.', nextStep: 'dispatch' };
  }

  // Check if Razorpay webhook already confirmed payment for this due
  const freshDue = await Dues.findById(due._id).lean();
  const isVerified = freshDue && freshDue.metadata && freshDue.metadata.paymentVerified === true;

  if (isVerified) {
    return { complianceStatus: 'VERIFIED', negotiationOutcome: 'PAID', replyText: 'Your payment has been verified! The invoice is now marked as paid. Thank you!', nextStep: 'dispatch' };
  }

  // Not yet confirmed by Razorpay — set VERIFYING status, not PAID
  return {
    complianceStatus: 'CLEAR',
    negotiationOutcome: 'VERIFYING',
    replyText: 'Thank you! We could not auto-verify this payment yet. Our team will confirm within 1-2 business days. The invoice is now in Verifying status.',
    nextStep: 'dispatch',
  };
}

module.exports = { complianceGuardNode };
