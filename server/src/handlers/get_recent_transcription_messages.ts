import { db } from '../db';
import { transcriptionMessagesTable } from '../db/schema';
import { type TranscriptionMessage } from '../schema';
import { eq, and, gte, desc } from 'drizzle-orm';

export async function getRecentTranscriptionMessages(sessionId: string, minutes: number = 5): Promise<TranscriptionMessage[]> {
  try {
    // Calculate the cutoff time for recent messages
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - minutes);

    // Query for final transcription messages from the specified session within the time window
    const results = await db.select()
      .from(transcriptionMessagesTable)
      .where(
        and(
          eq(transcriptionMessagesTable.session_id, sessionId),
          eq(transcriptionMessagesTable.is_final, true),
          gte(transcriptionMessagesTable.timestamp, cutoffTime)
        )
      )
      .orderBy(desc(transcriptionMessagesTable.timestamp))
      .execute();

    // Convert numeric fields and return
    return results.map(message => ({
      ...message,
      confidence: parseFloat(message.confidence.toString()) // Convert real to number
    }));
  } catch (error) {
    console.error('Failed to fetch recent transcription messages:', error);
    throw error;
  }
}