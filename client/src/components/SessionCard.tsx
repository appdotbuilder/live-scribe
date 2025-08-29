import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Calendar, Mic } from 'lucide-react';
import type { TranscriptionSession } from '../../../server/src/schema';

interface SessionCardProps {
  session: TranscriptionSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function SessionCard({ session, isActive, onSelect, onDelete }: SessionCardProps) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'paused':
        return 'secondary';
      case 'stopped':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return '🔴';
      case 'paused':
        return '⏸️';
      case 'stopped':
        return '⏹️';
      default:
        return '❓';
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isActive ? 'session-card-active' : ''
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium text-sm leading-tight line-clamp-2">
            {session.title}
          </h3>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Session</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{session.title}"? This action cannot be undone and will remove all transcription data and chat messages.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="flex items-center justify-between mb-2">
          <Badge variant={getStatusBadgeVariant(session.status)} className="text-xs">
            <span className="mr-1">{getStatusIcon(session.status)}</span>
            {session.status}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {session.created_at.toLocaleDateString()}
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <Mic className="h-3 w-3" />
          <span className="truncate">{session.audio_source}</span>
        </div>
      </CardContent>
    </Card>
  );
}