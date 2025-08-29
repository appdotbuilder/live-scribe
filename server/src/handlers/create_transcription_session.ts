import { db } from '../db';
import { transcriptionSessionsTable } from '../db/schema';
import { type CreateTranscriptionSessionInput, type TranscriptionSession } from '../schema';

export const createTranscriptionSession = async (input: CreateTranscriptionSessionInput): Promise<TranscriptionSession> => {
  try {
    // Insert transcription session record
    const result = await db.insert(transcriptionSessionsTable)
      .values({
        title: input.title,
        audio_source: input.audio_source,
        status: 'active', // Default status for new sessions
      })
      .returning()
      .execute();

    // Return the created session
    const session = result[0];
    return {
      ...session,
    };
  } catch (error) {
    console.error('Transcription session creation failed:', error);
    throw error;
  }
};