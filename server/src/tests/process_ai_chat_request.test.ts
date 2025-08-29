import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { type AiChatMessage, type TranscriptionMessage } from '../schema';
import { processAiChatRequest } from '../handlers/process_ai_chat_request';

// Helper function to create test transcription messages
function createTranscriptionMessage(
  id: string,
  sessionId: string,
  content: string,
  isFinal: boolean = true,
  speakerId?: string,
  timestamp?: Date
): TranscriptionMessage {
  return {
    id,
    session_id: sessionId,
    content,
    confidence: 0.95,
    timestamp: timestamp || new Date(),
    is_final: isFinal,
    speaker_id: speakerId || null,
    created_at: new Date()
  };
}

// Helper function to create test AI chat messages
function createUserMessage(sessionId: string, content: string): AiChatMessage {
  return {
    id: crypto.randomUUID(),
    session_id: sessionId,
    role: 'user',
    content,
    context_messages: [],
    timestamp: new Date(),
    created_at: new Date()
  };
}

describe('processAiChatRequest', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const sessionId = 'test-session-123';

  it('should process basic user message and return AI response', async () => {
    const userMessage = createUserMessage(sessionId, 'What is being discussed?');
    const contextMessages: TranscriptionMessage[] = [
      createTranscriptionMessage('msg1', sessionId, 'Hello everyone, welcome to our meeting about project planning.'),
      createTranscriptionMessage('msg2', sessionId, 'We need to discuss the budget and timeline for the next quarter.')
    ];

    const result = await processAiChatRequest(userMessage, contextMessages);

    expect(result.id).toBeDefined();
    expect(result.session_id).toEqual(sessionId);
    expect(result.role).toEqual('assistant');
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.context_messages).toEqual(['msg1', 'msg2']);
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should generate summary when asked', async () => {
    const userMessage = createUserMessage(sessionId, 'Can you summarize what was said?');
    const contextMessages: TranscriptionMessage[] = [
      createTranscriptionMessage('msg1', sessionId, 'We discussed the quarterly budget planning. The marketing team needs additional funding.'),
      createTranscriptionMessage('msg2', sessionId, 'The development team is on track with current milestones. We should review priorities next week.')
    ];

    const result = await processAiChatRequest(userMessage, contextMessages);

    expect(result.content).toContain('summary');
    expect(result.content).toContain('budget');
    expect(result.context_messages).toHaveLength(2);
  });

  it('should extract key points when requested', async () => {
    const userMessage = createUserMessage(sessionId, 'What are the key points discussed?');
    const contextMessages: TranscriptionMessage[] = [
      createTranscriptionMessage('msg1', sessionId, 'Budget planning is critical for success. Marketing needs resources.'),
      createTranscriptionMessage('msg2', sessionId, 'Development timeline shows good progress. Budget constraints remain.')
    ];

    const result = await processAiChatRequest(userMessage, contextMessages);

    expect(result.content).toContain('Key topics');
    expect(result.content).toContain('budget');
    expect(result.context_messages).toHaveLength(2);
  });

  it('should analyze speakers when asked', async () => {
    const userMessage = createUserMessage(sessionId, 'Who are the speakers?');
    const contextMessages: TranscriptionMessage[] = [
      createTranscriptionMessage('msg1', sessionId, 'Hello from speaker one', true, 'speaker_1'),
      createTranscriptionMessage('msg2', sessionId, 'This is speaker two responding', true, 'speaker_2'),
      createTranscriptionMessage('msg3', sessionId, 'Speaker one again', true, 'speaker_1')
    ];

    const result = await processAiChatRequest(userMessage, contextMessages);

    expect(result.content).toContain('2 different speaker');
    expect(result.context_messages).toHaveLength(3);
  });

  it('should calculate duration when asked about timing', async () => {
    const userMessage = createUserMessage(sessionId, 'How long has this been going?');
    const startTime = new Date('2024-01-01T10:00:00Z');
    const endTime = new Date('2024-01-01T10:05:30Z'); // 5.5 minutes later
    
    const contextMessages: TranscriptionMessage[] = [
      createTranscriptionMessage('msg1', sessionId, 'Starting the meeting now', true, undefined, startTime),
      createTranscriptionMessage('msg2', sessionId, 'Continuing discussion', true, undefined, endTime)
    ];

    const result = await processAiChatRequest(userMessage, contextMessages);

    expect(result.content).toContain('5 minutes');
    expect(result.context_messages).toHaveLength(2);
  });

  it('should search for specific content in transcription', async () => {
    const userMessage = createUserMessage(sessionId, 'What was said about marketing?');
    const contextMessages: TranscriptionMessage[] = [
      createTranscriptionMessage('msg1', sessionId, 'We need to focus on development first.'),
      createTranscriptionMessage('msg2', sessionId, 'Marketing strategy should align with our budget constraints.')
    ];

    const result = await processAiChatRequest(userMessage, contextMessages);

    expect(result.content).toContain('Marketing strategy should align with our budget constraints');
    expect(result.context_messages).toHaveLength(2);
  });

  it('should handle empty transcription context gracefully', async () => {
    const userMessage = createUserMessage(sessionId, 'What was discussed?');
    const contextMessages: TranscriptionMessage[] = [];

    const result = await processAiChatRequest(userMessage, contextMessages);

    expect(result.content).toContain('don\'t have any transcription content');
    expect(result.context_messages).toHaveLength(0);
  });

  it('should handle non-final transcription messages', async () => {
    const userMessage = createUserMessage(sessionId, 'Summarize the discussion');
    const contextMessages: TranscriptionMessage[] = [
      createTranscriptionMessage('msg1', sessionId, 'This is interim text', false), // Not final
      createTranscriptionMessage('msg2', sessionId, 'This is final text about project planning.', true)
    ];

    const result = await processAiChatRequest(userMessage, contextMessages);

    expect(result.content).toContain('project planning');
    expect(result.content).not.toContain('interim text');
    expect(result.context_messages).toHaveLength(2);
  });

  it('should handle general questions about unrelated topics', async () => {
    const userMessage = createUserMessage(sessionId, 'What is the weather like today?');
    const contextMessages: TranscriptionMessage[] = [
      createTranscriptionMessage('msg1', sessionId, 'We are discussing project timelines.')
    ];

    const result = await processAiChatRequest(userMessage, contextMessages);

    expect(result.content).toContain('Could you be more specific');
    expect(result.content).toContain('summaries, key points, speaker analysis');
    expect(result.context_messages).toHaveLength(1);
  });

  it('should handle messages with no speakers identified', async () => {
    const userMessage = createUserMessage(sessionId, 'Who is speaking?');
    const contextMessages: TranscriptionMessage[] = [
      createTranscriptionMessage('msg1', sessionId, 'Anonymous speaker content', true, undefined),
      createTranscriptionMessage('msg2', sessionId, 'More anonymous content', true, undefined)
    ];

    const result = await processAiChatRequest(userMessage, contextMessages);

    expect(result.content).toContain('No speaker identification available');
    expect(result.context_messages).toHaveLength(2);
  });

  it('should throw error for empty user message content', async () => {
    const userMessage = createUserMessage(sessionId, '   '); // Empty/whitespace only
    const contextMessages: TranscriptionMessage[] = [];

    await expect(processAiChatRequest(userMessage, contextMessages)).rejects.toThrow(/cannot be empty/i);
  });

  it('should throw error for non-user role messages', async () => {
    const assistantMessage: AiChatMessage = {
      id: crypto.randomUUID(),
      session_id: sessionId,
      role: 'assistant', // Invalid for input
      content: 'This should fail',
      context_messages: [],
      timestamp: new Date(),
      created_at: new Date()
    };
    const contextMessages: TranscriptionMessage[] = [];

    await expect(processAiChatRequest(assistantMessage, contextMessages)).rejects.toThrow(/must have role "user"/i);
  });

  it('should handle context with mixed final and interim messages correctly', async () => {
    const userMessage = createUserMessage(sessionId, 'What are the key topics?');
    const contextMessages: TranscriptionMessage[] = [
      createTranscriptionMessage('msg1', sessionId, 'Interim discussion about budgets', false),
      createTranscriptionMessage('msg2', sessionId, 'Final discussion about quarterly planning and resource allocation', true),
      createTranscriptionMessage('msg3', sessionId, 'Interim mention of marketing', false),
      createTranscriptionMessage('msg4', sessionId, 'Final thoughts on development priorities', true)
    ];

    const result = await processAiChatRequest(userMessage, contextMessages);

    // Should only process final messages for key topic extraction
    expect(result.content).toContain('Key topics');
    // The algorithm should find frequent words from final messages
    expect(result.content).toMatch(/quarterly|planning|development|discussion/i); // From final messages
    expect(result.context_messages).toHaveLength(4); // All messages included in context_messages
  });

  it('should generate unique response IDs for each request', async () => {
    const userMessage = createUserMessage(sessionId, 'Test question');
    const contextMessages: TranscriptionMessage[] = [];

    const result1 = await processAiChatRequest(userMessage, contextMessages);
    const result2 = await processAiChatRequest(userMessage, contextMessages);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.id).toBeDefined();
    expect(result2.id).toBeDefined();
  });

  it('should handle complex timing calculations correctly', async () => {
    const userMessage = createUserMessage(sessionId, 'How long was the duration?');
    const startTime = new Date('2024-01-01T10:00:00Z');
    const midTime = new Date('2024-01-01T10:15:30Z');
    const endTime = new Date('2024-01-01T10:25:45Z'); // 25 minutes and 45 seconds total
    
    const contextMessages: TranscriptionMessage[] = [
      createTranscriptionMessage('msg1', sessionId, 'Meeting started', true, undefined, startTime),
      createTranscriptionMessage('msg2', sessionId, 'Mid meeting discussion', true, undefined, midTime),
      createTranscriptionMessage('msg3', sessionId, 'Meeting ending', true, undefined, endTime)
    ];

    const result = await processAiChatRequest(userMessage, contextMessages);

    expect(result.content).toContain('25 minutes'); // Should calculate from first to last message
    expect(result.context_messages).toHaveLength(3);
  });
});