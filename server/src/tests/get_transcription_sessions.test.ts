import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transcriptionSessionsTable } from '../db/schema';
import { getTranscriptionSessions } from '../handlers/get_transcription_sessions';

describe('getTranscriptionSessions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no sessions exist', async () => {
    const result = await getTranscriptionSessions();

    expect(result).toEqual([]);
  });

  it('should return all transcription sessions', async () => {
    // Create test sessions
    await db.insert(transcriptionSessionsTable)
      .values([
        {
          title: 'First Session',
          audio_source: 'device-1',
          status: 'active'
        },
        {
          title: 'Second Session', 
          audio_source: 'device-2',
          status: 'paused'
        },
        {
          title: 'Third Session',
          audio_source: 'device-3',
          status: 'stopped'
        }
      ])
      .execute();

    const result = await getTranscriptionSessions();

    expect(result).toHaveLength(3);
    
    // Verify all sessions are returned
    const titles = result.map(session => session.title);
    expect(titles).toContain('First Session');
    expect(titles).toContain('Second Session');
    expect(titles).toContain('Third Session');
  });

  it('should return sessions ordered by created_at descending (newest first)', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Insert sessions with different creation times
    await db.insert(transcriptionSessionsTable)
      .values([
        {
          title: 'Oldest Session',
          audio_source: 'device-1',
          status: 'active',
          created_at: twoHoursAgo
        },
        {
          title: 'Newest Session',
          audio_source: 'device-2',
          status: 'active',
          created_at: now
        },
        {
          title: 'Middle Session',
          audio_source: 'device-3',
          status: 'active',
          created_at: oneHourAgo
        }
      ])
      .execute();

    const result = await getTranscriptionSessions();

    expect(result).toHaveLength(3);
    
    // Verify order - newest first
    expect(result[0].title).toBe('Newest Session');
    expect(result[1].title).toBe('Middle Session');
    expect(result[2].title).toBe('Oldest Session');

    // Verify timestamps are in descending order
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    expect(result[1].created_at >= result[2].created_at).toBe(true);
  });

  it('should return sessions with all required fields', async () => {
    await db.insert(transcriptionSessionsTable)
      .values({
        title: 'Test Session',
        audio_source: 'test-device',
        status: 'active'
      })
      .execute();

    const result = await getTranscriptionSessions();

    expect(result).toHaveLength(1);
    const session = result[0];

    // Verify all required fields are present
    expect(session.id).toBeDefined();
    expect(typeof session.id).toBe('string');
    expect(session.title).toBe('Test Session');
    expect(session.audio_source).toBe('test-device');
    expect(session.status).toBe('active');
    expect(session.created_at).toBeInstanceOf(Date);
    expect(session.updated_at).toBeInstanceOf(Date);
  });

  it('should return sessions with different statuses', async () => {
    await db.insert(transcriptionSessionsTable)
      .values([
        {
          title: 'Active Session',
          audio_source: 'device-1',
          status: 'active'
        },
        {
          title: 'Paused Session',
          audio_source: 'device-2',
          status: 'paused'
        },
        {
          title: 'Stopped Session',
          audio_source: 'device-3',
          status: 'stopped'
        }
      ])
      .execute();

    const result = await getTranscriptionSessions();

    expect(result).toHaveLength(3);
    
    const statuses = result.map(session => session.status);
    expect(statuses).toContain('active');
    expect(statuses).toContain('paused');
    expect(statuses).toContain('stopped');
  });

  it('should handle large number of sessions', async () => {
    // Create 50 test sessions
    const sessions = Array.from({ length: 50 }, (_, index) => ({
      title: `Session ${index + 1}`,
      audio_source: `device-${index + 1}`,
      status: 'active' as const
    }));

    await db.insert(transcriptionSessionsTable)
      .values(sessions)
      .execute();

    const result = await getTranscriptionSessions();

    expect(result).toHaveLength(50);
    
    // Verify they are ordered by creation date (newest first)
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].created_at >= result[i + 1].created_at).toBe(true);
    }
  });

  it('should handle sessions with same creation timestamp', async () => {
    const sameTimestamp = new Date();

    await db.insert(transcriptionSessionsTable)
      .values([
        {
          title: 'Session A',
          audio_source: 'device-1',
          status: 'active',
          created_at: sameTimestamp
        },
        {
          title: 'Session B',
          audio_source: 'device-2',
          status: 'active',
          created_at: sameTimestamp
        }
      ])
      .execute();

    const result = await getTranscriptionSessions();

    expect(result).toHaveLength(2);
    
    // Both sessions should be returned
    const titles = result.map(session => session.title).sort();
    expect(titles).toEqual(['Session A', 'Session B']);
  });
});