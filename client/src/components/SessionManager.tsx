import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { SessionCard } from '@/components/SessionCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import type { TranscriptionSession, CreateTranscriptionSessionInput, AudioDevice } from '../../../server/src/schema';

interface SessionManagerProps {
  sessions: TranscriptionSession[];
  activeSession: TranscriptionSession | null;
  onSessionSelect: (session: TranscriptionSession) => void;
  onSessionCreated: (session: TranscriptionSession) => void;
  onSessionDeleted: (sessionId: string) => void;
  isLoading: boolean;
}

export function SessionManager({
  sessions,
  activeSession,
  onSessionSelect,
  onSessionCreated,
  onSessionDeleted,
  isLoading
}: SessionManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [audioDevices] = useState<AudioDevice[]>([
    // Stub data for audio devices - in a real implementation, this would come from the API
    { device_id: 'default', label: 'Default Microphone', kind: 'audioinput', group_id: null },
    { device_id: 'microphone1', label: 'Built-in Microphone', kind: 'audioinput', group_id: 'group1' },
    { device_id: 'microphone2', label: 'External USB Microphone', kind: 'audioinput', group_id: 'group2' }
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<CreateTranscriptionSessionInput>({
    title: '',
    audio_source: 'default'
  });

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.audio_source) return;

    setIsCreating(true);
    try {
      const session = await trpc.createTranscriptionSession.mutate(formData);
      onSessionCreated(session);
      setFormData({ title: '', audio_source: 'default' });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await trpc.deleteTranscriptionSession.mutate({ sessionId });
      onSessionDeleted(sessionId);
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Sessions</CardTitle>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Session</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSession} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Session Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateTranscriptionSessionInput) => ({ 
                        ...prev, 
                        title: e.target.value 
                      }))
                    }
                    placeholder="Enter session title..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audio-source">Audio Source</Label>
                  <Select
                    value={formData.audio_source || 'default'}
                    onValueChange={(value: string) =>
                      setFormData((prev: CreateTranscriptionSessionInput) => ({ 
                        ...prev, 
                        audio_source: value 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select audio source" />
                    </SelectTrigger>
                    <SelectContent>
                      {audioDevices
                        .filter((device: AudioDevice) => device.kind === 'audioinput')
                        .map((device: AudioDevice) => (
                          <SelectItem key={device.device_id} value={device.device_id}>
                            {device.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating || !formData.title.trim()}>
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Create
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground">
              <div className="text-2xl mb-2">🎙️</div>
              <p>No sessions yet.</p>
              <p className="text-sm">Create your first session!</p>
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {sessions.map((session: TranscriptionSession) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isActive={activeSession?.id === session.id}
                  onSelect={() => onSessionSelect(session)}
                  onDelete={() => handleDeleteSession(session.id)}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}