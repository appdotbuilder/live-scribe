import { db } from '../db';
import { transcriptionSessionsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteTranscriptionSession = async (sessionId: string): Promise<void> => {
  try {
    // Delete the transcription session
    // This will cascade delete all related transcription messages and AI chat messages
    // due to the foreign key constraints with onDelete: 'cascade'
    await db.delete(transcriptionSessionsTable)
      .where(eq(transcriptionSessionsTable.id, sessionId))
      .execute();
  } catch (error) {
    console.error('Transcription session deletion failed:', error);
    throw error;
  }
};