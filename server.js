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

const app = express();

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

// Routes
app.use('/api/auth', authRouter);
app.use('/api/protected', protectedRouter);
app.use('/api/dues', duesRoute);
app.use('/api/reminders', reminderRoute);
app.use('/api/reminder-outcomes', require('./src/routes/reminderRead.route'));


// Connect to MongoDB and start server
async function main() {
    await mongoose.connect('mongodb+srv://haarismalick4_db_user:Lz5zswsFfrEAF5r1@cluster88.fozut1k.mongodb.net/dataBase');
    console.log('Connected to MongoDB');
    

 reminderCron.start();    
    console.log('Reminder cron job started.');

    // Start the overdue cron job
    overdueCron.start();    
    console.log('Overdue cron job started.');
    // Start the reminder cron job
   

    app.listen(3003, () => {
        console.log('Server is running on port 3003');
    });
}

main().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
