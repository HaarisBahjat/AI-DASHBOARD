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

// Conditional router: reads state.nextStep to decide which node comes next
function routeByNextStep(state) {
  if (state.negotiationOutcome === 'DUE_CREATED') return 'dispatch';
  // If entityResolver already put a reply (missing fields, errors), go to dispatch
  if (state.replyText && (!state.intentData || !state.intentData.intent)) return 'dispatch';
  return state.nextStep || 'dispatch';
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

// After entityResolver: DUE_CREATED shortcuts to dispatch; others go to riskProfiler
workflow.addConditionalEdges('entityResolver', routeByNextStep, {
  dispatch:          'actionDispatcher',
  needs_compliance:  'complianceGuard',
  needs_approval:    'humanApproval',
  default:           'riskProfiler',
});

// riskProfiler → negotiator (always; only computes policy limits)
workflow.addEdge('riskProfiler', 'negotiator');

// After negotiator: route by what it decided
workflow.addConditionalEdges('negotiator', routeByNextStep, {
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
