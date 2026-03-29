const sttService = require("./stt.service");
const llmService = require("./llm.service");
const { textToSpeech } = require("./tts.service");
const mongoose = require("mongoose");

const conversationSession=require('../models/db').ConversationSession;
const conversationMessage=require('../models/db').Conversation;
const Due =require('../models/db').Dues;

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

exports.processVoiceMessage = async ({conversationId, audioBuffer,userId}) => {
    try {
        // Validate conversationId if provided
        if (conversationId && !isValidObjectId(conversationId)) {
            throw new Error("Invalid conversation ID format");
        }

        // Step 1: Convert audio to text
        const text= await sttService.speechToText(audioBuffer);
      if(!text || text.trim() === ""){
        throw new Error("Could not transcribe audio. Please try again with clearer audio.");
      }
      //LOAD CONVERSATION
      const session= await conversationSession.findById(conversationId);
      let currentSession = session;
      let sessionExists = true;
      if(!session){
        // Create a new session for testing
        currentSession = await conversationSession.create({
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
    if(currentSession.status==="COMPLETED"){
        throw new Error("Conversation session is already completed");
    }
    //saave user message to db
    const userMessage= await conversationMessage.create({
        conversationId,
        roles:"USER",
        message:text
    });
    currentSession.status="IN_PROGRESS";
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
    
    const newDue= await Due.create({
        userId,
        title:mergedData.title, 
        amount:mergedData.amount,
        dueDate:parsedData,
        category:mergedData.category || "general"
    });
    currentSession.clarificationState="NONE";
    currentSession.pendingIntent=null;
    currentSession.pendingData=null;
    
    await currentSession.save();
    replytext=`Your due "${newDue.title}" of amount ${newDue.amount} has been added successfully with due date ${newDue.dueDate.toDateString()}.`;
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
      const newDue= await Due.create({
        userId,
        title:intentData.title,
        amount:intentData.amount,
        dueDate:parsedDate,
        category:intentData.category || "general"
      });
      replytext=`Your due "${newDue.title}" of amount ${newDue.amount} has been added successfully with due date ${newDue.dueDate.toDateString()}.`;
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
    //LIST DUES INTENT LOGIC
    if(normalizedIntent ==="list_dues"){
      const dues= await Due.find({userId});
      if(dues.length===0){
        replytext="You have no dues at the moment.";
        return finalizeReply(currentSession, replytext);
      }
      const dueList=dues.map(due=>`- ${due.title}: ${due.amount} due on ${due.dueDate.toDateString()}`).join("\n");
      replytext=`Here are your current dues:\n${dueList}`;
      return finalizeReply(currentSession, replytext);
    }
    //FALLBACK FOR UNRECOGNIZED INTENTS
    if(normalizedIntent ==="general_chat"){
        replytext = `You said "${text}". I can help you create, update, delete, or list dues.`;
      return finalizeReply(currentSession, replytext);
    }
    //DEFAULT FALLBACK
    replytext="Sorry, I couldn't understand your request. Could you please rephrase?";
    return finalizeReply(currentSession, replytext);
    } catch (error) {
        console.error("Error processing voice message:", error);
        throw error;
    }
};

async function finalizeReply(session, replytext) {
    await conversationMessage.create({
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


