/**
 * src/routes/agent.routes.js
 * All routes require JWT authentication.
 */
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../midddlewares/auth.middleware');
const agentController = require('../controller/agent.controller');

router.use(verifyToken);
router.post('/interact',                           agentController.interactHandler);
router.get('/pending-approvals',                   agentController.listPendingApprovalsHandler);
router.post('/approvals/:threadId/resolve',        agentController.resolveApprovalHandler);

module.exports = router;
