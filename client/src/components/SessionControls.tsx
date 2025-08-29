import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { RecordingControls } from '@/components/RecordingControls';
import { AudioControls } from '@/components/AudioControls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Settings, Edit2, Save, X } from 'lucide-react';
import type { TranscriptionSession, UpdateTranscriptionSessionInput } from '../../../server/src/schema';

interface SessionControlsProps {
  session: TranscriptionSession;
  onSessionUpdated: (session: TranscriptionSession) => void;
}

export function SessionControls({ session, onSessionUpdated }: SessionControlsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editTitle, setEditTitle] = useState(session.title);

  const handleStatusChange = async (newStatus: 'active' | 'paused' | 'stopped') => {
    try {
      setIsUpdating(true);
      const updateData: UpdateTranscriptionSessionInput = {
        id: session.id,
        status: newStatus
      };
      const updatedSession = await trpc.updateTranscriptionSession.mutate(updateData);
      onSessionUpdated(updatedSession);
    } catch (error) {
      console.error('Failed to update session status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTitleSave = async () => {
    if (!editTitle.trim() || editTitle === session.title) {
      setIsEditing(false);
      setEditTitle(session.title);
      return;
    }

    try {
      setIsUpdating(true);
      const updateData: UpdateTranscriptionSessionInput = {
        id: session.id,
        title: editTitle.trim()
      };
      const updatedSession = await trpc.updateTranscriptionSession.mutate(updateData);
      onSessionUpdated(updatedSession);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update session title:', error);
      setEditTitle(session.title);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTitleCancel = () => {
    setEditTitle(session.title);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            {isEditing ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={editTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') handleTitleSave();
                    if (e.key === 'Escape') handleTitleCancel();
                  }}
                  autoFocus
                />
                <Button size="sm" onClick={handleTitleSave} disabled={isUpdating}>
                  <Save className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleTitleCancel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <CardTitle className="text-xl">{session.title}</CardTitle>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                  className="h-6 w-6 p-0"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Session Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Session ID</Label>
                  <Input value={session.id} readOnly className="font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <Label>Audio Source</Label>
                  <Input value={session.audio_source} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Created</Label>
                  <Input 
                    value={session.created_at.toLocaleString()} 
                    readOnly 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Updated</Label>
                  <Input 
                    value={session.updated_at.toLocaleString()} 
                    readOnly 
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RecordingControls
            session={session}
            onStatusChange={handleStatusChange}
            isUpdating={isUpdating}
          />
          <AudioControls
            audioSource={session.audio_source}
            isRecording={session.status === 'active'}
          />
        </div>
      </CardContent>
    </Card>
  );
}