/**
 * src/agent/nodes/riskProfiler.js — GATE 2: Risk Assessment
 *
 * Reads the invoice agingBucket and customer's broken promise history.
 * Computes policyLimits that the Negotiator must respect:
 *   - maxSnoozeDays: how many days can be snoozed without owner approval
 *   - maxWaiverPct: max fee waiver % before HITL escalation
 *   - riskTier: LOW | MED | HIGH
 *
 * RISK TIERS:
 *   LOW  (current/0-30 days): 7d snooze, 5% waiver
 *   MED  (31-60 days):         3d snooze, 10% waiver (needs approval)
 *   HIGH (61+ days):           0d snooze, 0% waiver (all need approval)
 */
const { Dues } = require('../../models/db');

async function riskProfilerNode(state) {
  const { due, customer, userId } = state;
  if (!due) return { policyLimits: { maxSnoozeDays: 7, maxWaiverPct: 5, riskTier: 'LOW' } };

  const aging = due.agingBucket || 'current';

  // Count broken promises: dues marked PTP but still unpaid
  let brokenPromises = 0;
  if (customer && customer._id) {
    brokenPromises = await Dues.countDocuments({
      userId, customerId: customer._id,
      status: { $in: ['UNPAID', 'OVERDUE'] },
      'metadata.promiseToPay': true,
    });
  }

  let policy;
  if (aging === 'current' || aging === '0-30') {
    policy = { maxSnoozeDays: 7, maxWaiverPct: 5, riskTier: 'LOW' };
  } else if (aging === '31-60') {
    policy = { maxSnoozeDays: 3, maxWaiverPct: 10, riskTier: 'MED' };
  } else {
    policy = { maxSnoozeDays: 0, maxWaiverPct: 0, riskTier: 'HIGH' };
  }

  // Downgrade tier if customer has 2+ broken promises
  if (brokenPromises >= 2) {
    if (policy.riskTier === 'LOW') policy = { maxSnoozeDays: 3, maxWaiverPct: 5, riskTier: 'MED' };
    else if (policy.riskTier === 'MED') policy = { maxSnoozeDays: 0, maxWaiverPct: 0, riskTier: 'HIGH' };
  }

  console.log('[RiskProfiler] aging=' + aging + ' broken=' + brokenPromises + ' tier=' + policy.riskTier);
  return { policyLimits: policy };
}

module.exports = { riskProfilerNode };
