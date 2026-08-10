//ratelimiting
const ratelimiting = require("express-rate-limit");

// General API limiter — 100 requests per 15 minutes per IP
exports.apiLimiter = ratelimiting({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { message: "Too many requests from this IP, please try again after 15 minutes" },
    standardHeaders: true,
    legacyHeaders: false,
});

// Auth limiter — strict: 5 attempts per 15 minutes (brute-force protection)
exports.authLimiter = ratelimiting({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { message: "Too many login attempts. Please try again after 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // only count failed attempts
});

// Follow-up trigger limiter — max 3 bulk or individual follow-up triggers per hour per IP
// Prevents an attacker (or a bug) from firing thousands of Twilio calls
exports.followupLimiter = ratelimiting({
    windowMs: 60 * 60 * 1000,   // 1 hour
    max: 3,
    message: { message: "Follow-up trigger limit reached. You can trigger at most 3 times per hour." },
    standardHeaders: true,
    legacyHeaders: false,
});
