/**
 * src/agent/nodes/actionDispatcher.js — GATE 5: The Executor
 *
 * The terminal node that runs REAL SIDE EFFECTS:
 *   1. Updates Mongoose Dues document based on negotiationOutcome
 *   2. Triggers Twilio voice call if CALL_REQUESTED
 *   3. Saves system reply message to MongoDB ConversationSession
 *   4. Synthesizes TTS audio buffer
 *   5. Returns { replyText, audioBuffer } for voice.socket.js to emit
 *
 * WHY ALL SIDE EFFECTS ARE HERE:
 *   Negotiator is a "thinking" node — decides WHAT to do.
 *   Dispatcher is an "acting" node — actually DOES it.
 *   This separation lets you test negotiator logic without touching DB,
 *   and add new actions without changing the negotiator brain.
 */
const { Dues, Conversation } = require('../../models/db');
const { textToSpeech } = require('../../Service/tts.service');
const twilioService = require('../../Service/twilio.service');

async function actionDispatcherNode(state) {
  const { due, customer, negotiationOutcome, replyText, conversationId, intentData } = state;

  // STEP 1: Execute DB mutations based on what the negotiator decided
  try {
    if (due && due._id) {
      if (negotiationOutcome === 'SNOOZE') {
        const days = (intentData && intentData.snoozeDays) ? Number(intentData.snoozeDays) : 3;
        const snoozeDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        await Dues.findByIdAndUpdate(due._id, { snoozeDate, status: 'UNPAID' });

      } else if (negotiationOutcome === 'PTP') {
        await Dues.findByIdAndUpdate(due._id, { status: 'PTP', promiseDate: new Date(Date.now() + 86400000), 'metadata.promiseToPay': true });

      } else if (negotiationOutcome === 'PAID') {
        const freshDue = await Dues.findById(due._id).lean();
        const currentAmount = freshDue ? Number(freshDue.amount || 0) : Number(due.amount || 0);
        const originalAmount = Number(freshDue?.metadata?.originalAmount || currentAmount);
        const prevPaid = Number(freshDue?.metadata?.totalPaid || 0);
        const paymentRecord = { amount: currentAmount, date: new Date(), status: 'COMPLETED' };

        await Dues.findByIdAndUpdate(due._id, {
          amount: 0,
          status: 'PAID',
          ...(customer && !freshDue?.customerId ? { customerId: customer._id } : {}),
          'metadata.originalAmount': originalAmount,
          'metadata.totalPaid': Math.round((prevPaid + currentAmount) * 100) / 100,
          'metadata.lastPaymentDate': new Date(),
          $push: { 'metadata.payments': paymentRecord }
        });

      } else if (negotiationOutcome === 'VERIFYING') {
        await Dues.findByIdAndUpdate(due._id, { status: 'VERIFYING' });

      } else if (negotiationOutcome === 'PARTIAL_PAYMENT') {
        // Fetch fresh due from database to avoid stale in-memory calculations
        const freshDue = await Dues.findById(due._id).lean();
        const currentAmount = freshDue ? Number(freshDue.amount || 0) : Number(due.amount || 0);
        const paymentAmount = (intentData && intentData.paymentAmount) ? Number(intentData.paymentAmount) : 0;
        const remainingAmount = Math.max(0, Math.round((currentAmount - paymentAmount) * 100) / 100);
        const isFullyPaid = remainingAmount === 0;

        const originalAmount = Number(freshDue?.metadata?.originalAmount || currentAmount);
        const prevPaid = Number(freshDue?.metadata?.totalPaid || 0);
        const paymentRecord = { amount: paymentAmount, date: new Date(), status: 'COMPLETED' };

        await Dues.findByIdAndUpdate(
          due._id,
          {
            amount: remainingAmount,
            status: isFullyPaid ? 'PAID' : 'UNPAID',
            ...(customer && !freshDue?.customerId ? { customerId: customer._id } : {}),
            'metadata.originalAmount': originalAmount,
            'metadata.totalPaid': Math.round((prevPaid + paymentAmount) * 100) / 100,
            'metadata.lastPaymentDate': new Date(),
            $push: { 'metadata.payments': paymentRecord }
          }
        );

      } else if (negotiationOutcome === 'DISPUTE') {
        await Dues.findByIdAndUpdate(due._id, { 'metadata.disputed': true, 'metadata.disputedAt': new Date() });
      }
    }

    // STEP 2: Trigger Twilio voice call if negotiator decided to call
    if (negotiationOutcome === 'CALL_REQUESTED' && customer && customer.phone && due) {
      try {
        await twilioService.initiateCall({ customerId: customer._id.toString(), dueId: due._id.toString() });
      } catch (callErr) {
        console.error('[ActionDispatcher] Twilio call failed:', callErr.message);
      }
    }

    // STEP 3: Save user question & assistant reply to MongoDB for Conversations tab history
    if (conversationId) {
      if (state.userText && state.userText.trim()) {
        await Conversation.create({
          conversationId,
          roles: 'USER',
          message: state.userText.trim(),
        });
      }
      if (replyText && replyText.trim()) {
        await Conversation.create({
          conversationId,
          roles: 'ASSISTANT',
          message: replyText.trim(),
        });
      }
    }

  } catch (dbErr) {
    console.error('[ActionDispatcher] DB error:', dbErr.message);
    // Non-fatal: TTS and reply still go out even if DB write fails
  }

  // STEP 4: Synthesize TTS audio (graceful degradation if TTS is down)
  let audioBuffer = null;
  try {
    audioBuffer = await textToSpeech(replyText);
  } catch (ttsErr) {
    console.warn('[ActionDispatcher] TTS unavailable:', ttsErr.message);
  }

  return { replyText, audioBuffer, nextStep: 'done' };
}

module.exports = { actionDispatcherNode };
