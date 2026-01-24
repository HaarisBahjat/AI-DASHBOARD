// routes/reminder.routes.js
const express = require("express");
const router = express.Router();
const auth = require("../midddlewares/auth");
const { Reminder } = require("../models/db");

router.get("/my", auth, async (req, res) => {
  const reminders = await Reminder.find({ userId: req.user._id });
  res.json({ reminders });
});

module.exports = router;
