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

    // Fetch all active dues for this user (unpaid, overdue, ptp, verifying)
    const activeDues = await Dues.find({
      userId,
      status: { $in: ['UNPAID', 'OVERDUE', 'PTP', 'VERIFYING'] },
    }).lean();

    const result = customers.map((c) => {
      const safeName = c.name ? c.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') : '';
      const nameRegex = safeName ? new RegExp(safeName, 'i') : null;

      const custDues = activeDues.filter((d) => {
        if (d.customerId && String(d.customerId) === String(c._id)) return true;
        if (!d.customerId && nameRegex && nameRegex.test(d.title || '')) return true;
        return false;
      });

      const totalDue = custDues.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
      const invoiceCount = custDues.length;
      const dueDates = custDues.map((d) => d.dueDate);

      // Worst aging: pick the most overdue invoice
      const worstBucket = dueDates.reduce((worst, date) => {
        const bucket = computeAgingBucket(date);
        const order = { 'current': 0, '0-30': 1, '31-60': 2, '61-90': 3, '90+': 4 };
        return (order[bucket] > order[worst]) ? bucket : worst;
      }, 'current');

      return {
        ...c,
        totalDue,
        invoiceCount,
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
        const currentOutstanding = Number(due.amount) || 0;
        const totalPaidOnDue = Number(due.metadata?.totalPaid || 0);
        const originalAmount = Number(due.metadata?.originalAmount || (due.status === 'PAID' ? totalPaidOnDue : currentOutstanding + totalPaidOnDue));

        if (due.status === 'PAID') {
          acc.paidAmount += (totalPaidOnDue > 0 ? totalPaidOnDue : (originalAmount || currentOutstanding));
          acc.paidCount += 1;
        } else {
          acc.totalDue += currentOutstanding;
          acc.paidAmount += totalPaidOnDue;
          acc.pendingCount += 1;
        }
        return acc;
      },
      { totalDue: 0, paidAmount: 0, pendingCount: 0, paidCount: 0 }
    );

    summary.totalDue = Math.round(summary.totalDue * 100) / 100;
    summary.paidAmount = Math.round(summary.paidAmount * 100) / 100;

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
 * Trigger an actual AI follow-up (Voice Call or WhatsApp) for a single customer.
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

    // Fetch outstanding dues for this customer
    const dues = await Dues.find({
      customerId: customer._id,
      userId: req.user._id,
      status: { $in: ['UNPAID', 'OVERDUE', 'PTP'] },
    }).lean();

    if (dues.length === 0) {
      return res.status(400).json({ message: `${customer.name} has no outstanding dues` });
    }

    // Determine target phone number — use customer.contactNo or fallback to user phone
    const targetPhone = customer.contactNo || req.user.phone;
    if (!targetPhone) {
      return res.status(400).json({ message: `No phone number on file for ${customer.name}. Please edit customer details to add phone number.` });
    }

    const twilioService = require('../Service/twilio.service');

    let dispatchResult = null;
    if (channel === 'voiceCall') {
      if (dues.length === 1) {
        dispatchResult = await twilioService.makeVoiceCall(targetPhone, {
          dueId: String(dues[0]._id),
          userId: String(req.user._id),
          title: dues[0].title,
          amount: dues[0].amount,
          dueDate: new Date(dues[0].dueDate).toDateString(),
        });
      } else {
        dispatchResult = await twilioService.makeGroupVoiceCall(targetPhone, req.user._id, dues);
      }
    } else if (channel === 'whatsapp') {
      const dueSummary = dues.map(d => `• "${d.title}" — ₹${d.amount} (Due ${new Date(d.dueDate).toDateString()})`).join('\n');
      const text = `🚨 *Payment Follow-Up for ${customer.name}*\n\nYou have ${dues.length} outstanding due(s):\n${dueSummary}\n\nPlease settle to avoid penalties. Reply PAID or SNOOZE <days>.`;
      dispatchResult = await twilioService.sendWhatsApp(targetPhone, text);
    }

    res.status(200).json({
      message: `Voice call dispatched to ${customer.name} (${targetPhone})`,
      customerId: customer._id,
      channel,
      callSid: dispatchResult?.sid || null,
      duesCount: dues.length,
    });
  } catch (error) {
    console.error('triggerFollowup error:', error.message);
    res.status(500).json({ message: `Failed to dispatch call: ${error.message}` });
  }
};

// ── POST /api/customers/trigger-followup-all ─────────────────────────────────
/**
 * Bulk: trigger actual AI voice calls for all active customers with outstanding dues.
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

    const customerIds = eligibleCustomers.map((c) => c._id);
    const outstandingDues = await Dues.find({
      userId: new mongoose.Types.ObjectId(userId),
      customerId: { $in: customerIds },
      status: { $in: ['UNPAID', 'OVERDUE', 'PTP'] },
    }).lean();

    // Group dues by customerId
    const duesByCustomer = {};
    for (const due of outstandingDues) {
      const cid = String(due.customerId);
      if (!duesByCustomer[cid]) duesByCustomer[cid] = [];
      duesByCustomer[cid].push(due);
    }

    const twilioService = require('../Service/twilio.service');
    let dispatchedCount = 0;
    const errors = [];

    for (const customer of eligibleCustomers) {
      const dues = duesByCustomer[String(customer._id)] || [];
      if (dues.length === 0) continue;

      const targetPhone = customer.contactNo || req.user.phone;
      if (!targetPhone) continue;

      try {
        if (channel === 'voiceCall') {
          if (dues.length === 1) {
            await twilioService.makeVoiceCall(targetPhone, {
              dueId: String(dues[0]._id),
              userId: String(userId),
              title: dues[0].title,
              amount: dues[0].amount,
              dueDate: new Date(dues[0].dueDate).toDateString(),
            });
          } else {
            await twilioService.makeGroupVoiceCall(targetPhone, userId, dues);
          }
        }
        dispatchedCount++;
      } catch (callErr) {
        errors.push(`${customer.name}: ${callErr.message}`);
      }
    }

    res.status(200).json({
      message: `Bulk follow-up voice calls dispatched to ${dispatchedCount} customer(s)`,
      count: dispatchedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('triggerFollowupAll error:', error.message);
    res.status(500).json({ message: `Bulk follow-up failed: ${error.message}` });
  }
};
