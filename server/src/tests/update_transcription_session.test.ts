import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transcriptionSessionsTable } from '../db/schema';
import { type UpdateTranscriptionSessionInput } from '../schema';
import { updateTranscriptionSession } from '../handlers/update_transcription_session';
import { eq } from 'drizzle-orm';

describe('updateTranscriptionSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test session
  const createTestSession = async () => {
    const result = await db.insert(transcriptionSessionsTable)
      .values({
        title: 'Original Title',
        status: 'active',
        audio_source: 'original-device-id'
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should update session title only', async () => {
    const session = await createTestSession();
    const originalUpdatedAt = session.updated_at;

    const updateInput: UpdateTranscriptionSessionInput = {
      id: session.id,
      title: 'Updated Title'
    };

    const result = await updateTranscriptionSession(updateInput);

    expect(result.id).toEqual(session.id);
    expect(result.title).toEqual('Updated Title');
    expect(result.status).toEqual('active'); // Should remain unchanged
    expect(result.audio_source).toEqual('original-device-id'); // Should remain unchanged
    expect(result.created_at).toEqual(session.created_at);
    expect(result.updated_at).not.toEqual(originalUpdatedAt); // Should be updated
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update session status only', async () => {
    const session = await createTestSession();

    const updateInput: UpdateTranscriptionSessionInput = {
      id: session.id,
      status: 'paused'
    };

    const result = await updateTranscriptionSession(updateInput);

    expect(result.id).toEqual(session.id);
    expect(result.title).toEqual('Original Title'); // Should remain unchanged
    expect(result.status).toEqual('paused');
    expect(result.audio_source).toEqual('original-device-id'); // Should remain unchanged
  });

  it('should update audio source only', async () => {
    const session = await createTestSession();

    const updateInput: UpdateTranscriptionSessionInput = {
      id: session.id,
      audio_source: 'new-device-id'
    };

    const result = await updateTranscriptionSession(updateInput);

    expect(result.id).toEqual(session.id);
    expect(result.title).toEqual('Original Title'); // Should remain unchanged
    expect(result.status).toEqual('active'); // Should remain unchanged
    expect(result.audio_source).toEqual('new-device-id');
  });

  it('should update multiple fields simultaneously', async () => {
    const session = await createTestSession();

    const updateInput: UpdateTranscriptionSessionInput = {
      id: session.id,
      title: 'New Meeting Title',
      status: 'stopped',
      audio_source: 'updated-device-id'
    };

    const result = await updateTranscriptionSession(updateInput);

    expect(result.id).toEqual(session.id);
    expect(result.title).toEqual('New Meeting Title');
    expect(result.status).toEqual('stopped');
    expect(result.audio_source).toEqual('updated-device-id');
    expect(result.created_at).toEqual(session.created_at);
    expect(result.updated_at).not.toEqual(session.updated_at);
  });

  it('should update database record correctly', async () => {
    const session = await createTestSession();

    const updateInput: UpdateTranscriptionSessionInput = {
      id: session.id,
      title: 'Database Test Title',
      status: 'paused'
    };

    await updateTranscriptionSession(updateInput);

    // Verify the update was persisted in the database
    const updatedSessions = await db.select()
      .from(transcriptionSessionsTable)
      .where(eq(transcriptionSessionsTable.id, session.id))
      .execute();

    expect(updatedSessions).toHaveLength(1);
    expect(updatedSessions[0].title).toEqual('Database Test Title');
    expect(updatedSessions[0].status).toEqual('paused');
    expect(updatedSessions[0].audio_source).toEqual('original-device-id'); // Unchanged
    expect(updatedSessions[0].updated_at).not.toEqual(session.updated_at);
  });

  it('should handle all possible status values', async () => {
    const session = await createTestSession();

    // Test each status value
    const statuses: Array<'active' | 'paused' | 'stopped'> = ['active', 'paused', 'stopped'];

    for (const status of statuses) {
      const updateInput: UpdateTranscriptionSessionInput = {
        id: session.id,
        status: status
      };

      const result = await updateTranscriptionSession(updateInput);
      expect(result.status).toEqual(status);
    }
  });

  it('should always update the updated_at timestamp', async () => {
    const session = await createTestSession();
    const originalUpdatedAt = session.updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateTranscriptionSessionInput = {
      id: session.id,
      title: 'Timestamp Test'
    };

    const result = await updateTranscriptionSession(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error when session does not exist', async () => {
    const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';

    const updateInput: UpdateTranscriptionSessionInput = {
      id: nonExistentId,
      title: 'Should Not Work'
    };

    await expect(updateTranscriptionSession(updateInput))
      .rejects
      .toThrow(/Transcription session with ID .+ not found/i);
  });

  it('should handle empty update gracefully', async () => {
    const session = await createTestSession();
    const originalUpdatedAt = session.updated_at;

    // Update with only the required ID (no optional fields)
    const updateInput: UpdateTranscriptionSessionInput = {
      id: session.id
    };

    const result = await updateTranscriptionSession(updateInput);

    // All original fields should remain the same except updated_at
    expect(result.id).toEqual(session.id);
    expect(result.title).toEqual('Original Title');
    expect(result.status).toEqual('active');
    expect(result.audio_source).toEqual('original-device-id');
    expect(result.created_at).toEqual(session.created_at);
    expect(result.updated_at).not.toEqual(originalUpdatedAt); // Should still be updated
  });

  it('should handle long title updates', async () => {
    const session = await createTestSession();

    const longTitle = 'A'.repeat(255); // Maximum length allowed by schema

    const updateInput: UpdateTranscriptionSessionInput = {
      id: session.id,
      title: longTitle
    };

    const result = await updateTranscriptionSession(updateInput);

    expect(result.title).toEqual(longTitle);
    expect(result.title.length).toEqual(255);
  });

  it('should preserve created_at timestamp during updates', async () => {
    const session = await createTestSession();
    const originalCreatedAt = session.created_at;

    const updateInput: UpdateTranscriptionSessionInput = {
      id: session.id,
      title: 'Preserve Created At Test',
      status: 'stopped',
      audio_source: 'new-device'
    };

    const result = await updateTranscriptionSession(updateInput);

    expect(result.created_at).toEqual(originalCreatedAt);
    expect(result.created_at).toBeInstanceOf(Date);
  });
});