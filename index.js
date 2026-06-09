require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const authRouter = require('./src/routes/auth.router');
const protectedRouter = require('./src/routes/protected.router');
const duesRoute = require('./src/routes/dues.route');
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

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

// Start the server after connecting to MongoDB

async function main() {
    if (!MONGODB_URI) {
        throw new Error('Missing MONGODB_URI in environment');
    }

    await mongoose.connect(MONGODB_URI)
    console.log("Connected to MongoDB");
    app.listen(3004, () => {
        console.log("Server is running on port 3004");
    });
}
main()