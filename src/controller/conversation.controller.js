const conversationSession=require('../models/db').ConversationSession;
const conversationMessage=require('../models/db').Conversation;
const Due =require('../models/db').Dues;
const path=require('path');
const fs=require('fs');
const mongoose = require('mongoose');
const {processVoiceMessage}=require('../Service/voice.service');
const {textToSpeech}=require('../Service/tts.service');
const sttService = require('../Service/stt.service');
const llmService=require('../Service/llm.service');
const { audio } = require('@elevenlabs/elevenlabs-js/api/resources/dubbing');

const getLocalDateKey = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

// Helper function to validate conversationId and handle errors
const validateConversationId = (conversationId, res) => {
    if (!conversationId) {
        res.status(400).json({ error: "Conversation ID is required" });
        return false;
    }
    if (!isValidObjectId(conversationId)) {
        res.status(400).json({ error: "Invalid conversation ID format" });
        return false;
    }
    return true;
};

exports.listConversations = async (req, res) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ error: "User not authenticated" });
        }

        // Populate due details so frontend can build bill-based chat threads.
        const sessions = await conversationSession
            .find({ userId: req.user._id })
            .populate('dueId', 'title dueDate amount')
            .sort({ createdAt: -1 })
            .lean();

        const formatted = sessions.map((session) => ({
            conversationId: session._id,
            // Keep dueId as a stable thread key; title can be duplicated across bills.
            dueId: session?.dueId?._id || session.dueId,
            dueTitle: session?.dueId?.title || null,
            dueDate: session?.dueId?.dueDate || null,
            dueAmount: session?.dueId?.amount || null,
            status: session.status,
            channel: session.channel,
            sessionDate: session.sessionDate,
            parentConversationId: session.parentConversationId || null,
            createdAt: session.createdAt
        }));

        res.json(formatted);
    } catch (err) {
        console.error("Error listing conversations:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};

//CREATE A NEW CONVERSATION SESSION
exports.createConversation=async(req,res)=>{
    try{
        const {dueId, dueTitle, dueDate, channel = 'TEXT'} = req.body;
        
        // Check if user is authenticated
        if(!req.user || !req.user._id){
            return res.status(401).json({error:"User not authenticated"});
        }
        
        let targetDueId = dueId;

        if (!targetDueId && dueTitle) {
            const baseQuery = {
                userId: req.user._id,
                status: { $in: ['UNPAID', 'OVERDUE'] },
                title: { $regex: `^${escapeRegex(String(dueTitle).trim())}$`, $options: 'i' }
            };

            let titleMatches = await Due.find(baseQuery).sort({ dueDate: 1 });

            if (dueDate) {
                const parsedDueDate = new Date(dueDate);
                if (isNaN(parsedDueDate.getTime())) {
                    return res.status(400).json({ error: 'Invalid dueDate format for disambiguation' });
                }

                const dayStart = new Date(parsedDueDate);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(parsedDueDate);
                dayEnd.setHours(23, 59, 59, 999);

                titleMatches = titleMatches.filter((due) => {
                    const d = new Date(due.dueDate);
                    return d >= dayStart && d <= dayEnd;
                });
            }

            if (titleMatches.length === 1) {
                targetDueId = titleMatches[0]._id;
            } else if (titleMatches.length > 1) {
                return res.status(409).json({
                    error: 'Multiple dues found with same title. Provide dueDate to continue.',
                    requiresDueDate: true,
                    matches: titleMatches.map((due) => ({
                        dueId: due._id,
                        title: due.title,
                        amount: due.amount,
                        dueDate: due.dueDate
                    }))
                });
            } else {
                return res.status(404).json({ error: 'No due found for the provided dueTitle/dueDate' });
            }
        }

        if(!targetDueId){
            const fallbackDue = await Due.findOne({
                userId: req.user._id,
                status: { $in: ['UNPAID', 'OVERDUE'] }
            }).sort({ dueDate: 1 });

            if (!fallbackDue) {
                return res.status(400).json({error:"dueId is required (no unpaid dues available for fallback)"});
            }

            targetDueId = fallbackDue._id;
        }

        // Validate dueId format
        if (!isValidObjectId(targetDueId)) {
            return res.status(400).json({error:"Invalid dueId format"});
        }

        const due = await Due.findById(targetDueId);
        if(!due){
            return res.status(404).json({error:"Due not found"});
        }
        
        if(due.userId.toString() !== req.user._id.toString()){
            return res.status(403).json({error:"Access denied"});
        }

        // Reuse active same-day session for the same bill; create a fresh one after day rollover.
        const todayKey = getLocalDateKey();
        const existingTodaySession = await conversationSession
            .findOne({
                userId: req.user._id,
                dueId: targetDueId,
                sessionDate: todayKey,
                status: { $ne: 'COMPLETED' }
            })
            .sort({ updatedAt: -1 });

        if (existingTodaySession) {
            const existingSystemMsg = await conversationMessage
                .findOne({ conversationId: existingTodaySession._id, roles: 'SYSTEM' })
                .sort({ createdAt: 1 });

            return res.status(200).json({
                message: "Conversation session reused for today",
                conversationId: existingTodaySession._id,
                dueId: targetDueId,
                dueTitle: due.title,
                dueDate: due.dueDate,
                sessionDate: todayKey,
                reused: true,
                systemText: existingSystemMsg?.message || `Continuing today's conversation for ${due.title}.`,
                parentConversationId: existingTodaySession.parentConversationId || null,
                audioFile: null
            });
        }

        // Keep a reference chain to yesterday/older session for same bill context continuity.
        const previousSession = await conversationSession
            .findOne({
                userId: req.user._id,
                dueId: targetDueId,
                sessionDate: { $ne: todayKey }
            })
            .sort({ createdAt: -1 });
        
        const session = await conversationSession.create({
            userId: req.user._id,
            dueId: targetDueId,
            sessionDate: todayKey,
            parentConversationId: previousSession?._id || null,
            channel: channel,
            status: 'STARTED'
        });
        //Create initial system message
        const systemText= `Hi ! You have a due of amount ${due.amount} for ${due.title} please pay before serious consequences. Have you already paid it?`;
        await conversationMessage.create({
            conversationId: session._id,
            roles: "SYSTEM",
            message: systemText
        });
        //convert text -voice message if channel is VOICE
         let audioFile=null;
        if(channel==="VOICE"){
            try {
                console.log("Calling text-to-speech service...");
                const audiobuffer = await textToSpeech(systemText);
                console.log("TTS service returned buffer length:", audiobuffer ? audiobuffer.length : audiobuffer);
                const audiopath = path.join(__dirname, `../audio/${session._id}.mp3`);
                fs.writeFileSync(audiopath, audiobuffer);
                audioFile = `/audio/${session._id}.mp3`;
            } catch (ttsErr) {
                console.error("TTS failed for conversation:", session._id, ttsErr?.message || ttsErr);
                // Don't fail the whole API call if TTS fails; return conversation with audioFile=null
                audioFile = null;
            }
        }

        
        res.status(201).json({
      message: "Conversation session created",
      conversationId: session._id,
            dueId: targetDueId,
                        dueTitle: due.title,
                        dueDate: due.dueDate,
            sessionDate: todayKey,
            parentConversationId: previousSession?._id || null,
      systemText,
      audioFile: audioFile ? audioFile : null
    });
    }catch(err){
        console.error("Error creating conversation:",err.message);
        console.error("Stack:", err.stack);
        res.status(500).json({error:"Internal server error", details: err.message});
    }
};

//get all messages in a conversation session
exports.getConversation=async(req,res)=>{
    try{
        const {conversationId }=req.params;
        
        // Validate conversation ID format
        if (!validateConversationId(conversationId, res)) {
            return;
        }
        
        const session=await conversationSession.findById(conversationId);
        if(!session){
            return  res.status(404).json({message:"Conversation session not found"});
        }

        //ONLY OWNER CAN ACCESS
        if(session.userId.toString()!==req.user._id.toString()){
            return res.status(403).json({message:"Access denied"});
        }

        const messages=await conversationMessage.find({conversationId:conversationId}).sort({createdAt:1});
        res.json({session,messages});
    }catch(err){
        console.error("Error fetching conversation:",err);
        res.status(500).json({message:"Internal server error"});
    }
};

//USER SENDS A MESSAGE
exports.addMessage=async(req,res)=>{
    try{
        const {conversationId}=req.params;
        
        // Validate conversation ID format
        if (!validateConversationId(conversationId, res)) {
            return;
        }
        
        const message = req.body?.message || req.body?.text;
        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ error: "message is required" });
        }
        const session=await conversationSession.findById(conversationId);
        if(!session){
            return res.status(404).json({error:"Conversation session not found"});
        }
        if(session.status==="COMPLETED"){
            return res.status(400).json({error:"conversation already completed"});
        }
        if(session.userId.toString()!==req.user._id.toString()){
            return res.status(403).json({error:"Access denied"});
        }

        const msg= await conversationMessage.create({
            conversationId:conversationId,
            roles:"USER",
            message: message.trim()
        });

        session.status="IN_PROGRESS";
        await session.save();

        res.status(201).json(msg);
    }catch(err){
        console.error("Error adding message:",err);
        res.status(500).json({error:"Internal server error"});
    }
};

exports.deleteConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;

        if (!validateConversationId(conversationId, res)) {
            return;
        }

        const session = await conversationSession.findById(conversationId);
        if (!session) {
            return res.status(404).json({ error: 'Conversation session not found' });
        }

        if (session.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await conversationMessage.deleteMany({ conversationId });
        await conversationSession.findByIdAndDelete(conversationId);

        res.json({ message: 'Conversation deleted successfully', conversationId });
    } catch (err) {
        console.error('Error deleting conversation:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

//COMPLETE CONVERSATION AND ADD ACTION/DUE
exports.completeConversation=async(req,res)=>{
    try{
        const {conversationId}=req.params;
        
        // Validate conversation ID format
        if (!validateConversationId(conversationId, res)) {
            return;
        }
        
        const {action,snoozeDate}=req.body;
        const session=await conversationSession.findById(conversationId);
        if(!session){
            return res.status(404).json({error:"Conversation session not found"});
        }
        if(session.userId.toString()!==req.user._id.toString()){
            return res.status(403).json({error:"Access denied"});
        }
        if(session.status==="COMPLETED"){
            return res.status(400).json({error:"Conversation already completed"});
        }

        const due=await Due.findById(session.dueId);
        if(!due){
            return res.status(404).json({error:"Due not found"});
        }
        if(action==="PAID"){
            due.snoozeDate=snoozeDate;
            due.status="PAID";
        }
        if(action==="SNOOZE"){
            if(!snoozeDate){
                return res.status(400).json({error:"snoozeDate is required for SNOOZE action"});
            }
            due.snoozeDate=new Date(snoozeDate);
            due.status="UNPAID";  
        }
        await due.save();

        session.status="COMPLETED";
        session.finalOutcome={action};
        await session.save();

        await conversationMessage.create({
            conversationId:conversationId,
            roles:"SYSTEM",
            message:`Conversation completed with action: ${action}`
        });
        res.json({message:"Conversation completed successfully",session});
    }catch(err){
        console.error("Error completing conversation:",err);
        res.status(500).json({error:"Internal server error"});
    }
};

//VOICE MESSAGE UPLOAD AND CONVERSION TO TEXT
exports.addVoiceMessage = async (req, res) => {
    const result= await processVoiceMessage({
        audioBuffer: req.file.buffer,
        conversationId: req.params.conversationId,
        userId: req.user._id
    });
    res.json({
        message: result.message,
        audioFile: result.audioFile
    });
    /*try {

        if (typeof sttService?.speechToText !== "function") {
            return res.status(500).json({
                error: "Speech-to-text service not available"
            });
        }

        const { conversationId } = req.params;

        const session = await conversationSession.findById(conversationId);
        if (!session) {
            return res.status(404).json({ error: "Conversation not found" });
        }

        if (session.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: "Access denied" });
        }

        if (session.status === "COMPLETED") {
            return res.status(400).json({ error: "Conversation already completed" });
        }

        if (!req.file) {
            return res.status(400).json({ error: "Audio file is required" });
        }

        // 1️⃣ Convert speech to text
        let text;
        try {
            text = await sttService.speechToText(req.file.buffer);
        } catch (err) {
            return res.status(500).json({
                error: "Speech-to-text failed",
                details: err.message
            });
        }

        if (!text || text.trim() === "") {
            return res.status(400).json({
                error: "Speech-to-text returned empty result"
            });
        }

        // 2️⃣ Save USER message
        await conversationMessage.create({
            conversationId,
            roles: "USER",
            message: text
        });

        session.status = "IN_PROGRESS";
        await session.save();

        // =========================
        //  MULTI-TURN HANDLING
        // =========================
        if (session.clarificationState === "AWAITING") {

            let newData;
            try {
                newData = await llmService.detectIntent(text);
            } catch (err) {
                console.error("LLM clarification error:", err);

                return sendVoiceReply(
                    res,
                    session,
                    "I couldn't understand that. Please repeat."
                );
            }

            const mergedData = {
                ...session.pendingData,
                ...newData
            };

            const missing = [];
            if (!mergedData.title) missing.push("title");
            if (!mergedData.amount) missing.push("amount");
            if (!mergedData.dueDate) missing.push("due date");

            if (missing.length > 0) {
                session.pendingData = mergedData;
                await session.save();

                return sendVoiceReply(
                    res,
                    session,
                    `Please provide ${missing.join(" and ")}.`
                );
            }

            // Validate and parse dueDate
            const parsedDate = new Date(mergedData.dueDate);
            if (isNaN(parsedDate.getTime())) {
                session.clarificationState = "AWAITING";
                session.pendingData = mergedData;
                await session.save();

                return sendVoiceReply(
                    res,
                    session,
                    "I couldn't understand the due date. Please provide it clearly, like tomorrow or a specific date."
                );
            }

            const newDue = await Due.create({
                userId: req.user._id,
                title: mergedData.title,
                amount: mergedData.amount,
                dueDate: parsedDate,
                category: mergedData.category || "General"
            });

            session.clarificationState = "NONE";
            session.pendingIntent = null;
            session.pendingData = null;
            await session.save();

            return sendVoiceReply(
                res,
                session,
                `Due created successfully for ${newDue.title} of amount ${newDue.amount}.`
            );
        }

        // =========================
        //  NEW INTENT DETECTION
        // =========================

        let intentData;
        try {
            intentData = await llmService.detectIntent(text);
        } catch (err) {
            console.error("LLM intent detection error:", err);
            return sendVoiceReply(
                res,
                session,
                "I couldn't understand that clearly. Please try again."
            );
        }

        if (!intentData || !intentData.intent) {
            return sendVoiceReply(
                res,
                session,
                "I couldn't detect your intent. Please try again."
            );
        }

        // =========================
        //  HANDLE CREATE_DUE
        // =========================

        if (intentData.intent === "CREATE_DUE") {

            const missing = [];
            if (!intentData.title) missing.push("title");
            if (!intentData.amount) missing.push("amount");
            if (!intentData.dueDate) missing.push("due date");

            if (missing.length > 0) {

                session.clarificationState = "AWAITING";
                session.pendingIntent = "CREATE_DUE";
                session.pendingData = intentData;
                await session.save();

                return sendVoiceReply(
                    res,
                    session,
                    `Please provide ${missing.join(" and ")}.`
                );
            }

            // Validate and parse dueDate
            const parsedDate = new Date(intentData.dueDate);
            if (isNaN(parsedDate.getTime())) {
                session.clarificationState = "AWAITING";
                session.pendingIntent = "CREATE_DUE";
                session.pendingData = intentData;
                await session.save();

                return sendVoiceReply(
                    res,
                    session,
                    "I couldn't understand the due date. Please provide it clearly, like tomorrow or a specific date."
                );
            }

            const newDue = await Due.create({
                userId: req.user._id,
                title: intentData.title,
                amount: intentData.amount,
                dueDate: parsedDate,
                category: intentData.category || "General"
            });

            return sendVoiceReply(
                res,
                session,
                `Due created successfully for ${newDue.title} of amount ${newDue.amount}.`
            );
        }

        // UPDATE DUE and other intents can be handled similarly by checking intentData.intent and implementing the logic.

        if (intentData.intent === "UPDATE_DUE") {
            const dueId = intentData.dueId;
            if(!dueId){
                return sendVoiceReply(
                    res,
                    session,
                    "To update a due, please specify which one by providing the due ID."
                );
            }
            const due = await Due.findById(dueId);
            if(!due){
                return sendVoiceReply(
                    res,
                    session,
                    "I couldn't find the due you want to update. Please check the ID and try again."
                );
            }
            const updateFields = {};
            if (intentData.title) updateFields.title = intentData.title;
            if (intentData.amount) updateFields.amount = intentData.amount;
            if (intentData.dueDate) {
                const parsedDate = new Date(intentData.dueDate);
                if (!isNaN(parsedDate.getTime())) {
                    updateFields.dueDate = parsedDate;
                }
            }
            if (intentData.category) updateFields.category = intentData.category;

            if (Object.keys(updateFields).length === 0) {
    return sendVoiceReply(res, session, "No fields provided to update.");
  }

             
            try {
            const updatedDue = await Due.findByIdAndUpdate(dueId,  updateFields, { new: true });
            return sendVoiceReply(
                res,
                session,
                `Due updated successfully for ${updatedDue.title}.`
            );
        } catch (err) {
            return sendVoiceReply(
                res,
                session,
                "Failed to update the due."
            );
        }
        }

        //DELETE DUES WITH SAME LOGIC 
            if (intentData.intent === "DELETE_DUE") {
            const title = intentData.title;
            if(!title){
                return sendVoiceReply(
                    res,
                    session,
                    "To delete a due, please specify which one by providing the title."
                );
            }
            const due = await Due.findOne({ userId: req.user._id, title: title });
            if(!due){
                return sendVoiceReply(
                    res,
                    session,
                    "I couldn't find the due you want to delete. Please check the title and try again."
                );
            }
            try {            await Due.findByIdAndDelete(due._id);
            return sendVoiceReply(
                res,
                session,
                `Due with title ${title} deleted successfully.`
            );
        } catch (err) {
            return sendVoiceReply(
                res,
                session,
                "Failed to delete the due."
            );
        }
    }

    // GENERAL CHAT OR UNHANDLED INTENTS
    if (intentData.intent === "GENERAL_CHAT") {
        // You can implement a general chatbot response here using LLM or a simple rule-based response. For now, we'll just echo the user's message.
        return sendVoiceReply(
            res,
            session,
            `You said: "${text}". I'm here to help you manage your dues. You can say things like "Create a due for $50 tomorrow" or "Update my due with ID 123 , or delte it ".`
        );
    }

    //List Dues Intent
    if (intentData.intent === "LIST_DUES") {
        const dues = await Due.find({ userId: req.user._id });
        if (dues.length === 0) {
            return sendVoiceReply(
                res,
                session,
                "You have no dues at the moment."
            );
        }
        const duesList = dues.map(due => `${due.title} of amount ${due.amount} due on ${due.dueDate.toDateString()}`).join("; ");
        return sendVoiceReply(
            res,
            session,
            `Here are your dues: ${duesList}.`
        );
    }

        // =========================
        //  DEFAULT FALLBACK
        // =========================

        return sendVoiceReply(
            res,
            session,
            "I am not sure how to help with that. Please try again."
        );

    } catch (err) {
        console.error("Voice message error:", err.message);
        return res.status(500).json({
            error: "Internal server error",
            details: err.message
        });
    }
};

     async function sendVoiceReply(res, session, text) {

    await conversationMessage.create({
        conversationId: session._id,
        roles: "SYSTEM",
        message: text
    });

    let audioFile = null;

    if (session.channel === "VOICE") {
        try {
            const audiobuffer = await textToSpeech(text);

            const audiopath = path.join(
                __dirname,
                `../audio/reply_${Date.now()}.mp3`
            );

            fs.writeFileSync(audiopath, audiobuffer);
            audioFile = `/audio/${path.basename(audiopath)}`;

        } catch (err) {
            console.error("TTS failed:", err.message);
        }
    }

    return res.status(201).json({
        message: text,
        audioFile
    });*/
};


//INTENT DETECTION USING LLM
/*exports.detectIntent=async(req,res)=>{
    try{
        const {text}=req.body;
        if(!text){
            return res.status(400).json({error:"Text is required for intent detection"});
        }
        const intentData=await llmService.detectIntent(text);
        try {
            validateintent.validateIntent(intentData);
        } catch (validationErr) {
            console.error("Intent validation failed:", validationErr.message);
            return res.status(200).json({  message: "I couldn't understand that clearly. Please specify title, amount and due date.",
    fallback: true });
        }
        res.json({intentData});
        if(intentData.intent === "CREATE_DUE"){
            await Due.create({
                userId: req.user._id,
                title: intentData.title || "Untitled Due",
                amount: intentData.amount || 0,
                dueDate: intentData.dueDate ? new Date(intentData.dueDate) : null,
                category: intentData.category || "General"
            });
            return res.json({message:"Due created successfully based on your message!"});
        }
    }
    catch(err){
        const details = err?.message || err?.toString?.() || 'Unknown error';
        console.error("Error in intent detection:", details);
        console.error("Stack:", err?.stack);
        res.status(500).json({error:"Internal server error", details});
    }
};*/