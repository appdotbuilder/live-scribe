import { pgTable, text, timestamp, uuid, boolean, real, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const sessionStatusEnum = pgEnum('session_status', ['active', 'paused', 'stopped']);
export const chatRoleEnum = pgEnum('chat_role', ['user', 'assistant']);

// Transcription sessions table
export const transcriptionSessionsTable = pgTable('transcription_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  status: sessionStatusEnum('status').notNull().default('active'),
  audio_source: text('audio_source').notNull(), // Selected audio input device ID
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Real-time transcription messages table
export const transcriptionMessagesTable = pgTable('transcription_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  session_id: uuid('session_id').notNull().references(() => transcriptionSessionsTable.id, { onDelete: 'cascade' }),
  content: text('content').notNull(), // Transcribed text content
  confidence: real('confidence').notNull(), // Transcription confidence score (0.0 to 1.0)
  timestamp: timestamp('timestamp').notNull(), // When this text was transcribed
  is_final: boolean('is_final').notNull().default(false), // Whether this is final or interim result
  speaker_id: text('speaker_id'), // Optional speaker identification (nullable)
  created_at: timestamp('created_at').defaultNow().notNull()
});

// AI chat messages table
export const aiChatMessagesTable = pgTable('ai_chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  session_id: uuid('session_id').notNull().references(() => transcriptionSessionsTable.id, { onDelete: 'cascade' }),
  role: chatRoleEnum('role').notNull(),
  content: text('content').notNull(),
  context_messages: text('context_messages'), // JSON array of transcription message IDs used as context
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Define relationships
export const transcriptionSessionsRelations = relations(transcriptionSessionsTable, ({ many }) => ({
  transcriptionMessages: many(transcriptionMessagesTable),
  aiChatMessages: many(aiChatMessagesTable),
}));

export const transcriptionMessagesRelations = relations(transcriptionMessagesTable, ({ one }) => ({
  session: one(transcriptionSessionsTable, {
    fields: [transcriptionMessagesTable.session_id],
    references: [transcriptionSessionsTable.id],
  }),
}));

export const aiChatMessagesRelations = relations(aiChatMessagesTable, ({ one }) => ({
  session: one(transcriptionSessionsTable, {
    fields: [aiChatMessagesTable.session_id],
    references: [transcriptionSessionsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type TranscriptionSession = typeof transcriptionSessionsTable.$inferSelect;
export type NewTranscriptionSession = typeof transcriptionSessionsTable.$inferInsert;

export type TranscriptionMessage = typeof transcriptionMessagesTable.$inferSelect;
export type NewTranscriptionMessage = typeof transcriptionMessagesTable.$inferInsert;

export type AiChatMessage = typeof aiChatMessagesTable.$inferSelect;
export type NewAiChatMessage = typeof aiChatMessagesTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  transcriptionSessions: transcriptionSessionsTable,
  transcriptionMessages: transcriptionMessagesTable,
  aiChatMessages: aiChatMessagesTable,
};

export const tableRelations = {
  transcriptionSessionsRelations,
  transcriptionMessagesRelations,
  aiChatMessagesRelations,
};