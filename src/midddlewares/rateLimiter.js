//ratelimiting
const ratelimiting = require("express-rate-limit");

exports.apiLimiter = ratelimiting({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { message: "Too many requests from this IP, please try again after 15 minutes" },
});

exports.authLimiter = ratelimiting({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    message: { message: "Too many requests from this IP, please try again after 15 minutes" },
});

