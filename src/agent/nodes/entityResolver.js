/**
 * src/agent/nodes/entityResolver.js — GATE 1: Parse & Resolve
 *
 * 1. Calls Gemini (detectIntent) to parse user text into structured JSON
 * 2. Auto-looks-up or auto-creates Customer contact in MongoDB
 * 3. For create_due: validates fields and creates the Dues invoice
 * 4. Returns partial state updates — LangGraph merges them in
 *
 * WHY SEPARATE: Deterministic DB lookups stay here.
 * Negotiator gets clean, resolved entities to work with.
 */
const llmService = require('../../Service/llm.service');
const { Customer, Dues } = require('../../models/db');

async function entityResolverNode(state) {
  const { userId, userText } = state;

  // STEP 1: Parse user message into structured intent JSON via Gemini
  let intentData;
  try {
    intentData = await llmService.detectIntent(userText);
  } catch (err) {
    console.error('[EntityResolver] detectIntent failed:', err.message);
    return { intentData: { intent: 'general_chat' }, replyText: 'I did not quite understand that. Could you rephrase?', nextStep: 'dispatch' };
  }
  const intent = (intentData.intent || 'general_chat').toLowerCase().trim();
  intentData.intent = intent;
  console.log('[EntityResolver] intent=' + intent + ' customer=' + (intentData.customerName || 'none'));

  // STEP 2: Resolve or auto-create Customer contact
  // Using $regex for case-insensitive name match in MongoDB
  let customer = null;
  if (intentData.customerName && intentData.customerName.trim()) {
    const name = intentData.customerName.trim();
    customer = await Customer.findOne({ userId, name: { $regex: name, $options: 'i' } }).lean();
    if (!customer) {
      const doc = await Customer.create({ userId, name, status: 'Active', followUpEnabled: true });
      customer = doc.toObject();
      console.log('[EntityResolver] Auto-created customer:', name);
    }
  }

  // STEP 3: For create_due — validate and create invoice
  if (intent === 'create_due') {
    const missing = [];
    if (!intentData.title)   missing.push('title');
    if (!intentData.amount)  missing.push('amount');
    if (!intentData.dueDate) missing.push('due date');
    if (missing.length > 0) {
      return { intentData, customer, replyText: 'To create this due I still need: ' + missing.join(', ') + '.', nextStep: 'dispatch' };
    }
    const parsedDate = new Date(intentData.dueDate);
    if (isNaN(parsedDate.getTime())) {
      return { intentData, customer, replyText: 'The due date does not look valid. Try saying next Monday or 2026-08-18.', nextStep: 'dispatch' };
    }
    const doc = await Dues.create({
      userId,
      customerId: customer ? customer._id : null,
      title: intentData.title,
      amount: Number(intentData.amount),
      dueDate: parsedDate,
      category: intentData.category || 'general',
    });
    const due = doc.toObject();
    const label = customer ? ' for customer ' + customer.name : '';
    return {
      intentData, customer, due,
      negotiationOutcome: 'DUE_CREATED',
      replyText: 'Created "' + due.title + '" of Rs.' + due.amount + label + ' due on ' + parsedDate.toDateString() + '.',
      nextStep: 'dispatch',
    };
  }

  // STEP 4: For confirm_paid — identify which due is being paid for
  if (intent === 'confirm_paid') {
    let targetDue = state.due || null;
    let targetCustomer = customer;
    
    // Strategy 1: If customer name is mentioned, find their dues
    if (!targetDue && intentData.customerName && intentData.customerName.trim()) {
      const custName = intentData.customerName.trim();
      const cust = await Customer.findOne({ userId, name: { $regex: custName, $options: 'i' } }).lean();
      
      if (cust) {
        // Customer exists — find their unpaid dues
        const custDues = await Dues.find({ 
          userId, 
          customerId: cust._id,
          status: { $in: ['UNPAID', 'OVERDUE', 'PTP'] } 
        }).lean();
        
        if (custDues.length === 1) {
          targetDue = custDues[0];
          targetCustomer = cust;
          console.log('[EntityResolver] Found due for customer:', custName, targetDue.title);
        } else if (custDues.length > 1) {
          const duesList = custDues.map((d, i) => (i + 1) + '. ' + d.title + ' Rs.' + d.amount).join('; ');
          return { intentData, replyText: 'Found ' + custDues.length + ' unpaid bills for ' + custName + ': ' + duesList + '. Which one did you pay for?', nextStep: 'dispatch' };
        } else {
          return { intentData, replyText: 'Customer ' + custName + ' has no unpaid invoices. Please create a new one first.', nextStep: 'dispatch' };
        }
      } else {
        return { intentData, replyText: 'Customer \"' + custName + '\" not found. Create an invoice first.', nextStep: 'dispatch' };
      }
    }
    
    // Strategy 2: Use due from conversation state
    if (!targetDue && state.due) {
      targetDue = state.due;
    }
    
    // Strategy 3: Find most recent unpaid due
    if (!targetDue) {
      const unpaidDues = await Dues.find({ userId, status: { $in: ['UNPAID', 'OVERDUE'] } })
        .sort({ dueDate: -1 })
        .limit(3)
        .lean();
      
      if (unpaidDues.length === 0) {
        return { intentData, replyText: 'No unpaid dues found. Create an invoice first.', nextStep: 'dispatch' };
      } else if (unpaidDues.length === 1) {
        targetDue = unpaidDues[0];
        console.log('[EntityResolver] Auto-resolved due:', targetDue.title);
      } else {
        const duesList = unpaidDues.map((d, i) => (i + 1) + '. ' + d.title + ' Rs.' + d.amount).join('; ');
        return { intentData, replyText: 'Found ' + unpaidDues.length + ' unpaid dues. Which one? ' + duesList, nextStep: 'dispatch' };
      }
    }
    
    return { intentData, customer: targetCustomer, due: targetDue };
  }

  // STEP 5: All other intents — pass entities to riskProfiler then negotiator\n  return { intentData, customer };
}

module.exports = { entityResolverNode };
