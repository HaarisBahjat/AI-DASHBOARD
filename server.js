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
const http = require('http');
const net = require('net');
const {Server} = require("socket.io");
const voiceSocket = require('./src/Sockets/voice.socket');
const { setIO } = require('./src/Sockets/socketState');
const PORT = Number(process.env.PORT) || 3004;
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;




const app = express();

const server= http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
setIO(io);
voiceSocket(io);

module.exports = {io};

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: (origin, callback) => {
        callback(null, true); // allow all origins, including file:// (no origin)
    },
    credentials: true,
    methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allowedHeaders: ["Content-Type", "token", "Authorization"]
}));


app.get('/test-socket',(req,res) => {
    res.sendFile(__dirname + '/test.html');
});
// Routes
app.use('/api/auth', authRouter);
app.use('/api/protected', protectedRouter);
app.use('/api/dues', duesRoute);
app.use('/api/reminders', reminderRoute);
app.use('/api/payments', require('./src/routes/payments.route'));
app.use('/api/reminder-outcomes', require('./src/routes/reminderRead.route'));
app.use('/api/conversations', require('./src/routes/conversation.routes'));
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
