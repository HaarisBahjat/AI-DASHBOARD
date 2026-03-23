exports.validateIntent=(intentData)=>{
    if (!intentData || typeof intentData !== "object") {
    throw new Error("Invalid LLM response format");
  }

  const allowedIntents = ["create_due", "update_due", "delete_due", "list_dues", "general_chat"];

  if (!allowedIntents.includes(intentData.intent)) {
    throw new Error("Invalid intent detected");
  }

  if (intentData.intent === "create_due") {
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
    
