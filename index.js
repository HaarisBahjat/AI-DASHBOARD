const express = require('express');
const app = express();
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const authRouter = require('./src/routes/auth.router');
const protectedRouter = require('./src/routes/protected.router');

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

async function main() {
    await mongoose.connect("mongodb+srv://haarismalick4_db_user:Lz5zswsFfrEAF5r1@cluster88.fozut1k.mongodb.net/dataBase")
    console.log("Connected to MongoDB");
    app.listen(3000, () => {
        console.log("Server is running on port 3000");
    });
}
main()