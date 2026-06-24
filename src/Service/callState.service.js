/**
 * callState.service.js
 *
 * In-memory store for active Twilio call conversations.
 *
 * Why in-memory (Map) and not Redis?
 *   - This is a single-process Node.js server (no cluster mode / load balancer)
 *   - Calls last 30–120 seconds — ephemeral by nature
 *   - TTL timers auto-clean state when calls end
 *   - Zero extra infrastructure needed
 *
 * Key   : Twilio CallSid  (e.g. "CA1234abcd...")
 * Value : CallState object (see below)
 *
 * To upgrade to Redis later: swap initCall/getCall/addTurn/endCall
 * implementations — the callers don't change.
 */

const store = new Map();

// Auto-expire call state after 10 minutes max (covers longest possible call)
const CALL_TTL_MS = 10 * 60 * 1000;

const MAX_USER_TURNS = 5; // [existing] prevent infinite loops

// [D] Max simultaneous in-flight calls — prevents Twilio balance drain
// and in-memory Map growth in case of abuse or cron over-firing.
const MAX_CONCURRENT_CALLS = parseInt(process.env.MAX_CONCURRENT_CALLS || '20', 10);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initialise state for a new call.
 *
 * @param {string} callSid  - Twilio CallSid
 * @param {object} opts
 * @param {string} opts.dueId
 * @param {string} opts.userId
 * @param {object} opts.due   - { title, amount, dueDate }
 */
exports.initCall = (callSid, { dueId, userId, due }) => {
    // [D] Reject new calls when at capacity
    if (store.size >= MAX_CONCURRENT_CALLS) {
        console.warn(`[CallState] MAX_CONCURRENT_CALLS (${MAX_CONCURRENT_CALLS}) reached — refusing new call ${callSid}`);
        throw new Error(`Server busy: max concurrent calls (${MAX_CONCURRENT_CALLS}) reached`);
    }

    // Clear any stale state for this SID (e.g. retried call)
    if (store.has(callSid)) {
        clearTimeout(store.get(callSid)._timer);
        store.delete(callSid);
    }

    const _timer = setTimeout(() => {
        store.delete(callSid);
        console.log(`[CallState] TTL expired → cleaned ${callSid}`);
    }, CALL_TTL_MS);

    const state = {
        dueId,
        userId,
        due,             // { title, amount, dueDate }
        turns: [],       // [{ role: 'ai'|'user', text, at }]
        userTurnCount: 0,
        startedAt: Date.now(),
        ended: false,
        _timer,
    };

    store.set(callSid, state);
    console.log(`[CallState] Init ${callSid}  active calls: ${store.size}`);
    return state;
};

/**
 * Retrieve call state. Returns null if not found (e.g. server restart).
 */
exports.getCall = (callSid) => store.get(callSid) || null;

/**
 * Append a turn to the conversation history.
 *
 * @param {string} callSid
 * @param {'ai'|'user'} role
 * @param {string} text
 * @returns {object|null} updated state
 */
exports.addTurn = (callSid, role, text) => {
    const state = store.get(callSid);
    if (!state) return null;

    state.turns.push({ role, text, at: Date.now() });
    if (role === 'user') state.userTurnCount++;
    return state;
};

/**
 * Check if the call should be force-ended (max turns reached).
 */
exports.isMaxTurnsReached = (callSid) => {
    const state = store.get(callSid);
    return state ? state.userTurnCount >= MAX_USER_TURNS : false;
};

/**
 * Remove call state and cancel the TTL timer.
 * Call this when the AI decides to hang up.
 *
 * @returns {object|null} final state snapshot (for logging)
 */
exports.endCall = (callSid) => {
    const state = store.get(callSid);
    if (!state) return null;

    clearTimeout(state._timer);
    state.ended = true;
    store.delete(callSid);
    console.log(`[CallState] End ${callSid}  active calls: ${store.size}`);
    return state;
};

/** Diagnostic — number of calls currently in progress */
exports.getActiveCount = () => store.size;
