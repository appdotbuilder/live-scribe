import { db } from '../db';
import { transcriptionMessagesTable } from '../db/schema';
import { type GetTranscriptionMessagesInput, type TranscriptionMessage } from '../schema';
import { eq, and, desc, type SQL } from 'drizzle-orm';

export async function getTranscriptionMessages(input: GetTranscriptionMessagesInput): Promise<TranscriptionMessage[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    // Always filter by session_id
    conditions.push(eq(transcriptionMessagesTable.session_id, input.session_id));
    
    // Optional filter by is_final flag
    if (input.is_final !== undefined) {
      conditions.push(eq(transcriptionMessagesTable.is_final, input.is_final));
    }

    // Build query step by step to maintain proper type inference
    const baseQuery = db.select()
      .from(transcriptionMessagesTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(transcriptionMessagesTable.timestamp))
      .limit(input.limit)
      .offset(input.offset);

    const results = await baseQuery.execute();

    // Convert numeric fields (confidence is real/float type)
    return results.map(message => ({
      ...message,
      confidence: parseFloat(message.confidence.toString()) // Convert numeric to number
    }));
  } catch (error) {
    console.error('Failed to get transcription messages:', error);
    throw error;
  }
}