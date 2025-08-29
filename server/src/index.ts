import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createTranscriptionSessionInputSchema,
  updateTranscriptionSessionInputSchema,
  createTranscriptionMessageInputSchema,
  getTranscriptionMessagesInputSchema,
  createAiChatMessageInputSchema,
  getAiChatMessagesInputSchema
} from './schema';

// Import handlers
import { createTranscriptionSession } from './handlers/create_transcription_session';
import { getTranscriptionSessions } from './handlers/get_transcription_sessions';
import { updateTranscriptionSession } from './handlers/update_transcription_session';
import { createTranscriptionMessage } from './handlers/create_transcription_message';
import { getTranscriptionMessages } from './handlers/get_transcription_messages';
import { getRecentTranscriptionMessages } from './handlers/get_recent_transcription_messages';
import { createAiChatMessage } from './handlers/create_ai_chat_message';
import { getAiChatMessages } from './handlers/get_ai_chat_messages';
import { processAiChatRequest } from './handlers/process_ai_chat_request';
import { getAudioDevices } from './handlers/get_audio_devices';
import { deleteTranscriptionSession } from './handlers/delete_transcription_session';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Transcription session management
  createTranscriptionSession: publicProcedure
    .input(createTranscriptionSessionInputSchema)
    .mutation(({ input }) => createTranscriptionSession(input)),

  getTranscriptionSessions: publicProcedure
    .query(() => getTranscriptionSessions()),

  updateTranscriptionSession: publicProcedure
    .input(updateTranscriptionSessionInputSchema)
    .mutation(({ input }) => updateTranscriptionSession(input)),

  deleteTranscriptionSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(({ input }) => deleteTranscriptionSession(input.sessionId)),

  // Transcription message management
  createTranscriptionMessage: publicProcedure
    .input(createTranscriptionMessageInputSchema)
    .mutation(({ input }) => createTranscriptionMessage(input)),

  getTranscriptionMessages: publicProcedure
    .input(getTranscriptionMessagesInputSchema)
    .query(({ input }) => getTranscriptionMessages(input)),

  getRecentTranscriptionMessages: publicProcedure
    .input(z.object({ 
      sessionId: z.string(), 
      minutes: z.number().int().positive().default(5) 
    }))
    .query(({ input }) => getRecentTranscriptionMessages(input.sessionId, input.minutes)),

  // AI chat management
  createAiChatMessage: publicProcedure
    .input(createAiChatMessageInputSchema)
    .mutation(({ input }) => createAiChatMessage(input)),

  getAiChatMessages: publicProcedure
    .input(getAiChatMessagesInputSchema)
    .query(({ input }) => getAiChatMessages(input)),

  processAiChatRequest: publicProcedure
    .input(z.object({
      sessionId: z.string(),
      userMessage: z.string(),
      contextMessageIds: z.array(z.string()).optional()
    }))
    .mutation(async ({ input }) => {
      // Create user message first
      const userMessage = await createAiChatMessage({
        session_id: input.sessionId,
        role: 'user',
        content: input.userMessage,
        context_messages: input.contextMessageIds
      });

      // Get context messages if provided
      const contextMessages = input.contextMessageIds 
        ? await getTranscriptionMessages({
            session_id: input.sessionId,
            limit: 1000,
            offset: 0
          }).then(messages => 
            messages.filter(msg => input.contextMessageIds!.includes(msg.id))
          )
        : [];

      // Process AI response
      const aiResponse = await processAiChatRequest(userMessage, contextMessages);
      
      return { userMessage, aiResponse };
    }),

  // Audio device management
  getAudioDevices: publicProcedure
    .query(() => getAudioDevices()),

  // Real-time subscriptions would be implemented here using WebSockets
  // For now, these are placeholder routes for future implementation
  subscribeToTranscriptionUpdates: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => {
      // Placeholder for WebSocket subscription to real-time transcription updates
      return { message: `Subscribed to transcription updates for session ${input.sessionId}` };
    }),

  subscribeToAiChatUpdates: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => {
      // Placeholder for WebSocket subscription to AI chat updates
      return { message: `Subscribed to AI chat updates for session ${input.sessionId}` };
    }),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();