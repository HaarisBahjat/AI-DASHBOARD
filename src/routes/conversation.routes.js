const express = require('express');
const router = express.Router();
const multer = require('multer');
const conversationController = require('../controller/conversation.controller');
const auth = require('../midddlewares/auth');
const upload = require('../midddlewares/upload');

router.post('/', auth, conversationController.createConversation);
router.get('/', auth, conversationController.listConversations);
router.get('/:conversationId', auth, conversationController.getConversation);
router.get('/:conversationId/messages', auth, conversationController.getConversationMessages);
router.get('/:conversationId/message', auth, conversationController.getConversationMessages);
router.post('/:conversationId/message', auth, conversationController.addMessage);
router.post('/:conversationId/messages', auth, conversationController.addMessage);
router.delete('/:conversationId', auth, conversationController.deleteConversation);
router.post('/:conversationId/complete', auth, conversationController.completeConversation);
// Handle multer error
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: "File too large. Maximum size is 10MB" });
    }
    return res.status(400).json({ error: "File upload error", details: err.message });
  }
  if (err) {
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
  next();
};

router.post(
  "/:conversationId/voice",
  auth,
  upload.single("audio"),
  handleMulterError,
  conversationController.addVoiceMessage
);
module.exports = router;