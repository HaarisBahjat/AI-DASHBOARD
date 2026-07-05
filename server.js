require("dotenv").config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const overdueCron = require('./src/cron/overdues.cron');
const authRouter = require('./src/routes/auth.router');
const protectedRouter = require('./src/routes/protected.router');
const duesRoute = require('./src/routes/dues.route');
const reminderCron = require('./src/cron/reminder.cron');
const reminderRoute = require('./src/routes/reminder.route');
const { apiLimiter, authLimiter } = require('./src/midddlewares/rateLimiter'); // [A] IP rate limiting
const http = require('http');
const net = require('net');
const { Server } = require("socket.io");
const voiceSocket = require('./src/Sockets/voice.socket');
const { setIO } = require('./src/Sockets/socketState');
const PORT = Number(process.env.PORT) || 3004;
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const configuredOrigins = [process.env.CORS_ORIGIN, process.env.FRONTEND_ORIGIN]
    .filter(Boolean)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
const devOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
];
const allowedOrigins = new Set([
    ...configuredOrigins,
    ...(process.env.NODE_ENV === 'production' ? [] : devOrigins),
]);




const app = express();

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.has(origin)) {
                return callback(null, true);
            }

            return callback(new Error(`CORS blocked for origin: ${origin}`));
        },
        credentials: true,
        methods: ["GET", "POST"]
    }
});
setIO(io);
voiceSocket(io);

module.exports = { io };

// Middleware to parse JSON bodies and form data (Twilio uses form data)
// [H] Body size limit — prevents memory exhaustion from huge payloads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "token", "Authorization"]
}));


app.get('/test-socket', (req, res) => {
    res.sendFile(__dirname + '/test.html');
});
// [A] Rate limiters — applied BEFORE routes so all requests are throttled
app.use('/api/', apiLimiter);        // 100 req / 15 min per IP across all API routes
app.use('/api/auth', authLimiter);   // 5 req / 15 min per IP on auth endpoints

// Routes
app.use('/api/auth', authRouter);
app.use('/api/protected', protectedRouter);
app.use('/api/dues', duesRoute);
app.use('/api/reminders', reminderRoute);
app.use('/api/payments', require('./src/routes/payments.route'));
app.use('/api/reminder-outcomes', require('./src/routes/reminderRead.route'));
app.use('/api/conversations', require('./src/routes/conversation.routes'));
// Twilio: outbound voice TwiML + inbound SMS/WhatsApp webhook
app.use('/api/twilio', require('./src/routes/twilio.route'));
app.use("/audio", express.static("src/audio"));



app.use(express.static("public"));

function isPortInUse(port) {
    return new Promise((resolve, reject) => {
        const tester = net
            .createServer()
            .once('error', (err) => {
                if (err && err.code === 'EADDRINUSE') {
                    resolve(true);
                    return;
                }
                reject(err);
            })
            .once('listening', () => {
                tester.once('close', () => resolve(false)).close();
            })
            .listen(port);
    });
}


// Connect to MongoDB and start server
async function main() {
    const portBusy = await isPortInUse(PORT);
    if (portBusy) {
        console.log(`Port ${PORT} is already in use. Backend is already running, so this instance will exit.`);
        return;
    }

    server.once('error', (err) => {
        if (err && err.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use. Backend is likely already running.`);
            process.exit(0);
        }

        console.error('Server startup error:', err);
        process.exit(1);
    });

    if (!MONGODB_URI) {
        throw new Error('Missing MONGODB_URI in environment');
    }

    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');


    reminderCron.start();
    console.log('Reminder cron job started.');

    // Start the overdue cron job
    overdueCron.start();
    console.log('Overdue cron job started.');
    // Start the reminder cron job


    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

main().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
