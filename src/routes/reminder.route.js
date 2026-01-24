const express = require('express');
const router = express.Router();
const authMiddleware = require('../midddlewares/auth');
const reminder= require("../models/db").Reminder;

router.get('/reminders', authMiddleware, async (req, res) => {
    const reminders = await reminder.find({ userId: req.user.id });
    res.json(reminders);
});

module.exports = router;