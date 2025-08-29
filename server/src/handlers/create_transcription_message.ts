import { db } from '../db';
import { transcriptionMessagesTable, transcriptionSessionsTable } from '../db/schema';
import { type CreateTranscriptionMessageInput, type TranscriptionMessage } from '../schema';
import { eq } from 'drizzle-orm';

export const createTranscriptionMessage = async (input: CreateTranscriptionMessageInput): Promise<TranscriptionMessage> => {
  try {
    // Verify that the session exists before creating the message
    const session = await db.select()
      .from(transcriptionSessionsTable)
      .where(eq(transcriptionSessionsTable.id, input.session_id))
      .limit(1)
      .execute();

    if (session.length === 0) {
      throw new Error(`Transcription session with ID ${input.session_id} not found`);
    }

    // Insert transcription message record
    const result = await db.insert(transcriptionMessagesTable)
      .values({
        session_id: input.session_id,
        content: input.content,
        confidence: input.confidence, // Real type - no conversion needed
        timestamp: new Date(), // Current timestamp for when transcription occurred
        is_final: input.is_final,
        speaker_id: input.speaker_id || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Transcription message creation failed:', error);
    throw error;
  }
};