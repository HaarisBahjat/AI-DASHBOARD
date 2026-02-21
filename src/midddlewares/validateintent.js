exports.validateIntent=(intentData)=>{
    if (!intentData || typeof intentData !== "object") {
    throw new Error("Invalid LLM response format");
  }

  const allowedIntents = ["CREATE_DUE", "UPDATE_DUE", "DELETE_DUE", "LIST_DUES", "GENERAL_CHAT"];

  if (!allowedIntents.includes(intentData.intent)) {
    throw new Error("Invalid intent detected");
  }

  if (intentData.intent === "CREATE_DUE") {
    if (!intentData.title || typeof intentData.title !== "string") {
      throw new Error("Invalid or missing title");
    }
    if (intentData.amount !== null && typeof intentData.amount !== "number") {
        throw new Error("Amount must be a number or null");
    }
    if (intentData.dueDate !== "" && isNaN(Date.parse(intentData.dueDate))) {
        throw new Error("Invalid due date format");
    }
}
return true;
};
    
