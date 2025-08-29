import { db } from '../db';
import { transcriptionSessionsTable } from '../db/schema';
import { type UpdateTranscriptionSessionInput, type TranscriptionSession } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateTranscriptionSession(input: UpdateTranscriptionSessionInput): Promise<TranscriptionSession> {
  try {
    // Build update object with only provided fields
    const updateData: Partial<{
      title: string;
      status: 'active' | 'paused' | 'stopped';
      audio_source: string;
      updated_at: Date;
    }> = {
      updated_at: new Date() // Always update the timestamp
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    if (input.audio_source !== undefined) {
      updateData.audio_source = input.audio_source;
    }

    // Update the transcription session
    const result = await db.update(transcriptionSessionsTable)
      .set(updateData)
      .where(eq(transcriptionSessionsTable.id, input.id))
      .returning()
      .execute();

    // Check if session was found and updated
    if (result.length === 0) {
      throw new Error(`Transcription session with ID ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Transcription session update failed:', error);
    throw error;
  }
}