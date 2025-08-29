import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transcriptionSessionsTable, transcriptionMessagesTable } from '../db/schema';
import { type GetTranscriptionMessagesInput } from '../schema';
import { getTranscriptionMessages } from '../handlers/get_transcription_messages';
import { eq } from 'drizzle-orm';

describe('getTranscriptionMessages', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test session
  const createTestSession = async () => {
    const sessionResult = await db.insert(transcriptionSessionsTable)
      .values({
        title: 'Test Session',
        audio_source: 'test-device-id',
        status: 'active'
      })
      .returning()
      .execute();
    
    return sessionResult[0];
  };

  // Helper function to create test messages
  const createTestMessages = async (sessionId: string, count: number = 3) => {
    const messages = [];
    for (let i = 0; i < count; i++) {
      const message = {
        session_id: sessionId,
        content: `Test message ${i + 1}`,
        confidence: 0.9 - (i * 0.1), // Varying confidence scores
        timestamp: new Date(Date.now() - (count - i) * 1000), // Chronological order
        is_final: i % 2 === 0, // Alternate between final and interim
        speaker_id: i === 2 ? 'speaker_1' : null // Some with speaker ID
      };
      messages.push(message);
    }

    const results = await db.insert(transcriptionMessagesTable)
      .values(messages)
      .returning()
      .execute();

    return results;
  };

  it('should return messages for a session with default parameters', async () => {
    const session = await createTestSession();
    await createTestMessages(session.id, 3);

    const input: GetTranscriptionMessagesInput = {
      session_id: session.id,
      limit: 100,
      offset: 0
    };

    const result = await getTranscriptionMessages(input);

    expect(result).toHaveLength(3);
    expect(result[0].session_id).toEqual(session.id);
    expect(result[0].content).toBeDefined();
    expect(typeof result[0].confidence).toBe('number');
    expect(result[0].timestamp).toBeInstanceOf(Date);
    expect(typeof result[0].is_final).toBe('boolean');
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return messages in descending timestamp order', async () => {
    const session = await createTestSession();
    await createTestMessages(session.id, 5);

    const input: GetTranscriptionMessagesInput = {
      session_id: session.id,
      limit: 100,
      offset: 0
    };

    const result = await getTranscriptionMessages(input);

    expect(result).toHaveLength(5);
    
    // Verify descending order by timestamp
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(
        result[i].timestamp.getTime()
      );
    }
  });

  it('should filter by is_final flag when provided', async () => {
    const session = await createTestSession();
    await createTestMessages(session.id, 6); // Creates 3 final and 3 interim messages

    // Test filtering for final messages only
    const finalInput: GetTranscriptionMessagesInput = {
      session_id: session.id,
      limit: 100,
      offset: 0,
      is_final: true
    };

    const finalResults = await getTranscriptionMessages(finalInput);
    expect(finalResults).toHaveLength(3);
    finalResults.forEach(message => {
      expect(message.is_final).toBe(true);
    });

    // Test filtering for interim messages only
    const interimInput: GetTranscriptionMessagesInput = {
      session_id: session.id,
      limit: 100,
      offset: 0,
      is_final: false
    };

    const interimResults = await getTranscriptionMessages(interimInput);
    expect(interimResults).toHaveLength(3);
    interimResults.forEach(message => {
      expect(message.is_final).toBe(false);
    });
  });

  it('should handle pagination with limit and offset', async () => {
    const session = await createTestSession();
    await createTestMessages(session.id, 10);

    // Get first page
    const firstPageInput: GetTranscriptionMessagesInput = {
      session_id: session.id,
      limit: 3,
      offset: 0
    };

    const firstPage = await getTranscriptionMessages(firstPageInput);
    expect(firstPage).toHaveLength(3);

    // Get second page
    const secondPageInput: GetTranscriptionMessagesInput = {
      session_id: session.id,
      limit: 3,
      offset: 3
    };

    const secondPage = await getTranscriptionMessages(secondPageInput);
    expect(secondPage).toHaveLength(3);

    // Verify no overlap between pages
    const firstPageIds = firstPage.map(m => m.id);
    const secondPageIds = secondPage.map(m => m.id);
    const overlap = firstPageIds.filter(id => secondPageIds.includes(id));
    expect(overlap).toHaveLength(0);

    // Get remaining messages
    const thirdPageInput: GetTranscriptionMessagesInput = {
      session_id: session.id,
      limit: 10,
      offset: 6
    };

    const thirdPage = await getTranscriptionMessages(thirdPageInput);
    expect(thirdPage).toHaveLength(4); // Remaining messages
  });

  it('should return empty array for non-existent session', async () => {
    // Use a valid UUID format that doesn't exist in database
    const input: GetTranscriptionMessagesInput = {
      session_id: '550e8400-e29b-41d4-a716-446655440000',
      limit: 100,
      offset: 0
    };

    const result = await getTranscriptionMessages(input);
    expect(result).toHaveLength(0);
  });

  it('should only return messages for the specified session', async () => {
    // Create two sessions
    const session1 = await createTestSession();
    const session2 = await createTestSession();

    // Add messages to both sessions
    await createTestMessages(session1.id, 3);
    await createTestMessages(session2.id, 2);

    // Query for session1 messages only
    const input: GetTranscriptionMessagesInput = {
      session_id: session1.id,
      limit: 100,
      offset: 0
    };

    const result = await getTranscriptionMessages(input);
    expect(result).toHaveLength(3);
    result.forEach(message => {
      expect(message.session_id).toEqual(session1.id);
    });
  });

  it('should handle numeric confidence conversion correctly', async () => {
    const session = await createTestSession();
    
    // Create message with specific confidence value
    await db.insert(transcriptionMessagesTable)
      .values({
        session_id: session.id,
        content: 'Test message with confidence',
        confidence: 0.85, // This will be stored as numeric/real
        timestamp: new Date(),
        is_final: true,
        speaker_id: null
      })
      .execute();

    const input: GetTranscriptionMessagesInput = {
      session_id: session.id,
      limit: 100,
      offset: 0
    };

    const result = await getTranscriptionMessages(input);
    expect(result).toHaveLength(1);
    expect(typeof result[0].confidence).toBe('number');
    expect(result[0].confidence).toBeCloseTo(0.85, 2);
  });

  it('should handle messages with and without speaker_id', async () => {
    const session = await createTestSession();
    
    // Create messages with different speaker scenarios
    await db.insert(transcriptionMessagesTable)
      .values([
        {
          session_id: session.id,
          content: 'Message without speaker',
          confidence: 0.9,
          timestamp: new Date(Date.now() - 2000),
          is_final: true,
          speaker_id: null
        },
        {
          session_id: session.id,
          content: 'Message with speaker',
          confidence: 0.8,
          timestamp: new Date(Date.now() - 1000),
          is_final: true,
          speaker_id: 'speaker_1'
        }
      ])
      .execute();

    const input: GetTranscriptionMessagesInput = {
      session_id: session.id,
      limit: 100,
      offset: 0
    };

    const result = await getTranscriptionMessages(input);
    expect(result).toHaveLength(2);
    
    // Find messages by content to verify speaker_id handling
    const messageWithoutSpeaker = result.find(m => m.content === 'Message without speaker');
    const messageWithSpeaker = result.find(m => m.content === 'Message with speaker');
    
    expect(messageWithoutSpeaker?.speaker_id).toBeNull();
    expect(messageWithSpeaker?.speaker_id).toEqual('speaker_1');
  });

  it('should validate messages exist in database after retrieval', async () => {
    const session = await createTestSession();
    const createdMessages = await createTestMessages(session.id, 2);

    const input: GetTranscriptionMessagesInput = {
      session_id: session.id,
      limit: 100,
      offset: 0
    };

    const result = await getTranscriptionMessages(input);
    expect(result).toHaveLength(2);

    // Verify each returned message exists in database
    for (const message of result) {
      const dbMessage = await db.select()
        .from(transcriptionMessagesTable)
        .where(eq(transcriptionMessagesTable.id, message.id))
        .execute();
      
      expect(dbMessage).toHaveLength(1);
      expect(dbMessage[0].content).toEqual(message.content);
      expect(parseFloat(dbMessage[0].confidence.toString())).toEqual(message.confidence);
    }
  });
});