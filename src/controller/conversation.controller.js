const conversationSession=require('../models/db').ConversationSession;
const conversationMessage=require('../models/db').Conversation;
const Due =require('../models/db').Dues;
const path=require('path');
const fs=require('fs');
const {textToSpeech}=require('../Service/tts.service');
const sttService = require('../Service/stt.service');

//CREATE A NEW CONVERSATION SESSION
exports.createConversation=async(req,res)=>{
    try{
        const {dueId, channel = 'TEXT'} = req.body;
        
        // Check if user is authenticated
        if(!req.user || !req.user._id){
            return res.status(401).json({error:"User not authenticated"});
        }
        
        if(!dueId){
            return res.status(400).json({error:"dueId is required"});
        }

        const due = await Due.findById(dueId);
        if(!due){
            return res.status(404).json({error:"Due not found"});
        }
        
        if(due.userId.toString() !== req.user._id.toString()){
            return res.status(403).json({error:"Access denied"});
        }
        
        const session = await conversationSession.create({
            userId: req.user._id,
            dueId: dueId,
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
            try{
               console.log("Calling ElevenLabs TTS...");
const audiobuffer = await textToSpeech(systemText);
console.log("ElevenLabs returned buffer length:", audiobuffer?.length);
                const audiopath= path.join(__dirname, `../audio/${session._id}.mp3`);
                fs.writeFileSync(audiopath, audiobuffer);
                audioFile = `/audio/${session._id}.mp3`;
            }catch(ttsErr){
                console.error("TTS failed for conversation:", session._id, ttsErr?.message || ttsErr);
                // Don't fail the whole API call if TTS fails; return conversation with audioFile=null
                audioFile = null;
            }
        }

        
        res.status(201).json({
      message: "Conversation session created",
      conversationId: session._id,
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
        const {message}=req.body;
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
            message
        });

        session.status="IN_PROGRESS";
        await session.save();

        res.status(201).json(msg);
    }catch(err){
        console.error("Error adding message:",err);
        res.status(500).json({error:"Internal server error"});
    }
};

//COMPLETE CONVERSATION AND ADD ACTION/DUE
exports.completeConversation=async(req,res)=>{
    try{
        const {conversationId}=req.params;
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
exports.addVoiceMessage=async(req,res)=>{
    try{
        if (typeof sttService?.speechToText !== 'function') {
            console.error('STT not available. Exports:', sttService ? Object.keys(sttService) : 'sttService undefined');
            return res.status(500).json({ error: "Internal server error", details: "Speech-to-text service is not available" });
        }

        const {conversationId}=req.params;
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
        if(!req.file){
            return res.status(400).json({error:"Audio file is required"});
        }

        console.log('Processing voice message - file size:', req.file.size, 'bytes');

        let text;
        try {
            text = await sttService.speechToText(req.file.buffer);
        } catch (sttErr) {
            const msg = sttErr.response?.data?.detail || sttErr.response?.data?.message || sttErr.message || String(sttErr);
            console.error('STT conversion error:', msg);
            return res.status(500).json({ error: "Speech to text conversion failed", details: msg });
        }

        if(!text || (typeof text === 'string' && text.trim() === '')){
            return res.status(500).json({error:"Speech to text conversion returned empty result"});
        }

        console.log('STT result:', text);
        const msg= await conversationMessage.create({
            conversationId:conversationId,
            roles:"USER",
            message: text
        });
        session.status="IN_PROGRESS";
        await session.save();
        res.status(201).json({message:"Voice message added successfully", text, msg});
    }catch(err){
        const details = err?.message || err?.toString?.() || 'Unknown error';
        console.error("Error adding voice message:", details);
        console.error("Stack:", err?.stack);
        res.status(500).json({ error: "Internal server error", details });
    }
};
