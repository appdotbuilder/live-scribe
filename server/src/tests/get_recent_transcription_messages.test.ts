import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transcriptionSessionsTable, transcriptionMessagesTable } from '../db/schema';
import { getRecentTranscriptionMessages } from '../handlers/get_recent_transcription_messages';

describe('getRecentTranscriptionMessages', () => {
  let testSessionId: string;
  
  beforeEach(async () => {
    await createDB();
    
    // Create a test session
    const sessionResult = await db.insert(transcriptionSessionsTable)
      .values({
        title: 'Test Session',
        audio_source: 'test-device'
      })
      .returning()
      .execute();
    
    testSessionId = sessionResult[0].id;
  });

  afterEach(resetDB);

  it('should return recent final messages within time window', async () => {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
    
    // Create recent final message
    await db.insert(transcriptionMessagesTable)
      .values({
        session_id: testSessionId,
        content: 'Recent final message',
        confidence: 0.95,
        timestamp: twoMinutesAgo,
        is_final: true,
        speaker_id: 'speaker1'
      })
      .execute();
    
    // Create old final message (should be excluded)
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    await db.insert(transcriptionMessagesTable)
      .values({
        session_id: testSessionId,
        content: 'Old final message',
        confidence: 0.88,
        timestamp: tenMinutesAgo,
        is_final: true,
        speaker_id: 'speaker2'
      })
      .execute();

    const result = await getRecentTranscriptionMessages(testSessionId, 5);

    expect(result).toHaveLength(1);
    expect(result[0].content).toEqual('Recent final message');
    expect(result[0].confidence).toEqual(0.95);
    expect(typeof result[0].confidence).toEqual('number');
    expect(result[0].is_final).toBe(true);
    expect(result[0].speaker_id).toEqual('speaker1');
  });

  it('should exclude interim messages', async () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
    
    // Create recent interim message (should be excluded)
    await db.insert(transcriptionMessagesTable)
      .values({
        session_id: testSessionId,
        content: 'Recent interim message',
        confidence: 0.75,
        timestamp: oneMinuteAgo,
        is_final: false,
        speaker_id: null
      })
      .execute();
    
    // Create recent final message (should be included)
    await db.insert(transcriptionMessagesTable)
      .values({
        session_id: testSessionId,
        content: 'Recent final message',
        confidence: 0.92,
        timestamp: oneMinuteAgo,
        is_final: true,
        speaker_id: 'speaker1'
      })
      .execute();

    const result = await getRecentTranscriptionMessages(testSessionId, 5);

    expect(result).toHaveLength(1);
    expect(result[0].content).toEqual('Recent final message');
    expect(result[0].is_final).toBe(true);
  });

  it('should respect custom time window', async () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
    const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000);
    
    // Create message 1 minute ago
    await db.insert(transcriptionMessagesTable)
      .values({
        session_id: testSessionId,
        content: 'Message 1 minute ago',
        confidence: 0.89,
        timestamp: oneMinuteAgo,
        is_final: true,
        speaker_id: 'speaker1'
      })
      .execute();
    
    // Create message 3 minutes ago
    await db.insert(transcriptionMessagesTable)
      .values({
        session_id: testSessionId,
        content: 'Message 3 minutes ago',
        confidence: 0.91,
        timestamp: threeMinutesAgo,
        is_final: true,
        speaker_id: 'speaker2'
      })
      .execute();

    // Test with 2-minute window (should only get 1-minute-ago message)
    const result2Min = await getRecentTranscriptionMessages(testSessionId, 2);
    expect(result2Min).toHaveLength(1);
    expect(result2Min[0].content).toEqual('Message 1 minute ago');

    // Test with 5-minute window (should get both messages)
    const result5Min = await getRecentTranscriptionMessages(testSessionId, 5);
    expect(result5Min).toHaveLength(2);
  });

  it('should return messages ordered by timestamp descending', async () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
    const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000);
    
    // Insert messages in non-chronological order
    await db.insert(transcriptionMessagesTable)
      .values([
        {
          session_id: testSessionId,
          content: 'Middle message',
          confidence: 0.85,
          timestamp: twoMinutesAgo,
          is_final: true,
          speaker_id: 'speaker1'
        },
        {
          session_id: testSessionId,
          content: 'Newest message',
          confidence: 0.92,
          timestamp: oneMinuteAgo,
          is_final: true,
          speaker_id: 'speaker2'
        },
        {
          session_id: testSessionId,
          content: 'Oldest message',
          confidence: 0.88,
          timestamp: threeMinutesAgo,
          is_final: true,
          speaker_id: 'speaker3'
        }
      ])
      .execute();

    const result = await getRecentTranscriptionMessages(testSessionId, 5);

    expect(result).toHaveLength(3);
    expect(result[0].content).toEqual('Newest message');
    expect(result[1].content).toEqual('Middle message');
    expect(result[2].content).toEqual('Oldest message');
  });

  it('should filter by session ID correctly', async () => {
    // Create another test session
    const otherSessionResult = await db.insert(transcriptionSessionsTable)
      .values({
        title: 'Other Session',
        audio_source: 'other-device'
      })
      .returning()
      .execute();
    
    const otherSessionId = otherSessionResult[0].id;
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
    
    // Create message in test session
    await db.insert(transcriptionMessagesTable)
      .values({
        session_id: testSessionId,
        content: 'Message in test session',
        confidence: 0.89,
        timestamp: oneMinuteAgo,
        is_final: true,
        speaker_id: 'speaker1'
      })
      .execute();
    
    // Create message in other session
    await db.insert(transcriptionMessagesTable)
      .values({
        session_id: otherSessionId,
        content: 'Message in other session',
        confidence: 0.91,
        timestamp: oneMinuteAgo,
        is_final: true,
        speaker_id: 'speaker2'
      })
      .execute();

    const result = await getRecentTranscriptionMessages(testSessionId, 5);

    expect(result).toHaveLength(1);
    expect(result[0].content).toEqual('Message in test session');
    expect(result[0].session_id).toEqual(testSessionId);
  });

  it('should return empty array when no messages found', async () => {
    const result = await getRecentTranscriptionMessages(testSessionId, 5);
    expect(result).toHaveLength(0);
  });

  it('should handle null speaker_id correctly', async () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
    
    await db.insert(transcriptionMessagesTable)
      .values({
        session_id: testSessionId,
        content: 'Message without speaker',
        confidence: 0.87,
        timestamp: oneMinuteAgo,
        is_final: true,
        speaker_id: null
      })
      .execute();

    const result = await getRecentTranscriptionMessages(testSessionId, 5);

    expect(result).toHaveLength(1);
    expect(result[0].content).toEqual('Message without speaker');
    expect(result[0].speaker_id).toBeNull();
  });

  it('should convert confidence to number correctly', async () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
    
    await db.insert(transcriptionMessagesTable)
      .values({
        session_id: testSessionId,
        content: 'Test confidence conversion',
        confidence: 0.7836,
        timestamp: oneMinuteAgo,
        is_final: true,
        speaker_id: 'speaker1'
      })
      .execute();

    const result = await getRecentTranscriptionMessages(testSessionId, 5);

    expect(result).toHaveLength(1);
    expect(typeof result[0].confidence).toEqual('number');
    expect(result[0].confidence).toBeCloseTo(0.7836, 4);
  });

  it('should use default 5-minute window when no minutes parameter provided', async () => {
    const now = new Date();
    const fourMinutesAgo = new Date(now.getTime() - 4 * 60 * 1000);
    const sixMinutesAgo = new Date(now.getTime() - 6 * 60 * 1000);
    
    // Create message within default window
    await db.insert(transcriptionMessagesTable)
      .values({
        session_id: testSessionId,
        content: 'Within default window',
        confidence: 0.89,
        timestamp: fourMinutesAgo,
        is_final: true,
        speaker_id: 'speaker1'
      })
      .execute();
    
    // Create message outside default window
    await db.insert(transcriptionMessagesTable)
      .values({
        session_id: testSessionId,
        content: 'Outside default window',
        confidence: 0.91,
        timestamp: sixMinutesAgo,
        is_final: true,
        speaker_id: 'speaker2'
      })
      .execute();

    // Call without minutes parameter (should use default 5 minutes)
    const result = await getRecentTranscriptionMessages(testSessionId);

    expect(result).toHaveLength(1);
    expect(result[0].content).toEqual('Within default window');
  });
});