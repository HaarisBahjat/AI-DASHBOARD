const express = require('express');
const router = express.Router();
const auth = require('../midddlewares/auth');   // correct path: auth.js
const agentController = require('../controller/agent.controller');

router.use(auth);   // apply JWT auth to all agent routes

router.post('/interact',                      agentController.interactHandler);
router.get('/pending-approvals',              agentController.listPendingApprovalsHandler);
router.post('/approvals/:threadId/resolve',   agentController.resolveApprovalHandler);

module.exports = router;

