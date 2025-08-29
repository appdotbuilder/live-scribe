import { z } from 'zod';

// Transcription session schema
export const transcriptionSessionSchema = z.object({
  id: z.string(), // UUID for session identification
  title: z.string(),
  status: z.enum(['active', 'paused', 'stopped']),
  audio_source: z.string(), // Selected audio input device
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type TranscriptionSession = z.infer<typeof transcriptionSessionSchema>;

// Real-time transcription message schema
export const transcriptionMessageSchema = z.object({
  id: z.string(), // UUID for message identification
  session_id: z.string(), // Foreign key to session
  content: z.string(), // Transcribed text content
  confidence: z.number().min(0).max(1), // Transcription confidence score
  timestamp: z.coerce.date(), // When this text was transcribed
  is_final: z.boolean(), // Whether this is a final or interim result
  speaker_id: z.string().nullable(), // Optional speaker identification
  created_at: z.coerce.date()
});

export type TranscriptionMessage = z.infer<typeof transcriptionMessageSchema>;

// AI chat message schema
export const aiChatMessageSchema = z.object({
  id: z.string(), // UUID for message identification
  session_id: z.string(), // Foreign key to session
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  context_messages: z.array(z.string()).optional(), // IDs of transcription messages used as context
  timestamp: z.coerce.date(),
  created_at: z.coerce.date()
});

export type AiChatMessage = z.infer<typeof aiChatMessageSchema>;

// Audio device schema
export const audioDeviceSchema = z.object({
  device_id: z.string(),
  label: z.string(),
  kind: z.enum(['audioinput', 'audiooutput']),
  group_id: z.string().nullable()
});

export type AudioDevice = z.infer<typeof audioDeviceSchema>;

// Input schemas for creating entities

export const createTranscriptionSessionInputSchema = z.object({
  title: z.string().min(1).max(255),
  audio_source: z.string().min(1)
});

export type CreateTranscriptionSessionInput = z.infer<typeof createTranscriptionSessionInputSchema>;

export const updateTranscriptionSessionInputSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(255).optional(),
  status: z.enum(['active', 'paused', 'stopped']).optional(),
  audio_source: z.string().optional()
});

export type UpdateTranscriptionSessionInput = z.infer<typeof updateTranscriptionSessionInputSchema>;

export const createTranscriptionMessageInputSchema = z.object({
  session_id: z.string(),
  content: z.string().min(1),
  confidence: z.number().min(0).max(1),
  is_final: z.boolean(),
  speaker_id: z.string().nullable().optional()
});

export type CreateTranscriptionMessageInput = z.infer<typeof createTranscriptionMessageInputSchema>;

export const createAiChatMessageInputSchema = z.object({
  session_id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
  context_messages: z.array(z.string()).optional()
});

export type CreateAiChatMessageInput = z.infer<typeof createAiChatMessageInputSchema>;

// Query schemas for filtering and pagination

export const getTranscriptionMessagesInputSchema = z.object({
  session_id: z.string(),
  limit: z.number().int().positive().max(1000).default(100),
  offset: z.number().int().nonnegative().default(0),
  is_final: z.boolean().optional()
});

export type GetTranscriptionMessagesInput = z.infer<typeof getTranscriptionMessagesInputSchema>;

export const getAiChatMessagesInputSchema = z.object({
  session_id: z.string(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0)
});

export type GetAiChatMessagesInput = z.infer<typeof getAiChatMessagesInputSchema>;

// Real-time update schemas for WebSocket events

export const transcriptionUpdateSchema = z.object({
  type: z.literal('transcription_update'),
  session_id: z.string(),
  message: transcriptionMessageSchema
});

export type TranscriptionUpdate = z.infer<typeof transcriptionUpdateSchema>;

export const sessionStatusUpdateSchema = z.object({
  type: z.literal('session_status_update'),
  session_id: z.string(),
  status: z.enum(['active', 'paused', 'stopped'])
});

export type SessionStatusUpdate = z.infer<typeof sessionStatusUpdateSchema>;

export const aiChatUpdateSchema = z.object({
  type: z.literal('ai_chat_update'),
  session_id: z.string(),
  message: aiChatMessageSchema
});

export type AiChatUpdate = z.infer<typeof aiChatUpdateSchema>;

// Combined real-time event schema
export const realTimeEventSchema = z.union([
  transcriptionUpdateSchema,
  sessionStatusUpdateSchema,
  aiChatUpdateSchema
]);

export type RealTimeEvent = z.infer<typeof realTimeEventSchema>;