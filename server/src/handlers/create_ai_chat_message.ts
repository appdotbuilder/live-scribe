import { db } from '../db';
import { aiChatMessagesTable } from '../db/schema';
import { type CreateAiChatMessageInput, type AiChatMessage } from '../schema';

export const createAiChatMessage = async (input: CreateAiChatMessageInput): Promise<AiChatMessage> => {
  try {
    // Serialize context_messages array to JSON string for storage
    const contextMessagesJson = input.context_messages 
      ? JSON.stringify(input.context_messages) 
      : null;

    // Insert AI chat message record
    const result = await db.insert(aiChatMessagesTable)
      .values({
        session_id: input.session_id,
        role: input.role,
        content: input.content,
        context_messages: contextMessagesJson
      })
      .returning()
      .execute();

    // Parse context_messages back to array for response
    const message = result[0];
    return {
      ...message,
      context_messages: message.context_messages 
        ? JSON.parse(message.context_messages) 
        : undefined
    };
  } catch (error) {
    console.error('AI chat message creation failed:', error);
    throw error;
  }
};