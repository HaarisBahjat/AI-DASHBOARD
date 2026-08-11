/**
 * src/controller/agent.controller.js
 *
 * HTTP handlers for /api/agent/* routes.
 * Bridges Express requests with the LangGraph agentGraph.
 */
const { agentGraph } = require('../agent/graph');
const { HumanMessage } = require('@langchain/core/messages');

// In-memory HITL approval store (keyed by threadId)
const pendingApprovals = new Map();

// POST /api/agent/interact — run one turn through the multi-agent graph
exports.interactHandler = async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    const userId = req.user.userId;
    if (!message || !message.trim()) return res.status(400).json({ error: 'message is required' });

    const threadId = conversationId || ('user-' + userId + '-' + Date.now());
    const finalState = await agentGraph.invoke(
      { userId, conversationId: conversationId || null, userText: message.trim(), messages: [new HumanMessage(message.trim())] },
      { configurable: { thread_id: threadId } }
    );

    if (finalState.negotiationOutcome === 'AWAITING_APPROVAL' && finalState.pendingApproval) {
      pendingApprovals.set(threadId, { threadId, userId, conversationId, pendingApproval: finalState.pendingApproval, createdAt: new Date() });
      try {
        const { getIO } = require('../Sockets/socketState');
        const io = getIO();
        if (io) io.to('user:' + userId).emit('hitl-approval-required', { threadId, pendingApproval: finalState.pendingApproval });
      } catch (_) {}
    }

    return res.json({ message: finalState.replyText || 'Done.', negotiationOutcome: finalState.negotiationOutcome, customer: finalState.customer, due: finalState.due, awaitingApproval: finalState.negotiationOutcome === 'AWAITING_APPROVAL' });
  } catch (err) {
    console.error('[AgentController] interactHandler:', err.message);
    res.status(500).json({ error: 'Agent processing failed: ' + err.message });
  }
};

// GET /api/agent/pending-approvals
exports.listPendingApprovalsHandler = async (req, res) => {
  try {
    const userId = req.user.userId;
    res.json({ pendingApprovals: Array.from(pendingApprovals.values()).filter(a => a.userId === userId) });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/agent/approvals/:threadId/resolve
exports.resolveApprovalHandler = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { approved, reason } = req.body;
    const userId = req.user.userId;
    const pending = pendingApprovals.get(threadId);
    if (!pending || pending.userId !== userId) return res.status(404).json({ error: 'Pending approval not found' });

    const resumeState = {
      pendingApproval: { ...pending.pendingApproval, approved: !!approved, rejectionReason: reason || null },
      negotiationOutcome: approved ? (pending.pendingApproval.requestType === 'snooze' ? 'SNOOZE' : 'PTP') : 'GENERAL_REPLY',
      replyText: approved ? 'The owner approved. Proceeding with your ' + (pending.pendingApproval.requestType || 'request') + '.' : 'The owner declined this request. Standard arrangements apply.',
      nextStep: 'dispatch',
    };

    const finalState = await agentGraph.invoke(resumeState, { configurable: { thread_id: threadId } });
    pendingApprovals.delete(threadId);
    return res.json({ message: finalState.replyText || (approved ? 'Approved.' : 'Rejected.'), negotiationOutcome: finalState.negotiationOutcome });
  } catch (err) {
    console.error('[AgentController] resolveApprovalHandler:', err.message);
    res.status(500).json({ error: err.message });
  }
};
