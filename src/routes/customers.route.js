const express = require('express');
const router = express.Router();
const auth = require('../midddlewares/auth');
const { followupLimiter } = require('../midddlewares/rateLimiter');
const ctrl = require('../controller/customers.controller');

// ── Customer CRUD ─────────────────────────────────────────────────────────────
// GET  /api/customers               → list all customers (with totalDue aggregation)
router.get('/', auth, ctrl.getCustomers);

// POST /api/customers               → create a new customer
router.post('/', auth, ctrl.createCustomer);

// GET  /api/customers/:id           → get single customer profile
router.get('/:id', auth, ctrl.getCustomer);

// PUT  /api/customers/:id           → update customer details / toggle follow-up
router.put('/:id', auth, ctrl.updateCustomer);

// DELETE /api/customers/:id         → delete a customer (invoices preserved)
router.delete('/:id', auth, ctrl.deleteCustomer);

// ── Customer Activity Drawer ──────────────────────────────────────────────────
// GET  /api/customers/:id/activity  → customer profile + all invoices + summary
router.get('/:id/activity', auth, ctrl.getCustomerActivity);

// ── Follow-up Triggers ────────────────────────────────────────────────────────
// POST /api/customers/trigger-followup-all        → bulk follow-up all eligible
// followupLimiter: max 3 triggers per hour per IP — prevents Twilio call flooding
router.post('/trigger-followup-all', auth, followupLimiter, ctrl.triggerFollowupAll);

// POST /api/customers/:id/trigger-followup        → single customer follow-up
router.post('/:id/trigger-followup', auth, followupLimiter, ctrl.triggerFollowup);

module.exports = router;
