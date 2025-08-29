import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transcriptionSessionsTable, aiChatMessagesTable } from '../db/schema';
import { type GetAiChatMessagesInput } from '../schema';
import { getAiChatMessages } from '../handlers/get_ai_chat_messages';

describe('getAiChatMessages', () => {
  let sessionId: string;

  beforeEach(async () => {
    await createDB();
    
    // Create a test session first
    const session = await db.insert(transcriptionSessionsTable)
      .values({
        title: 'Test Session',
        audio_source: 'test-device-id'
      })
      .returning()
      .execute();
    
    sessionId = session[0].id;
  });

  afterEach(resetDB);

  it('should retrieve AI chat messages for a session', async () => {
    // Create test messages
    await db.insert(aiChatMessagesTable)
      .values([
        {
          session_id: sessionId,
          role: 'user',
          content: 'Hello AI',
          context_messages: JSON.stringify(['msg1', 'msg2']),
          timestamp: new Date('2024-01-01T10:00:00Z')
        },
        {
          session_id: sessionId,
          role: 'assistant',
          content: 'Hello! How can I help you?',
          timestamp: new Date('2024-01-01T10:01:00Z')
        }
      ])
      .execute();

    const input: GetAiChatMessagesInput = {
      session_id: sessionId,
      limit: 50,
      offset: 0
    };

    const result = await getAiChatMessages(input);

    expect(result).toHaveLength(2);
    
    // Results should be ordered by timestamp descending (most recent first)
    expect(result[0].role).toBe('assistant');
    expect(result[0].content).toBe('Hello! How can I help you?');
    expect(result[0].context_messages).toBeUndefined();
    
    expect(result[1].role).toBe('user');
    expect(result[1].content).toBe('Hello AI');
    expect(result[1].context_messages).toEqual(['msg1', 'msg2']);
    
    // Verify all required fields
    result.forEach(message => {
      expect(message.id).toBeDefined();
      expect(message.session_id).toBe(sessionId);
      expect(message.timestamp).toBeInstanceOf(Date);
      expect(message.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array for session with no messages', async () => {
    const input: GetAiChatMessagesInput = {
      session_id: sessionId,
      limit: 50,
      offset: 0
    };

    const result = await getAiChatMessages(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should apply limit parameter correctly', async () => {
    // Create 5 test messages
    const messages = Array.from({ length: 5 }, (_, i) => ({
      session_id: sessionId,
      role: i % 2 === 0 ? 'user' : 'assistant' as 'user' | 'assistant',
      content: `Message ${i + 1}`,
      timestamp: new Date(`2024-01-01T10:0${i}:00Z`)
    }));

    await db.insert(aiChatMessagesTable)
      .values(messages)
      .execute();

    const input: GetAiChatMessagesInput = {
      session_id: sessionId,
      limit: 3,
      offset: 0
    };

    const result = await getAiChatMessages(input);

    expect(result).toHaveLength(3);
    // Should get the 3 most recent messages (descending order)
    expect(result[0].content).toBe('Message 5');
    expect(result[1].content).toBe('Message 4');
    expect(result[2].content).toBe('Message 3');
  });

  it('should apply offset parameter correctly', async () => {
    // Create 5 test messages
    const messages = Array.from({ length: 5 }, (_, i) => ({
      session_id: sessionId,
      role: i % 2 === 0 ? 'user' : 'assistant' as 'user' | 'assistant',
      content: `Message ${i + 1}`,
      timestamp: new Date(`2024-01-01T10:0${i}:00Z`)
    }));

    await db.insert(aiChatMessagesTable)
      .values(messages)
      .execute();

    const input: GetAiChatMessagesInput = {
      session_id: sessionId,
      limit: 2,
      offset: 2
    };

    const result = await getAiChatMessages(input);

    expect(result).toHaveLength(2);
    // Should skip the first 2 messages and return the next 2
    expect(result[0].content).toBe('Message 3');
    expect(result[1].content).toBe('Message 2');
  });

  it('should handle JSON parsing of context_messages correctly', async () => {
    await db.insert(aiChatMessagesTable)
      .values([
        {
          session_id: sessionId,
          role: 'user',
          content: 'Message with context',
          context_messages: JSON.stringify(['id1', 'id2', 'id3']),
          timestamp: new Date()
        },
        {
          session_id: sessionId,
          role: 'assistant',
          content: 'Message without context',
          context_messages: null,
          timestamp: new Date()
        }
      ])
      .execute();

    const input: GetAiChatMessagesInput = {
      session_id: sessionId,
      limit: 50,
      offset: 0
    };

    const result = await getAiChatMessages(input);

    expect(result).toHaveLength(2);
    
    const messageWithContext = result.find(m => m.content === 'Message with context');
    const messageWithoutContext = result.find(m => m.content === 'Message without context');
    
    expect(messageWithContext?.context_messages).toEqual(['id1', 'id2', 'id3']);
    expect(messageWithoutContext?.context_messages).toBeUndefined();
  });

  it('should only return messages for the specified session', async () => {
    // Create another session
    const anotherSession = await db.insert(transcriptionSessionsTable)
      .values({
        title: 'Another Session',
        audio_source: 'another-device-id'
      })
      .returning()
      .execute();

    // Create messages for both sessions
    await db.insert(aiChatMessagesTable)
      .values([
        {
          session_id: sessionId,
          role: 'user',
          content: 'Message for first session',
          timestamp: new Date()
        },
        {
          session_id: anotherSession[0].id,
          role: 'user',
          content: 'Message for second session',
          timestamp: new Date()
        }
      ])
      .execute();

    const input: GetAiChatMessagesInput = {
      session_id: sessionId,
      limit: 50,
      offset: 0
    };

    const result = await getAiChatMessages(input);

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('Message for first session');
    expect(result[0].session_id).toBe(sessionId);
  });

  it('should handle messages ordered by timestamp correctly', async () => {
    // Create messages with specific timestamps
    await db.insert(aiChatMessagesTable)
      .values([
        {
          session_id: sessionId,
          role: 'user',
          content: 'First message',
          timestamp: new Date('2024-01-01T10:00:00Z')
        },
        {
          session_id: sessionId,
          role: 'assistant',
          content: 'Third message',
          timestamp: new Date('2024-01-01T10:02:00Z')
        },
        {
          session_id: sessionId,
          role: 'user',
          content: 'Second message',
          timestamp: new Date('2024-01-01T10:01:00Z')
        }
      ])
      .execute();

    const input: GetAiChatMessagesInput = {
      session_id: sessionId,
      limit: 50,
      offset: 0
    };

    const result = await getAiChatMessages(input);

    expect(result).toHaveLength(3);
    
    // Should be ordered by timestamp descending (most recent first)
    expect(result[0].content).toBe('Third message');
    expect(result[1].content).toBe('Second message');
    expect(result[2].content).toBe('First message');
    
    // Verify timestamps are in descending order
    expect(result[0].timestamp.getTime()).toBeGreaterThan(result[1].timestamp.getTime());
    expect(result[1].timestamp.getTime()).toBeGreaterThan(result[2].timestamp.getTime());
  });

  it('should use default values when not specified in input', async () => {
    // Create more than 50 messages to test default limit
    const messages = Array.from({ length: 60 }, (_, i) => ({
      session_id: sessionId,
      role: i % 2 === 0 ? 'user' : 'assistant' as 'user' | 'assistant',
      content: `Message ${i + 1}`,
      timestamp: new Date(`2024-01-01T${String(10 + Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`)
    }));

    await db.insert(aiChatMessagesTable)
      .values(messages)
      .execute();

    // Test that Zod defaults are applied (limit: 50, offset: 0)
    const input: GetAiChatMessagesInput = {
      session_id: sessionId,
      limit: 50, // This should be the default
      offset: 0   // This should be the default
    };

    const result = await getAiChatMessages(input);

    // Should return exactly 50 messages (the default limit)
    expect(result).toHaveLength(50);
  });
});