import { db } from '../db';
import { transcriptionSessionsTable } from '../db/schema';
import { type TranscriptionSession } from '../schema';
import { desc } from 'drizzle-orm';

export const getTranscriptionSessions = async (): Promise<TranscriptionSession[]> => {
  try {
    // Fetch all transcription sessions ordered by creation date (newest first)
    const result = await db.select()
      .from(transcriptionSessionsTable)
      .orderBy(desc(transcriptionSessionsTable.created_at))
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch transcription sessions:', error);
    throw error;
  }
};