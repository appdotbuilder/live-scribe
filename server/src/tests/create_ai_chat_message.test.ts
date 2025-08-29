import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transcriptionSessionsTable, aiChatMessagesTable } from '../db/schema';
import { type CreateAiChatMessageInput } from '../schema';
import { createAiChatMessage } from '../handlers/create_ai_chat_message';
import { eq } from 'drizzle-orm';

describe('createAiChatMessage', () => {
  let testSessionId: string;

  beforeEach(async () => {
    await createDB();
    
    // Create a test session first (required for foreign key)
    const sessionResult = await db.insert(transcriptionSessionsTable)
      .values({
        title: 'Test Session',
        audio_source: 'test-device-id'
      })
      .returning()
      .execute();
    
    testSessionId = sessionResult[0].id;
  });

  afterEach(resetDB);

  it('should create an AI chat message with user role', async () => {
    const testInput: CreateAiChatMessageInput = {
      session_id: testSessionId,
      role: 'user',
      content: 'Hello, can you help me with this transcription?'
    };

    const result = await createAiChatMessage(testInput);

    // Basic field validation
    expect(result.session_id).toEqual(testSessionId);
    expect(result.role).toEqual('user');
    expect(result.content).toEqual('Hello, can you help me with this transcription?');
    expect(result.context_messages).toBeUndefined();
    expect(result.id).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create an AI chat message with assistant role', async () => {
    const testInput: CreateAiChatMessageInput = {
      session_id: testSessionId,
      role: 'assistant',
      content: 'I can help you analyze the transcription. What specifically would you like to know?'
    };

    const result = await createAiChatMessage(testInput);

    expect(result.role).toEqual('assistant');
    expect(result.content).toEqual('I can help you analyze the transcription. What specifically would you like to know?');
    expect(result.session_id).toEqual(testSessionId);
  });

  it('should create an AI chat message with context messages', async () => {
    const contextMessageIds = ['msg-123', 'msg-456', 'msg-789'];
    const testInput: CreateAiChatMessageInput = {
      session_id: testSessionId,
      role: 'assistant',
      content: 'Based on the transcription context, here is my analysis...',
      context_messages: contextMessageIds
    };

    const result = await createAiChatMessage(testInput);

    expect(result.context_messages).toEqual(contextMessageIds);
    expect(result.content).toEqual('Based on the transcription context, here is my analysis...');
    expect(result.role).toEqual('assistant');
  });

  it('should save AI chat message to database correctly', async () => {
    const testInput: CreateAiChatMessageInput = {
      session_id: testSessionId,
      role: 'user',
      content: 'Test message content'
    };

    const result = await createAiChatMessage(testInput);

    // Query the database to verify storage
    const messages = await db.select()
      .from(aiChatMessagesTable)
      .where(eq(aiChatMessagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].session_id).toEqual(testSessionId);
    expect(messages[0].role).toEqual('user');
    expect(messages[0].content).toEqual('Test message content');
    expect(messages[0].context_messages).toBeNull();
    expect(messages[0].timestamp).toBeInstanceOf(Date);
    expect(messages[0].created_at).toBeInstanceOf(Date);
  });

  it('should store and retrieve context messages as JSON', async () => {
    const contextMessageIds = ['msg-001', 'msg-002'];
    const testInput: CreateAiChatMessageInput = {
      session_id: testSessionId,
      role: 'assistant',
      content: 'Response based on context',
      context_messages: contextMessageIds
    };

    const result = await createAiChatMessage(testInput);

    // Check database storage (should be JSON string)
    const messages = await db.select()
      .from(aiChatMessagesTable)
      .where(eq(aiChatMessagesTable.id, result.id))
      .execute();

    expect(messages[0].context_messages).toEqual(JSON.stringify(contextMessageIds));
    
    // Check returned result (should be parsed array)
    expect(result.context_messages).toEqual(contextMessageIds);
  });

  it('should handle empty context messages array', async () => {
    const testInput: CreateAiChatMessageInput = {
      session_id: testSessionId,
      role: 'assistant',
      content: 'Response without context',
      context_messages: []
    };

    const result = await createAiChatMessage(testInput);

    expect(result.context_messages).toEqual([]);
    
    // Verify database storage
    const messages = await db.select()
      .from(aiChatMessagesTable)
      .where(eq(aiChatMessagesTable.id, result.id))
      .execute();

    expect(messages[0].context_messages).toEqual('[]');
  });

  it('should handle long content messages', async () => {
    const longContent = 'This is a very long AI response that might contain detailed analysis of transcription data. '.repeat(50);
    const testInput: CreateAiChatMessageInput = {
      session_id: testSessionId,
      role: 'assistant',
      content: longContent
    };

    const result = await createAiChatMessage(testInput);

    expect(result.content).toEqual(longContent);
    expect(result.content.length).toBeGreaterThan(1000);
  });

  it('should create multiple messages for the same session', async () => {
    const message1Input: CreateAiChatMessageInput = {
      session_id: testSessionId,
      role: 'user',
      content: 'First message'
    };

    const message2Input: CreateAiChatMessageInput = {
      session_id: testSessionId,
      role: 'assistant',
      content: 'Second message'
    };

    const result1 = await createAiChatMessage(message1Input);
    const result2 = await createAiChatMessage(message2Input);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.session_id).toEqual(testSessionId);
    expect(result2.session_id).toEqual(testSessionId);
    expect(result1.role).toEqual('user');
    expect(result2.role).toEqual('assistant');

    // Verify both messages are in database
    const allMessages = await db.select()
      .from(aiChatMessagesTable)
      .where(eq(aiChatMessagesTable.session_id, testSessionId))
      .execute();

    expect(allMessages).toHaveLength(2);
  });

  it('should handle messages with special characters and Unicode', async () => {
    const testInput: CreateAiChatMessageInput = {
      session_id: testSessionId,
      role: 'user',
      content: 'Special chars: áéíóú, 中文, 🚀, "quotes", \'apostrophes\', & symbols!'
    };

    const result = await createAiChatMessage(testInput);

    expect(result.content).toEqual('Special chars: áéíóú, 中文, 🚀, "quotes", \'apostrophes\', & symbols!');
    
    // Verify database storage
    const messages = await db.select()
      .from(aiChatMessagesTable)
      .where(eq(aiChatMessagesTable.id, result.id))
      .execute();

    expect(messages[0].content).toEqual(testInput.content);
  });

  it('should fail when session_id does not exist', async () => {
    const testInput: CreateAiChatMessageInput = {
      session_id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID format but non-existent
      role: 'user',
      content: 'This should fail'
    };

    await expect(createAiChatMessage(testInput)).rejects.toThrow(/foreign key constraint|violates foreign key/i);
  });
});