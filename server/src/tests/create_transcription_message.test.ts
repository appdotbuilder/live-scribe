import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transcriptionMessagesTable, transcriptionSessionsTable } from '../db/schema';
import { type CreateTranscriptionMessageInput } from '../schema';
import { createTranscriptionMessage } from '../handlers/create_transcription_message';
import { eq } from 'drizzle-orm';

// Helper to create a test session first
const createTestSession = async () => {
  const result = await db.insert(transcriptionSessionsTable)
    .values({
      title: 'Test Session',
      audio_source: 'test-device-123',
      status: 'active'
    })
    .returning()
    .execute();
  
  return result[0];
};

// Test input with all required fields
const testInput: CreateTranscriptionMessageInput = {
  session_id: '', // Will be set by individual tests
  content: 'Hello, this is a test transcription message',
  confidence: 0.95,
  is_final: true,
  speaker_id: 'speaker-123'
};

describe('createTranscriptionMessage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a transcription message', async () => {
    // Create prerequisite session
    const session = await createTestSession();
    
    const input = {
      ...testInput,
      session_id: session.id
    };

    const result = await createTranscriptionMessage(input);

    // Basic field validation
    expect(result.session_id).toEqual(session.id);
    expect(result.content).toEqual('Hello, this is a test transcription message');
    expect(result.confidence).toEqual(0.95);
    expect(result.is_final).toEqual(true);
    expect(result.speaker_id).toEqual('speaker-123');
    expect(result.id).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save transcription message to database', async () => {
    // Create prerequisite session
    const session = await createTestSession();
    
    const input = {
      ...testInput,
      session_id: session.id
    };

    const result = await createTranscriptionMessage(input);

    // Query database to verify message was saved
    const messages = await db.select()
      .from(transcriptionMessagesTable)
      .where(eq(transcriptionMessagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].session_id).toEqual(session.id);
    expect(messages[0].content).toEqual('Hello, this is a test transcription message');
    expect(messages[0].confidence).toEqual(0.95);
    expect(messages[0].is_final).toEqual(true);
    expect(messages[0].speaker_id).toEqual('speaker-123');
    expect(messages[0].timestamp).toBeInstanceOf(Date);
    expect(messages[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle messages without speaker_id', async () => {
    // Create prerequisite session
    const session = await createTestSession();
    
    const input: CreateTranscriptionMessageInput = {
      session_id: session.id,
      content: 'Message without speaker',
      confidence: 0.87,
      is_final: false
      // speaker_id is optional and omitted
    };

    const result = await createTranscriptionMessage(input);

    expect(result.session_id).toEqual(session.id);
    expect(result.content).toEqual('Message without speaker');
    expect(result.confidence).toEqual(0.87);
    expect(result.is_final).toEqual(false);
    expect(result.speaker_id).toBeNull();
    expect(result.id).toBeDefined();
  });

  it('should handle interim transcription messages', async () => {
    // Create prerequisite session
    const session = await createTestSession();
    
    const input: CreateTranscriptionMessageInput = {
      session_id: session.id,
      content: 'This is an interim result...',
      confidence: 0.72,
      is_final: false,
      speaker_id: 'speaker-456'
    };

    const result = await createTranscriptionMessage(input);

    expect(result.is_final).toEqual(false);
    expect(result.confidence).toEqual(0.72);
    expect(result.content).toEqual('This is an interim result...');
  });

  it('should handle low confidence scores', async () => {
    // Create prerequisite session
    const session = await createTestSession();
    
    const input: CreateTranscriptionMessageInput = {
      session_id: session.id,
      content: 'Unclear audio transcription',
      confidence: 0.15,
      is_final: true,
      speaker_id: null
    };

    const result = await createTranscriptionMessage(input);

    expect(result.confidence).toEqual(0.15);
    expect(result.speaker_id).toBeNull();
  });

  it('should set timestamp to current time', async () => {
    // Create prerequisite session
    const session = await createTestSession();
    
    const beforeCreation = new Date();
    
    const input = {
      ...testInput,
      session_id: session.id
    };

    const result = await createTranscriptionMessage(input);
    
    const afterCreation = new Date();

    // Timestamp should be between before and after creation
    expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.timestamp.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
  });

  it('should throw error for non-existent session', async () => {
    const nonExistentSessionId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    
    const input: CreateTranscriptionMessageInput = {
      session_id: nonExistentSessionId,
      content: 'This should fail',
      confidence: 0.95,
      is_final: true,
      speaker_id: 'speaker-123'
    };

    await expect(createTranscriptionMessage(input)).rejects.toThrow(
      /Transcription session with ID .* not found/i
    );
  });

  it('should create multiple messages for same session', async () => {
    // Create prerequisite session
    const session = await createTestSession();
    
    // Create first message
    const input1: CreateTranscriptionMessageInput = {
      session_id: session.id,
      content: 'First message',
      confidence: 0.95,
      is_final: true,
      speaker_id: 'speaker-1'
    };

    // Create second message
    const input2: CreateTranscriptionMessageInput = {
      session_id: session.id,
      content: 'Second message',
      confidence: 0.88,
      is_final: false,
      speaker_id: 'speaker-2'
    };

    const result1 = await createTranscriptionMessage(input1);
    const result2 = await createTranscriptionMessage(input2);

    // Both should reference the same session
    expect(result1.session_id).toEqual(session.id);
    expect(result2.session_id).toEqual(session.id);
    
    // But have different IDs and content
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.content).toEqual('First message');
    expect(result2.content).toEqual('Second message');

    // Verify both are saved in database
    const messages = await db.select()
      .from(transcriptionMessagesTable)
      .where(eq(transcriptionMessagesTable.session_id, session.id))
      .execute();

    expect(messages).toHaveLength(2);
  });

  it('should handle edge case confidence values', async () => {
    // Create prerequisite session
    const session = await createTestSession();
    
    // Test minimum confidence (0.0)
    const inputMin: CreateTranscriptionMessageInput = {
      session_id: session.id,
      content: 'Very uncertain transcription',
      confidence: 0.0,
      is_final: true
    };

    const resultMin = await createTranscriptionMessage(inputMin);
    expect(resultMin.confidence).toEqual(0.0);

    // Test maximum confidence (1.0)
    const inputMax: CreateTranscriptionMessageInput = {
      session_id: session.id,
      content: 'Perfect transcription',
      confidence: 1.0,
      is_final: true
    };

    const resultMax = await createTranscriptionMessage(inputMax);
    expect(resultMax.confidence).toEqual(1.0);
  });
});