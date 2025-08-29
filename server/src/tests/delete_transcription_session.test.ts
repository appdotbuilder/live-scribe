import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transcriptionSessionsTable, transcriptionMessagesTable, aiChatMessagesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { deleteTranscriptionSession } from '../handlers/delete_transcription_session';

describe('deleteTranscriptionSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing transcription session', async () => {
    // Create a test session
    const sessionResult = await db.insert(transcriptionSessionsTable)
      .values({
        title: 'Test Session',
        audio_source: 'test-device-id'
      })
      .returning()
      .execute();

    const sessionId = sessionResult[0].id;

    // Verify session exists
    const beforeDelete = await db.select()
      .from(transcriptionSessionsTable)
      .where(eq(transcriptionSessionsTable.id, sessionId))
      .execute();
    expect(beforeDelete).toHaveLength(1);

    // Delete the session
    await deleteTranscriptionSession(sessionId);

    // Verify session is deleted
    const afterDelete = await db.select()
      .from(transcriptionSessionsTable)
      .where(eq(transcriptionSessionsTable.id, sessionId))
      .execute();
    expect(afterDelete).toHaveLength(0);
  });

  it('should cascade delete related transcription messages', async () => {
    // Create a test session
    const sessionResult = await db.insert(transcriptionSessionsTable)
      .values({
        title: 'Test Session with Messages',
        audio_source: 'test-device-id'
      })
      .returning()
      .execute();

    const sessionId = sessionResult[0].id;

    // Create related transcription messages
    await db.insert(transcriptionMessagesTable)
      .values([
        {
          session_id: sessionId,
          content: 'First transcription message',
          confidence: 0.95,
          timestamp: new Date(),
          is_final: true
        },
        {
          session_id: sessionId,
          content: 'Second transcription message',
          confidence: 0.88,
          timestamp: new Date(),
          is_final: false
        }
      ])
      .execute();

    // Verify messages exist
    const beforeDelete = await db.select()
      .from(transcriptionMessagesTable)
      .where(eq(transcriptionMessagesTable.session_id, sessionId))
      .execute();
    expect(beforeDelete).toHaveLength(2);

    // Delete the session
    await deleteTranscriptionSession(sessionId);

    // Verify related messages are cascade deleted
    const afterDelete = await db.select()
      .from(transcriptionMessagesTable)
      .where(eq(transcriptionMessagesTable.session_id, sessionId))
      .execute();
    expect(afterDelete).toHaveLength(0);
  });

  it('should cascade delete related AI chat messages', async () => {
    // Create a test session
    const sessionResult = await db.insert(transcriptionSessionsTable)
      .values({
        title: 'Test Session with AI Messages',
        audio_source: 'test-device-id'
      })
      .returning()
      .execute();

    const sessionId = sessionResult[0].id;

    // Create related AI chat messages
    await db.insert(aiChatMessagesTable)
      .values([
        {
          session_id: sessionId,
          role: 'user',
          content: 'Hello AI assistant'
        },
        {
          session_id: sessionId,
          role: 'assistant',
          content: 'Hello! How can I help you?'
        }
      ])
      .execute();

    // Verify messages exist
    const beforeDelete = await db.select()
      .from(aiChatMessagesTable)
      .where(eq(aiChatMessagesTable.session_id, sessionId))
      .execute();
    expect(beforeDelete).toHaveLength(2);

    // Delete the session
    await deleteTranscriptionSession(sessionId);

    // Verify related AI messages are cascade deleted
    const afterDelete = await db.select()
      .from(aiChatMessagesTable)
      .where(eq(aiChatMessagesTable.session_id, sessionId))
      .execute();
    expect(afterDelete).toHaveLength(0);
  });

  it('should cascade delete all related data when session has both message types', async () => {
    // Create a test session
    const sessionResult = await db.insert(transcriptionSessionsTable)
      .values({
        title: 'Test Session with All Messages',
        audio_source: 'test-device-id'
      })
      .returning()
      .execute();

    const sessionId = sessionResult[0].id;

    // Create transcription messages
    await db.insert(transcriptionMessagesTable)
      .values({
        session_id: sessionId,
        content: 'Transcribed text',
        confidence: 0.92,
        timestamp: new Date(),
        is_final: true
      })
      .execute();

    // Create AI chat messages
    await db.insert(aiChatMessagesTable)
      .values({
        session_id: sessionId,
        role: 'user',
        content: 'User message'
      })
      .execute();

    // Verify all data exists
    const transcriptionMessages = await db.select()
      .from(transcriptionMessagesTable)
      .where(eq(transcriptionMessagesTable.session_id, sessionId))
      .execute();
    const aiChatMessages = await db.select()
      .from(aiChatMessagesTable)
      .where(eq(aiChatMessagesTable.session_id, sessionId))
      .execute();

    expect(transcriptionMessages).toHaveLength(1);
    expect(aiChatMessages).toHaveLength(1);

    // Delete the session
    await deleteTranscriptionSession(sessionId);

    // Verify all related data is cascade deleted
    const afterTranscriptionMessages = await db.select()
      .from(transcriptionMessagesTable)
      .where(eq(transcriptionMessagesTable.session_id, sessionId))
      .execute();
    const afterAiChatMessages = await db.select()
      .from(aiChatMessagesTable)
      .where(eq(aiChatMessagesTable.session_id, sessionId))
      .execute();

    expect(afterTranscriptionMessages).toHaveLength(0);
    expect(afterAiChatMessages).toHaveLength(0);
  });

  it('should handle deletion of non-existent session gracefully', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    // Should not throw an error when deleting non-existent session
    await expect(deleteTranscriptionSession(nonExistentId)).resolves.toBeUndefined();

    // Verify no sessions were affected
    const allSessions = await db.select()
      .from(transcriptionSessionsTable)
      .execute();
    expect(allSessions).toHaveLength(0);
  });

  it('should not affect other sessions when deleting one', async () => {
    // Create multiple test sessions
    const session1Result = await db.insert(transcriptionSessionsTable)
      .values({
        title: 'Session 1',
        audio_source: 'device-1'
      })
      .returning()
      .execute();

    const session2Result = await db.insert(transcriptionSessionsTable)
      .values({
        title: 'Session 2',
        audio_source: 'device-2'
      })
      .returning()
      .execute();

    const session1Id = session1Result[0].id;
    const session2Id = session2Result[0].id;

    // Add messages to both sessions
    await db.insert(transcriptionMessagesTable)
      .values([
        {
          session_id: session1Id,
          content: 'Message for session 1',
          confidence: 0.95,
          timestamp: new Date(),
          is_final: true
        },
        {
          session_id: session2Id,
          content: 'Message for session 2',
          confidence: 0.90,
          timestamp: new Date(),
          is_final: true
        }
      ])
      .execute();

    // Delete only session 1
    await deleteTranscriptionSession(session1Id);

    // Verify session 1 and its data are deleted
    const session1After = await db.select()
      .from(transcriptionSessionsTable)
      .where(eq(transcriptionSessionsTable.id, session1Id))
      .execute();
    const session1Messages = await db.select()
      .from(transcriptionMessagesTable)
      .where(eq(transcriptionMessagesTable.session_id, session1Id))
      .execute();

    expect(session1After).toHaveLength(0);
    expect(session1Messages).toHaveLength(0);

    // Verify session 2 and its data remain intact
    const session2After = await db.select()
      .from(transcriptionSessionsTable)
      .where(eq(transcriptionSessionsTable.id, session2Id))
      .execute();
    const session2Messages = await db.select()
      .from(transcriptionMessagesTable)
      .where(eq(transcriptionMessagesTable.session_id, session2Id))
      .execute();

    expect(session2After).toHaveLength(1);
    expect(session2After[0].title).toEqual('Session 2');
    expect(session2Messages).toHaveLength(1);
    expect(session2Messages[0].content).toEqual('Message for session 2');
  });
});