const sttService = require("./stt.service");
const llmService = require("./llm.service");
const { textToSpeech } = require("./tts.service");
const mongoose = require("mongoose");

const { ConversationSession, Conversation, Dues: Due, Customer, User } = require('../models/db');
const twilioService = require('./twilio.service');

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

exports.processVoiceMessage = async ({conversationId, audioBuffer, userId, fallbackText = ''}) => {
    try {
        // Validate conversationId if provided
        if (conversationId && !isValidObjectId(conversationId)) {
            throw new Error("Invalid conversation ID format");
        }

        // LOAD CONVERSATION FIRST
        const session = await ConversationSession.findById(conversationId);
        let currentSession = session;
        let sessionExists = true;
        if (!session) {
            currentSession = await ConversationSession.create({
                userId: userId,
                status: "IN_PROGRESS",
                clarificationState: "NONE",
                pendingIntent: null,
                pendingData: null
            });
            conversationId = currentSession._id.toString();
            sessionExists = false;
        }
        if (sessionExists && currentSession.userId.toString() !== userId.toString()) {
            throw new Error("Access denied");
        }
        if (currentSession.status === "COMPLETED") {
            throw new Error("Conversation session is already completed");
        }

        // Step 1: Convert audio to text (try Whisper STT first, fallback to browser SpeechRecognition transcript)
        let text = '';
        try {
            if (audioBuffer && audioBuffer.length > 0) {
                text = await sttService.speechToText(audioBuffer);
            }
        } catch (sttErr) {
            console.warn(`[STT] Whisper STT error (${sttErr.message}), checking browser fallback...`);
        }

        if (!text || text.trim() === "") {
            if (fallbackText && fallbackText.trim() !== "") {
                console.log(`[STT] Using browser SpeechRecognition fallback: "${fallbackText}"`);
                text = fallbackText.trim();
            }
        }

        if (!text || text.trim() === "") {
            console.log("[STT] No speech detected by Whisper or browser.");
            return finalizeReply(currentSession, "I didn't quite catch that. Could you please repeat what you said or speak a bit louder?");
        }

        // save user message to db
        const userMessage = await Conversation.create({
            conversationId,
            roles: "USER",
            message: text
        });
        currentSession.status = "IN_PROGRESS";
        await currentSession.save();

    let replytext="";

    //MULTI TURN LOGIC
    
    if(sessionExists && currentSession.clarificationState==="AWAITING"){
      const newData=await llmService.detectIntent(text);
      const mergedData={...currentSession.pendingData,...newData};

    
    const missing=[];
    if(!mergedData.title){
        missing.push("title");
    }
    if(!mergedData.amount){
        missing.push("amount");
    }
    if(!mergedData.dueDate){
        missing.push("dueDate");
    }
    if(missing.length>0){
        
        currentSession.pendingData=mergedData;
        await currentSession.save();
        replytext = `Please provide ${missing.join(" and ")}.`;
      return finalizeReply(currentSession, replytext);
    }
    const parsedData= new Date(mergedData.dueDate);
    if(isNaN(parsedData.getTime())){
      currentSession.pendingData=mergedData;
      await currentSession.save();
      replytext = `The due date you provided is not valid. Please provide a valid due date.`;
    return finalizeReply(currentSession, replytext);
    }
    
    // Check if a customer name was specified and match customerId
    let linkedCustomerId = null;
    if (mergedData.customerName) {
      const matchCust = await Customer.findOne({ userId, name: new RegExp(mergedData.customerName.trim(), 'i') });
      if (matchCust) linkedCustomerId = matchCust._id;
    }

    const newDue= await Due.create({
        userId,
        customerId: linkedCustomerId,
        title:mergedData.title, 
        amount:mergedData.amount,
        dueDate:parsedData,
        category:mergedData.category || "general"
    });
    currentSession.clarificationState="NONE";
    currentSession.pendingIntent=null;
    currentSession.pendingData=null;
    
    await currentSession.save();
    replytext=`Your due "${newDue.title}" of amount ₹${newDue.amount} has been added successfully with due date ${newDue.dueDate.toDateString()}.`;
    return finalizeReply(currentSession, replytext);
  }
    //INTENT DETECTION LOGIC
    const intentData= await llmService.detectIntent(text);
    if(!intentData || !intentData.intent){
      replytext="Sorry, I couldn't understand your request. Could you please rephrase?";
      return finalizeReply(currentSession, replytext);
    }
    
    // Normalize intent to lowercase for consistent comparison
    const normalizedIntent = intentData.intent.toLowerCase().trim();

    // ── GET CUSTOMER INFO INTENT LOGIC ──────────────────────────────────────
    if (normalizedIntent === "get_customer_info") {
      const qName = intentData.customerName || text;
      const customer = await Customer.findOne({
        userId,
        name: { $regex: qName.replace(/^(who is|tell me about|show customer|info for)\s+/i, '').trim(), $options: 'i' }
      });

      if (!customer) {
        replytext = `I couldn't find a customer record matching "${qName}". Try checking the Contacts tab or spelling their name fully.`;
        return finalizeReply(currentSession, replytext);
      }

      const dues = await Due.find({ userId, customerId: customer._id, status: { $in: ['UNPAID', 'OVERDUE', 'PTP'] } });
      const totalDue = dues.reduce((sum, d) => sum + d.amount, 0);

      replytext = `👤 **${customer.name}**\n` +
        `• Phone: ${customer.contactNo || 'Not provided'}\n` +
        `• Location: ${customer.place || 'Not provided'}\n` +
        `• Status: ${customer.status}\n` +
        `• Outstanding Dues: ₹${totalDue} (${dues.length} pending invoice(s))`;
      return finalizeReply(currentSession, replytext);
    }

    // ── LIST CUSTOMERS INTENT LOGIC ─────────────────────────────────────────
    if (normalizedIntent === "list_customers") {
      const customers = await Customer.find({ userId }).lean();
      if (customers.length === 0) {
        replytext = "You don't have any customers saved yet. Go to the Contacts tab to add your first customer.";
        return finalizeReply(currentSession, replytext);
      }

      const listStr = customers.map((c, i) => `${i + 1}. **${c.name}** (${c.place || 'No location'}, ${c.contactNo || 'No phone'})`).join('\n');
      replytext = `You have ${customers.length} saved customer(s):\n\n${listStr}\n\nYou can ask me for details on any customer or say "Call [Customer Name]".`;
      return finalizeReply(currentSession, replytext);
    }

    // ── CALL CUSTOMER INTENT LOGIC ──────────────────────────────────────────
    if (normalizedIntent === "call_customer") {
      const qName = intentData.customerName || text;
      const customer = await Customer.findOne({
        userId,
        name: { $regex: qName.replace(/^(call|trigger follow up for|phone|ring)\s+/i, '').trim(), $options: 'i' }
      });

      if (!customer) {
        replytext = `I couldn't find a customer named "${qName}" to call. Please check the name under Contacts.`;
        return finalizeReply(currentSession, replytext);
      }

      const dues = await Due.find({ userId, customerId: customer._id, status: { $in: ['UNPAID', 'OVERDUE', 'PTP'] } }).lean();
      if (dues.length === 0) {
        replytext = `${customer.name} currently has no outstanding dues to call about.`;
        return finalizeReply(currentSession, replytext);
      }

      const userObj = await User.findById(userId).select('phone').lean();
      const targetPhone = customer.contactNo || userObj?.phone;
      if (!targetPhone) {
        replytext = `Cannot place call: No phone number is saved for ${customer.name}. Please edit their contact details under Contacts first.`;
        return finalizeReply(currentSession, replytext);
      }

      try {
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
        replytext = `🚀 Dispatched AI Voice Call to **${customer.name}** at ${targetPhone} for ${dues.length} outstanding invoice(s).`;
      } catch (callErr) {
        replytext = `Failed to place call to ${customer.name}: ${callErr.message}`;
      }

      return finalizeReply(currentSession, replytext);
    }
    
    //CREATE DUE INTENT LOGIC
    if(normalizedIntent === "create_due"){
      const missing=[];
      if(!intentData.title){
        missing.push("title");
      }
      if(!intentData.amount){
        missing.push("amount");
      }
      if(!intentData.dueDate){
        missing.push("dueDate");
      }
      if(missing.length>0){
        currentSession.clarificationState="AWAITING";
        currentSession.pendingIntent="create_due";
        currentSession.pendingData=intentData;
        await currentSession.save();
        replytext = `To create a due, I need the following information: ${missing.join(", ")}. Please provide them.`;
        return finalizeReply(currentSession, replytext);
      }
      const parsedDate= new Date(intentData.dueDate);
      if(isNaN(parsedDate.getTime())){
        currentSession.clarificationState="AWAITING";
        currentSession.pendingIntent="create_due";
        currentSession.pendingData=intentData;
        await currentSession.save();
        replytext = `The due date you provided is not valid. Please provide a valid due date.`;
        return finalizeReply(currentSession, replytext);
      }

      let linkedCustomerId = null;
      if (intentData.customerName) {
        const matchCust = await Customer.findOne({ userId, name: new RegExp(intentData.customerName.trim(), 'i') });
        if (matchCust) linkedCustomerId = matchCust._id;
      }

      const newDue= await Due.create({
        userId,
        customerId: linkedCustomerId,
        title:intentData.title,
        amount:intentData.amount,
        dueDate:parsedDate,
        category:intentData.category || "general"
      });
      replytext=`Your due "${newDue.title}" of amount ₹${newDue.amount} has been added successfully with due date ${newDue.dueDate.toDateString()}.`;
      return finalizeReply(currentSession, replytext);
    }
    //UPDATE DUE INTENT LOGIC
    if(normalizedIntent ==="update_due"){
      if(!intentData.title){
        replytext="To update a due, please provide the title of the due.";
        return finalizeReply(currentSession, replytext);
      }
      const due= await Due.findOne({
        userId,
        title:intentData.title
      });
      if(!due){
        replytext="Due not found. Please provide a valid due title.";
        return finalizeReply(currentSession, replytext);
      }
      const updateFields={};
      if(intentData.title){
        updateFields.title=intentData.title;
      }
      if(intentData.amount){
        updateFields.amount=intentData.amount;
      }
      if (intentData.dueDate) {

      const parsedDate = new Date(intentData.dueDate);

      if (!isNaN(parsedDate.getTime())) {
        updateFields.dueDate = parsedDate;
      }
    }

    if (Object.keys(updateFields).length === 0) {
      replytext = "No fields provided to update.";
      return finalizeReply(currentSession, replytext);
    }

    const updatedDue = await Due.findByIdAndUpdate(
      due._id,
      updateFields,
      { new: true }
    );

    replytext = `Due updated successfully for ${updatedDue.title}.`;

    return finalizeReply(currentSession, replytext);
  }
    //DELETE DUE INTENT LOGIC
    if(normalizedIntent ==="delete_due"){
      const due= await Due.findOne({
        userId,
        title:intentData.title
      });
      if(!due){
        replytext="Due not found. Please provide a valid due title.";
        return finalizeReply(currentSession, replytext);
      }
      await Due.findByIdAndDelete(due._id);
      replytext=`Due "${due.title}" deleted successfully.`;
      return finalizeReply(currentSession, replytext);

    }
    // SUM DUES INTENT LOGIC
    if (normalizedIntent === "sum_dues") {
      const dues = await Due.find({ userId });
      if (dues.length === 0) {
        replytext = "You currently have no dues recorded, so your total outstanding balance is ₹0.";
        return finalizeReply(currentSession, replytext);
      }
      const total = dues.reduce((sum, due) => sum + (Number(due.amount) || 0), 0);
      replytext = `You have ${dues.length} dues with a total outstanding balance of ₹${total.toFixed(2)}. Would you like me to list your upcoming bills or suggest a payment priority?`;
      return finalizeReply(currentSession, replytext);
    }

    // TOP UPCOMING DUES INTENT LOGIC
    if (normalizedIntent === "top_upcoming") {
      const dues = await Due.find({ userId });
      if (dues.length === 0) {
        replytext = "You have no upcoming dues at the moment.";
        return finalizeReply(currentSession, replytext);
      }
      const k = intentData.topK && intentData.topK > 0 ? intentData.topK : 3;
      const sorted = dues.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      const topDues = sorted.slice(0, k);
      const listText = topDues.map((due, idx) => `${idx + 1}. ${due.title} for ₹${due.amount} due on ${new Date(due.dueDate).toLocaleDateString()}`).join(". ");
      replytext = `Here are your top ${topDues.length} upcoming dues: ${listText}.`;
      return finalizeReply(currentSession, replytext);
    }

    // LIST DUES INTENT LOGIC
    if (normalizedIntent === "list_dues") {
      let filter = { userId };
      let customerTitle = "";

      // Check if user specified a specific customer name
      if (intentData.customerName && intentData.customerName.trim()) {
        const custName = intentData.customerName.trim();
        const matchedCust = await Customer.findOne({ userId, name: new RegExp(custName, 'i') });
        if (matchedCust) {
          filter.customerId = matchedCust._id;
          customerTitle = ` for customer **${matchedCust.name}**`;
        } else {
          // Fallback: search title or notes
          filter.$or = [
            { title: new RegExp(custName, 'i') },
            { category: new RegExp(custName, 'i') }
          ];
          customerTitle = ` matching "${custName}"`;
        }
      }

      const dues = await Due.find(filter).sort({ dueDate: 1 });
      if (dues.length === 0) {
        replytext = `No dues found${customerTitle}.`;
        return finalizeReply(currentSession, replytext);
      }

      const total = dues.reduce((sum, due) => sum + (Number(due.amount) || 0), 0);
      const dueList = dues.slice(0, 5).map((due, idx) => `${idx + 1}. ${due.title}: ₹${due.amount} (Due ${new Date(due.dueDate).toLocaleDateString()}) [${due.status}]`).join("\n");
      
      replytext = `Found ${dues.length} due(s)${customerTitle} totaling ₹${total.toFixed(2)}:\n\n${dueList}`;
      return finalizeReply(currentSession, replytext);
    }

    // FINANCIAL ADVICE, GENERAL CHAT & SMART INSIGHTS
    if (normalizedIntent === "financial_advice" || normalizedIntent === "general_chat") {
      const dues = await Due.find({ userId });
      replytext = await llmService.generateFinancialInsight(text, dues);
      return finalizeReply(currentSession, replytext);
    }

    // DEFAULT FALLBACK -> Use LLM Financial Insight instead of generic error!
    const dues = await Due.find({ userId });
    replytext = await llmService.generateFinancialInsight(text, dues);
    return finalizeReply(currentSession, replytext);
    } catch (error) {
        console.error("Error processing voice message:", error);
        throw error;
    }
};

async function finalizeReply(session, replytext) {
    await Conversation.create({
        conversationId: session._id,
        roles: "SYSTEM",
        message: replytext
    });

    let audioBuffer = null;
    try {
      audioBuffer = await textToSpeech(replytext);
    } catch (ttsError) {
      // Graceful degradation: return text response even if voice synthesis is temporarily down.
      console.error("TTS unavailable in finalizeReply:", ttsError.message);
    }

    return { 
      message: replytext,
      audioBuffer: audioBuffer ? Array.from(audioBuffer) : null
    };
}


