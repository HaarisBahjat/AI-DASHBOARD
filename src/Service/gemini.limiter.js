/**
 * gemini.limiter.js
 *
 * A lightweight, zero-dependency rate limiter + retry wrapper for all
 * Gemini API calls in this project.
 *
 * TWO-LAYER PROTECTION:
 *
 *   Layer 1 — Sliding-window rate limiter
 *     Tracks request timestamps in a rolling 60-second window.
 *     If the limit is reached, the call WAITS (async) until a slot opens.
 *     This keeps us strictly below the Gemini RPM quota.
 *
 *   Layer 2 — Exponential backoff retry
 *     If a 429 still comes back (e.g. concurrent processes, burst),
 *     we retry up to MAX_RETRIES times with jittered exponential delay.
 *     Non-rate-limit errors (4xx, 5xx) are re-thrown immediately.
 *
 * CONFIGURATION (via .env):
 *   GEMINI_RPM_LIMIT   — max requests per minute  (default: 12, free tier safe)
 *   GEMINI_MAX_RETRIES — retry attempts on 429    (default: 3)
 *
 * USAGE:
 *   const { callGemini } = require('./gemini.limiter');
 *   const response = await callGemini({ contents: [...], generationConfig: {...} });
 *   // response.data is the raw Gemini response
 */

const axios = require('axios');

const GEMINI_MODEL = () => process.env.GEMINI_MODEL || 'gemini-flash-latest';
const GEMINI_URL   = () => `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL()}:generateContent`;
const API_KEY      = () => process.env.GEMINI_API_KEY; // read lazily so env is loaded
const WINDOW_MS    = 60_000; // 1 minute sliding window
const RPM_LIMIT    = parseInt(process.env.GEMINI_RPM_LIMIT   || '12', 10); // 12 of 15 → 20% headroom
const MAX_RETRIES  = parseInt(process.env.GEMINI_MAX_RETRIES || '3',  10);

// ─── Sliding-window rate limiter state ────────────────────────────────────
// Timestamps (ms) of recent successful dispatch slots.
// Stored in-process — fine for single-process deployment.
const _timestamps = [];

/**
 * Block until a rate-limit slot is available, then claim it.
 * Uses recursion to re-check after waiting (handles bursts correctly).
 */
async function _waitForSlot() {
    const now = Date.now();

    // Evict timestamps older than the window
    while (_timestamps.length > 0 && _timestamps[0] <= now - WINDOW_MS) {
        _timestamps.shift();
    }

    if (_timestamps.length < RPM_LIMIT) {
        // Slot available — claim it
        _timestamps.push(now);
        return;
    }

    // No slot — calculate minimum wait time until oldest timestamp expires
    const oldestExpiry = _timestamps[0] + WINDOW_MS;
    const waitMs = oldestExpiry - now + 50; // +50ms buffer
    console.log(
        `[Gemini Limiter] RPM limit (${RPM_LIMIT}) reached. ` +
        `Waiting ${waitMs}ms for next slot. Queue depth: ${_timestamps.length}`
    );
    await new Promise(resolve => setTimeout(resolve, waitMs));
    return _waitForSlot(); // re-check after wait
}

// ─── Diagnostics ───────────────────────────────────────────────────────────
/** Current number of requests dispatched in the last 60s */
exports.currentRPM = () => {
    const cutoff = Date.now() - WINDOW_MS;
    return _timestamps.filter(t => t > cutoff).length;
};

// ─── Core call wrapper ─────────────────────────────────────────────────────

/**
 * Call Gemini with rate limiting + exponential backoff retry.
 *
 * @param {object} payload   - Gemini request body (contents, generationConfig…)
 * @param {object} [options]
 * @param {number} [options.temperature=0]
 * @returns {Promise<object>} Raw Gemini response (.data.candidates[0]…)
 */
exports.callGemini = async (payload, options = {}) => {
    const temperature = options.temperature ?? 0;

    const body = {
        ...payload,
        generationConfig: {
            temperature,
            ...(payload.generationConfig || {}),
        },
    };

    let lastErr;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        // ── Wait for a rate-limit slot before dispatching ──────────────────
        await _waitForSlot();

        try {
            const response = await axios.post(
                `${GEMINI_URL()}?key=${API_KEY()}`,
                body,
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 30_000, // 30s hard timeout per request
                }
            );
            return response; // ✅ success
        } catch (err) {
            lastErr = err;
            const status = err.response?.status;
            const isTimeout = err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT' || (err.message && err.message.toLowerCase().includes('timeout'));
            const isRetryable = status === 429 || status === 503 || status === 500 || status === 502 || status === 504 || isTimeout;

            if (isRetryable) {
                // Exponential backoff: 2s, 4s, 8s (+random 0-800ms)
                const base  = Math.pow(2, attempt + 1) * 1000;
                const jitter = Math.random() * 800;
                const delay  = base + jitter;
                console.warn(
                    `[Gemini Limiter] Retryable issue (HTTP ${status || 'timeout'}) received. ` +
                    `Attempt ${attempt + 1}/${MAX_RETRIES}. ` +
                    `Retrying in ${Math.round(delay)}ms…`
                );
                await new Promise(resolve => setTimeout(resolve, delay));
                // Continue to next attempt
            } else {
                // Non-rate-limit error — fail immediately, no retry
                console.error(
                    `[Gemini Limiter] Non-retryable error (HTTP ${status || 'unknown'}):`,
                    err.response?.data || err.message
                );
                throw err;
            }
        }
    }

    // All retries exhausted
    console.error(`[Gemini Limiter] All ${MAX_RETRIES} retries failed for this request.`);
    throw lastErr;
};

/**
 * Convenience: extract the text content from a Gemini response.
 * @param {object} response - return value of callGemini()
 * @returns {string}
 */
exports.extractText = (response) => {
    const raw = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
};

// ─── Function Calling support ──────────────────────────────────────────────

/**
 * Call Gemini with Function Calling (tool declarations).
 * Gemini is forced to respond with a structured functionCall object
 * instead of free-form text, eliminating hallucination in entity extraction.
 *
 * @param {object} payload   - Gemini request body (contents array)
 * @param {Array}  tools     - Array of { functionDeclarations: [...] }
 * @param {object} [options] - { temperature }
 * @returns {Promise<object>} Raw Gemini response
 */
exports.callGeminiWithTools = async (payload, tools, options = {}) => {
    const body = {
        ...payload,
        tools,
        tool_config: { function_calling_config: { mode: 'ANY' } }
    };
    return exports.callGemini(body, options);
};

/**
 * Extract the functionCall result from a Gemini Function Calling response.
 * Returns { name, args } or null if Gemini returned text instead of a call.
 *
 * @param {object} response - return value of callGeminiWithTools()
 * @returns {{ name: string, args: object } | null}
 */
exports.extractFunctionCall = (response) => {
    const parts = response.data?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
        if (part.functionCall) {
            return {
                name: part.functionCall.name,
                args: part.functionCall.args || {},
            };
        }
    }
    return null; // Gemini returned text — caller should fall back to general_chat
};
