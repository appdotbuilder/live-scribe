import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transcriptionSessionsTable } from '../db/schema';
import { type CreateTranscriptionSessionInput } from '../schema';
import { createTranscriptionSession } from '../handlers/create_transcription_session';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateTranscriptionSessionInput = {
  title: 'Test Transcription Session',
  audio_source: 'microphone-device-123'
};

describe('createTranscriptionSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a transcription session', async () => {
    const result = await createTranscriptionSession(testInput);

    // Basic field validation
    expect(result.title).toEqual('Test Transcription Session');
    expect(result.audio_source).toEqual('microphone-device-123');
    expect(result.status).toEqual('active');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('string');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save transcription session to database', async () => {
    const result = await createTranscriptionSession(testInput);

    // Query using proper drizzle syntax
    const sessions = await db.select()
      .from(transcriptionSessionsTable)
      .where(eq(transcriptionSessionsTable.id, result.id))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].title).toEqual('Test Transcription Session');
    expect(sessions[0].audio_source).toEqual('microphone-device-123');
    expect(sessions[0].status).toEqual('active');
    expect(sessions[0].created_at).toBeInstanceOf(Date);
    expect(sessions[0].updated_at).toBeInstanceOf(Date);
  });

  it('should set default status to active', async () => {
    const result = await createTranscriptionSession(testInput);

    expect(result.status).toEqual('active');
  });

  it('should handle different audio sources', async () => {
    const inputWithDifferentSource: CreateTranscriptionSessionInput = {
      title: 'Audio Test Session',
      audio_source: 'headset-device-456'
    };

    const result = await createTranscriptionSession(inputWithDifferentSource);

    expect(result.title).toEqual('Audio Test Session');
    expect(result.audio_source).toEqual('headset-device-456');
    expect(result.status).toEqual('active');
  });

  it('should handle long titles', async () => {
    const inputWithLongTitle: CreateTranscriptionSessionInput = {
      title: 'This is a very long transcription session title that contains multiple words and should be handled properly',
      audio_source: 'bluetooth-headset-789'
    };

    const result = await createTranscriptionSession(inputWithLongTitle);

    expect(result.title).toEqual(inputWithLongTitle.title);
    expect(result.audio_source).toEqual('bluetooth-headset-789');
  });

  it('should create multiple sessions independently', async () => {
    const firstSession = await createTranscriptionSession({
      title: 'First Session',
      audio_source: 'device-1'
    });

    const secondSession = await createTranscriptionSession({
      title: 'Second Session',
      audio_source: 'device-2'
    });

    // Verify both sessions exist and are different
    expect(firstSession.id).not.toEqual(secondSession.id);
    expect(firstSession.title).toEqual('First Session');
    expect(secondSession.title).toEqual('Second Session');

    // Verify both are saved in database
    const allSessions = await db.select()
      .from(transcriptionSessionsTable)
      .execute();

    expect(allSessions).toHaveLength(2);
  });

  it('should generate unique UUIDs for each session', async () => {
    const sessions = await Promise.all([
      createTranscriptionSession({ title: 'Session 1', audio_source: 'device-1' }),
      createTranscriptionSession({ title: 'Session 2', audio_source: 'device-2' }),
      createTranscriptionSession({ title: 'Session 3', audio_source: 'device-3' })
    ]);

    const ids = sessions.map(s => s.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toEqual(3);
    ids.forEach(id => {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  it('should handle special characters in title', async () => {
    const inputWithSpecialChars: CreateTranscriptionSessionInput = {
      title: 'Meeting 2024-01-15 @ 10:30 AM (Client Discussion) #Important',
      audio_source: 'conference-mic-101'
    };

    const result = await createTranscriptionSession(inputWithSpecialChars);

    expect(result.title).toEqual(inputWithSpecialChars.title);
    expect(result.audio_source).toEqual('conference-mic-101');
  });
});