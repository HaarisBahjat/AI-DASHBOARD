/**
 * src/agent/graph.js — THE CONDUCTOR
 *
 * Assembles all 5 agent nodes into a LangGraph StateGraph.
 *
 * FLOW:
 *   START → entityResolver
 *     (DUE_CREATED shortcut) → actionDispatcher → END
 *     (all other intents)    → riskProfiler → negotiator
 *       (needs_compliance) → complianceGuard → actionDispatcher → END
 *       (needs_approval)   → humanApproval  → actionDispatcher → END
 *       (dispatch)         → actionDispatcher → END
 *
 * CHECKPOINTER (MemorySaver):
 *   Stores full graph state in RAM per thread_id (= conversationId).
 *   Same thread_id across multiple invoke() calls = shared multi-turn memory.
 */
const { StateGraph, MemorySaver, END, START } = require('@langchain/langgraph');
const { AgentState }             = require('./state');
const { entityResolverNode }     = require('./nodes/entityResolver');
const { riskProfilerNode }       = require('./nodes/riskProfiler');
const { negotiatorNode }         = require('./nodes/negotiator');
const { complianceGuardNode }    = require('./nodes/complianceGuard');
const { actionDispatcherNode }   = require('./nodes/actionDispatcher');

// HITL node: pauses execution for owner approval
// In this version it sets the state so actionDispatcher emits a socket alert
async function humanApprovalNode(state) {
  console.log('[HITL] Owner approval required:', JSON.stringify(state.pendingApproval));
  // actionDispatcher will detect AWAITING_APPROVAL and skip DB mutations
  // voice.socket.js will emit hitl-approval-required to the owner's browser
  return {
    replyText: 'I have sent an approval request to the business owner. Please wait for their response.',
    negotiationOutcome: 'AWAITING_APPROVAL',
    nextStep: 'dispatch',
  };
}

// Router after entityResolver:
// If entityResolver created a due, or produced an early reply (missing fields / error),
// route directly to actionDispatcher.
// Otherwise, route to riskProfiler -> negotiator!
//
// IMPORTANT: entityResolver explicitly sets replyText: '' when it wants the
// negotiator to run (e.g. confirm_paid). Only route to dispatch when replyText
// is a non-empty, meaningful reply \u2014 not an empty string from a reset.
function routeAfterEntityResolver(state) {
  if (state.negotiationOutcome === 'DUE_CREATED') return 'dispatch';
  if (state.replyText && state.replyText.trim().length > 0) return 'dispatch';
  return 'riskProfiler';
}

// Router after negotiator:
// Reads state.nextStep set by negotiatorNode ("needs_compliance" | "needs_approval" | "dispatch")
function routeAfterNegotiator(state) {
  if (state.nextStep === 'needs_compliance') return 'needs_compliance';
  if (state.nextStep === 'needs_approval') return 'needs_approval';
  return 'dispatch';
}

// ── ASSEMBLE ─────────────────────────────────────────────────────────────────
const workflow = new StateGraph(AgentState);

workflow.addNode('entityResolver',   entityResolverNode);
workflow.addNode('riskProfiler',     riskProfilerNode);
workflow.addNode('negotiator',       negotiatorNode);
workflow.addNode('complianceGuard',  complianceGuardNode);
workflow.addNode('humanApproval',    humanApprovalNode);
workflow.addNode('actionDispatcher', actionDispatcherNode);

// Entry point
workflow.addEdge(START, 'entityResolver');

// After entityResolver: DUE_CREATED / early reply -> dispatch; others -> riskProfiler
workflow.addConditionalEdges('entityResolver', routeAfterEntityResolver, {
  dispatch:     'actionDispatcher',
  riskProfiler: 'riskProfiler',
});

// riskProfiler → negotiator (always; only computes policy limits)
workflow.addEdge('riskProfiler', 'negotiator');

// After negotiator: route by what it decided
workflow.addConditionalEdges('negotiator', routeAfterNegotiator, {
  dispatch:          'actionDispatcher',
  needs_compliance:  'complianceGuard',
  needs_approval:    'humanApproval',
});

// After complianceGuard and humanApproval: always go to action
workflow.addEdge('complianceGuard',  'actionDispatcher');
workflow.addEdge('humanApproval',    'actionDispatcher');

// Terminal
workflow.addEdge('actionDispatcher', END);

// ── COMPILE ───────────────────────────────────────────────────────────────────
const checkpointer = new MemorySaver();
const agentGraph = workflow.compile({ checkpointer });
console.log('[Graph] LangGraph StateGraph compiled OK');
module.exports = { agentGraph };
