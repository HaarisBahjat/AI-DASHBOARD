const express = require('express');
const app = express();
const cors = require('cors');
const { mongo } = require('mongoose');

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cors({
    origin: (origin, callback) => {
        callback(null, true); // allow all origins, including file:// (no origin)
    },
    credentials: true,
    methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allowedHeaders: ["Content-Type", "token"]
}));

async function main() {
    await mongoose.connect("mongodb+srv://haarismalick4_db_user:Lz5zswsFfrEAF5r1@cluster88.fozut1k.mongodb.net/dataBase")
    console.log("Connected to MongoDB");
    app.listen(3000, () => {
        console.log("Server is running on port 3000");
    });
}
main()