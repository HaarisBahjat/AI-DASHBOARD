const { Customer, Dues } = require('../models/db');
const mongoose = require('mongoose');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Validate that a string is a well-formed MongoDB ObjectId.
 * Returns false for non-24-hex strings to prevent CastError 500s.
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
}

/**
 * Compute the ageing bucket for a due based on its dueDate.
 * @param {Date} dueDate
 * @returns {'current'|'0-30'|'31-60'|'61-90'|'90+'}
 */
function computeAgingBucket(dueDate) {
  if (!dueDate) return 'current';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today - due) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'current';
  if (diffDays <= 30) return '0-30';
  if (diffDays <= 60) return '31-60';
  if (diffDays <= 90) return '61-90';
  return '90+';
}

// ── GET /api/customers ───────────────────────────────────────────────────────
/**
 * Returns all customers belonging to the logged-in user.
 * Enriched with totalDue (sum of unpaid/overdue invoices) and worst ageing bucket.
 */
exports.getCustomers = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch all customers for this user
    const customers = await Customer.find({ userId }).lean();

    // Aggregate unpaid dues grouped by customerId
    const dueAgg = await Dues.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          status: { $in: ['UNPAID', 'OVERDUE', 'PTP', 'VERIFYING'] },
        },
      },
      {
        $group: {
          _id: '$customerId',
          totalDue: { $sum: '$amount' },
          invoiceCount: { $sum: 1 },
          dueDates: { $push: '$dueDate' },
          statuses: { $push: '$status' },
        },
      },
    ]);

    const dueMap = new Map(dueAgg.map((d) => [String(d._id), d]));

    const result = customers.map((c) => {
      const agg = dueMap.get(String(c._id)) || { totalDue: 0, invoiceCount: 0, dueDates: [] };

      // Worst aging: pick the most overdue invoice
      const worstBucket = (agg.dueDates || []).reduce((worst, date) => {
        const bucket = computeAgingBucket(date);
        const order = { 'current': 0, '0-30': 1, '31-60': 2, '61-90': 3, '90+': 4 };
        return (order[bucket] > order[worst]) ? bucket : worst;
      }, 'current');

      return {
        ...c,
        totalDue: agg.totalDue,
        invoiceCount: agg.invoiceCount,
        agingBucket: worstBucket,
      };
    });

    res.status(200).json({ customers: result });
  } catch (error) {
    console.error('getCustomers error:', error.message);
    res.status(500).json({ message: 'Error fetching customers', error: error.message });
  }
};

// ── POST /api/customers ──────────────────────────────────────────────────────
/**
 * Create a new customer contact linked to the logged-in user.
 */
exports.createCustomer = async (req, res) => {
  try {
    const { name, contactNo, email, place, notes } = req.body;

    // ─ Required field checks ────────────────────────────────────
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Customer name is required' });
    }

    // [SECURITY] Field length limits — prevent storage abuse and XSS payloads
    if (name.trim().length > 120) {
      return res.status(400).json({ message: 'Customer name must be 120 characters or less' });
    }
    if (contactNo && contactNo.trim().length > 20) {
      return res.status(400).json({ message: 'Contact number must be 20 characters or less' });
    }
    if (email && email.trim().length > 254) {
      return res.status(400).json({ message: 'Email must be 254 characters or less' });
    }
    if (place && place.trim().length > 100) {
      return res.status(400).json({ message: 'Place must be 100 characters or less' });
    }
    if (notes && notes.trim().length > 500) {
      return res.status(400).json({ message: 'Notes must be 500 characters or less' });
    }

    // [SECURITY] Per-user customer cap — prevent DB bloat and expensive aggregation queries
    const MAX_CUSTOMERS = parseInt(process.env.MAX_CUSTOMERS_PER_USER || '500', 10);
    const existingCount = await Customer.countDocuments({ userId: req.user._id });
    if (existingCount >= MAX_CUSTOMERS) {
      return res.status(400).json({
        message: `Customer limit (${MAX_CUSTOMERS}) reached. Contact support to increase.`
      });
    }

    const customer = await Customer.create({
      userId: req.user._id,
      name: name.trim(),
      contactNo: contactNo?.trim() || null,
      email: email?.trim()?.toLowerCase() || null,
      place: place?.trim() || null,
      notes: notes?.trim() || null,
    });

    res.status(201).json({ message: 'Customer created successfully', customer });
  } catch (error) {
    console.error('createCustomer error:', error.message);
    res.status(500).json({ message: 'Error creating customer' });
  }
};

// ── GET /api/customers/:id ───────────────────────────────────────────────────
/**
 * Get a single customer's profile (no dues — use /activity for dues).
 */
exports.getCustomer = async (req, res) => {
  try {
    // [SECURITY] Validate ObjectId format before querying — prevents CastError 500s
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid customer ID format' });
    }

    const customer = await Customer.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).lean();

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.status(200).json({ customer });
  } catch (error) {
    console.error('getCustomer error:', error.message);
    res.status(500).json({ message: 'Error fetching customer' });
  }
};

// ── PUT /api/customers/:id ───────────────────────────────────────────────────
/**
 * Update a customer's contact details or follow-up toggle.
 */
exports.updateCustomer = async (req, res) => {
  try {
    // [SECURITY] Validate ObjectId format
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid customer ID format' });
    }

    const { name, contactNo, email, place, notes, status, followUpEnabled } = req.body;

    // [SECURITY] Field length limits on update too
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 120)) {
      return res.status(400).json({ message: 'Customer name must be between 1 and 120 characters' });
    }
    if (contactNo !== undefined && contactNo && contactNo.trim().length > 20) {
      return res.status(400).json({ message: 'Contact number must be 20 characters or less' });
    }
    if (email !== undefined && email && email.trim().length > 254) {
      return res.status(400).json({ message: 'Email must be 254 characters or less' });
    }
    if (place !== undefined && place && place.trim().length > 100) {
      return res.status(400).json({ message: 'Place must be 100 characters or less' });
    }
    if (notes !== undefined && notes && notes.trim().length > 500) {
      return res.status(400).json({ message: 'Notes must be 500 characters or less' });
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        ...(name !== undefined && { name: name.trim() }),
        ...(contactNo !== undefined && { contactNo: contactNo?.trim() || null }),
        ...(email !== undefined && { email: email?.trim()?.toLowerCase() || null }),
        ...(place !== undefined && { place: place?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(status !== undefined && { status }),
        ...(followUpEnabled !== undefined && { followUpEnabled }),
      },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.status(200).json({ message: 'Customer updated', customer });
  } catch (error) {
    console.error('updateCustomer error:', error.message);
    res.status(500).json({ message: 'Error updating customer' });
  }
};

// ── DELETE /api/customers/:id ────────────────────────────────────────────────
/**
 * Delete a customer. Does NOT delete their invoices (preserves financial records).
 */
exports.deleteCustomer = async (req, res) => {
  try {
    // [SECURITY] Validate ObjectId format
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid customer ID format' });
    }

    const customer = await Customer.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.status(200).json({ message: 'Customer deleted' });
  } catch (error) {
    console.error('deleteCustomer error:', error.message);
    res.status(500).json({ message: 'Error deleting customer' });
  }
};

// ── GET /api/customers/:id/activity ─────────────────────────────────────────
/**
 * Returns the customer profile + all invoices (all statuses) + ageing info.
 * Used for the Customer Activity Drawer in the frontend.
 */
exports.getCustomerActivity = async (req, res) => {
  try {
    // [SECURITY] Validate ObjectId format
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid customer ID format' });
    }

    const customer = await Customer.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).lean();

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Get ALL invoices for this customer (all statuses)
    const dues = await Dues.find({
      customerId: req.params.id,
      userId: req.user._id,
    })
      .sort({ dueDate: 1 })
      .lean();

    // Enrich each due with live ageing bucket
    const enrichedDues = dues.map((due) => ({
      ...due,
      agingBucket: computeAgingBucket(due.dueDate),
    }));

    // Summary
    const summary = enrichedDues.reduce(
      (acc, due) => {
        const amount = Number(due.amount) || 0;
        if (due.status === 'PAID') {
          acc.paidAmount += amount;
          acc.paidCount += 1;
        } else {
          acc.totalDue += amount;
          acc.pendingCount += 1;
        }
        return acc;
      },
      { totalDue: 0, paidAmount: 0, pendingCount: 0, paidCount: 0 }
    );

    res.status(200).json({
      customer,
      dues: enrichedDues,
      summary,
    });
  } catch (error) {
    console.error('getCustomerActivity error:', error.message);
    res.status(500).json({ message: 'Error fetching customer activity' });
  }
};

// ── POST /api/customers/:id/trigger-followup ─────────────────────────────────
/**
 * Manually trigger an AI follow-up for a single customer.
 * For Phase 1 this stubs a response; Phase 3 will invoke the Twilio/WhatsApp dispatcher.
 */
exports.triggerFollowup = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).lean();

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (!customer.followUpEnabled) {
      return res.status(400).json({ message: 'Follow-up is disabled for this customer' });
    }

    const { channel = 'voiceCall' } = req.body;

    // ── Phase 3 will call the Twilio/WhatsApp dispatcher here ──
    // For now return a stub acknowledging the trigger.
    res.status(200).json({
      message: `Follow-up triggered for ${customer.name} via ${channel}`,
      customerId: customer._id,
      channel,
      note: 'Multi-channel dispatcher will be wired in Phase 3',
    });
  } catch (error) {
    console.error('triggerFollowup error:', error.message);
    res.status(500).json({ message: 'Error triggering follow-up', error: error.message });
  }
};

// ── POST /api/customers/trigger-followup-all ─────────────────────────────────
/**
 * Bulk: trigger AI follow-up for all active customers with outstanding dues.
 * Phase 3 will wire the actual channel dispatcher.
 */
exports.triggerFollowupAll = async (req, res) => {
  try {
    const userId = req.user._id;
    const { channel = 'voiceCall' } = req.body;

    const eligibleCustomers = await Customer.find({
      userId,
      status: 'Active',
      followUpEnabled: true,
    }).lean();

    // Find customers who have at least one unpaid due
    const customerIds = eligibleCustomers.map((c) => c._id);
    const duesWithOwing = await Dues.distinct('customerId', {
      userId: new mongoose.Types.ObjectId(userId),
      customerId: { $in: customerIds },
      status: { $in: ['UNPAID', 'OVERDUE', 'PTP'] },
    });

    const owingSet = new Set(duesWithOwing.map(String));
    const toFollowUp = eligibleCustomers.filter((c) => owingSet.has(String(c._id)));

    // ── Phase 3 will dispatch actual calls/messages here ──
    res.status(200).json({
      message: `Bulk follow-up triggered for ${toFollowUp.length} customer(s) via ${channel}`,
      count: toFollowUp.length,
      customers: toFollowUp.map((c) => ({ id: c._id, name: c.name })),
      note: 'Multi-channel dispatcher will be wired in Phase 3',
    });
  } catch (error) {
    console.error('triggerFollowupAll error:', error.message);
    res.status(500).json({ message: 'Error triggering bulk follow-up', error: error.message });
  }
};
