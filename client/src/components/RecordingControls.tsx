import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, Square, Loader2 } from 'lucide-react';
import type { TranscriptionSession } from '../../../server/src/schema';

interface RecordingControlsProps {
  session: TranscriptionSession;
  onStatusChange: (status: 'active' | 'paused' | 'stopped') => void;
  isUpdating: boolean;
}

export function RecordingControls({ session, onStatusChange, isUpdating }: RecordingControlsProps) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'active':
        return {
          icon: '🔴',
          color: 'destructive' as const,
          label: 'Recording',
          description: 'Actively transcribing audio'
        };
      case 'paused':
        return {
          icon: '⏸️',
          color: 'secondary' as const,
          label: 'Paused',
          description: 'Recording paused'
        };
      case 'stopped':
        return {
          icon: '⏹️',
          color: 'outline' as const,
          label: 'Stopped',
          description: 'Recording stopped'
        };
      default:
        return {
          icon: '❓',
          color: 'outline' as const,
          label: 'Unknown',
          description: 'Unknown status'
        };
    }
  };

  const statusInfo = getStatusInfo(session.status);

  const handleStart = () => onStatusChange('active');
  const handlePause = () => onStatusChange('paused');
  const handleStop = () => onStatusChange('stopped');

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={session.status === 'active' ? 'recording-indicator' : 'w-3 h-3 bg-gray-300 rounded-full'} />
            <div>
              <Badge variant={statusInfo.color} className="mb-1">
                <span className="mr-1">{statusInfo.icon}</span>
                {statusInfo.label}
              </Badge>
              <p className="text-sm text-muted-foreground">
                {statusInfo.description}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleStart}
              disabled={isUpdating || session.status === 'active'}
              className="flex-1 gap-2"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Start
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handlePause}
              disabled={isUpdating || session.status !== 'active'}
              className="flex-1 gap-2"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
              Pause
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={handleStop}
              disabled={isUpdating || session.status === 'stopped'}
              className="flex-1 gap-2"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              Stop
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}