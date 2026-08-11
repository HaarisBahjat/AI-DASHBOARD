/**
 * src/agent/state.js — THE SHARED WHITEBOARD
 *
 * Every LangGraph node reads from and writes to this state object.
 * It travels through the graph like a relay baton, each node stamping
 * its contribution without destroying previous work.
 *
 * REDUCERS control how LangGraph merges updates:
 *   messagesStateReducer → APPENDS new messages (history never lost)
 *   (a, b) => b ?? a    → OVERWRITES with new value if provided
 */
const { Annotation, messagesStateReducer } = require('@langchain/langgraph');

const AgentState = Annotation.Root({
  messages:           Annotation({ reducer: messagesStateReducer, default: () => [] }),
  userId:             Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  conversationId:     Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  userText:           Annotation({ reducer: (a, b) => b ?? a, default: () => '' }),
  intentData:         Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  customer:           Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  due:                Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  policyLimits:       Annotation({ reducer: (a, b) => b ?? a, default: () => ({ maxSnoozeDays: 7, maxWaiverPct: 5, riskTier: 'LOW' }) }),
  negotiationOutcome: Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  replyText:          Annotation({ reducer: (a, b) => b ?? a, default: () => '' }),
  pendingApproval:    Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  complianceStatus:   Annotation({ reducer: (a, b) => b ?? a, default: () => 'CLEAR' }),
  audioBuffer:        Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
  nextStep:           Annotation({ reducer: (a, b) => b ?? a, default: () => 'dispatch' }),
});

module.exports = { AgentState };
