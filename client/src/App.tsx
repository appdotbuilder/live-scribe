import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { SessionManager } from '@/components/SessionManager';
import { TranscriptionPanel } from '@/components/TranscriptionPanel';
import { AiChatPanel } from '@/components/AiChatPanel';
import { SessionControls } from '@/components/SessionControls';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import './App.css';
import type { TranscriptionSession } from '../../server/src/schema';

function App() {
  const [sessions, setSessions] = useState<TranscriptionSession[]>([]);
  const [activeSession, setActiveSession] = useState<TranscriptionSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getTranscriptionSessions.query();
      setSessions(result);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleSessionCreated = useCallback((session: TranscriptionSession) => {
    setSessions((prev: TranscriptionSession[]) => [session, ...prev]);
    setActiveSession(session);
  }, []);

  const handleSessionUpdated = useCallback((updatedSession: TranscriptionSession) => {
    setSessions((prev: TranscriptionSession[]) =>
      prev.map((session: TranscriptionSession) =>
        session.id === updatedSession.id ? updatedSession : session
      )
    );
    if (activeSession?.id === updatedSession.id) {
      setActiveSession(updatedSession);
    }
  }, [activeSession]);

  const handleSessionDeleted = useCallback((sessionId: string) => {
    setSessions((prev: TranscriptionSession[]) =>
      prev.filter((session: TranscriptionSession) => session.id !== sessionId)
    );
    if (activeSession?.id === sessionId) {
      setActiveSession(null);
    }
  }, [activeSession]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-3">
              🎙️ AI Transcription Studio
            </CardTitle>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Session Management Sidebar */}
          <div className="lg:col-span-1">
            <SessionManager
              sessions={sessions}
              activeSession={activeSession}
              onSessionSelect={setActiveSession}
              onSessionCreated={handleSessionCreated}
              onSessionDeleted={handleSessionDeleted}
              isLoading={isLoading}
            />
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {activeSession ? (
              <div className="space-y-6">
                {/* Session Controls */}
                <SessionControls
                  session={activeSession}
                  onSessionUpdated={handleSessionUpdated}
                />

                <Separator />

                {/* Transcription and Chat Panels */}
                <Tabs defaultValue="transcription" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="transcription" className="flex items-center gap-2">
                      📝 Transcription
                    </TabsTrigger>
                    <TabsTrigger value="chat" className="flex items-center gap-2">
                      🤖 AI Chat
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="transcription" className="mt-6">
                    <TranscriptionPanel sessionId={activeSession.id} />
                  </TabsContent>
                  
                  <TabsContent value="chat" className="mt-6">
                    <AiChatPanel sessionId={activeSession.id} />
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <Card className="p-12 text-center">
                <div className="text-6xl mb-4">🎤</div>
                <h2 className="text-2xl font-semibold mb-2">No Session Selected</h2>
                <p className="text-muted-foreground">
                  Create a new transcription session or select an existing one from the sidebar to get started.
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;