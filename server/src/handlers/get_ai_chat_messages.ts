import { db } from '../db';
import { aiChatMessagesTable } from '../db/schema';
import { type GetAiChatMessagesInput, type AiChatMessage } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getAiChatMessages(input: GetAiChatMessagesInput): Promise<AiChatMessage[]> {
  try {
    // Build and execute the query in one step
    const results = await db.select()
      .from(aiChatMessagesTable)
      .where(eq(aiChatMessagesTable.session_id, input.session_id))
      .orderBy(desc(aiChatMessagesTable.timestamp))
      .limit(input.limit)
      .offset(input.offset)
      .execute();

    // Transform results to match the schema
    return results.map(message => ({
      id: message.id,
      session_id: message.session_id,
      role: message.role,
      content: message.content,
      context_messages: message.context_messages ? JSON.parse(message.context_messages) : undefined,
      timestamp: message.timestamp,
      created_at: message.created_at
    }));
  } catch (error) {
    console.error('Failed to get AI chat messages:', error);
    throw error;
  }
}