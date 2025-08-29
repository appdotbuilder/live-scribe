import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Volume2, VolumeX, Mic, MicOff } from 'lucide-react';

interface AudioControlsProps {
  audioSource: string;
  isRecording: boolean;
}

export function AudioControls({ audioSource, isRecording }: AudioControlsProps) {
  // Stub implementation for audio level monitoring
  // In a real implementation, this would connect to the Web Audio API
  const [audioLevel, setAudioLevel] = useState(0);
  const [isMuted] = useState(false);

  useEffect(() => {
    if (!isRecording) {
      setAudioLevel(0);
      return;
    }

    // Simulate audio level fluctuations when recording
    const interval = setInterval(() => {
      if (!isMuted) {
        // Random audio level between 0-100 to simulate real audio input
        setAudioLevel(Math.random() * 100);
      } else {
        setAudioLevel(0);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording, isMuted]);

  const getAudioLevelColor = (level: number) => {
    if (level > 80) return 'bg-red-500';
    if (level > 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatAudioSource = (source: string) => {
    switch (source) {
      case 'default':
        return 'Default Microphone';
      case 'microphone1':
        return 'Built-in Microphone';
      case 'microphone2':
        return 'External USB Microphone';
      default:
        return source;
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isMuted ? (
                <MicOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Mic className="h-4 w-4 text-green-600" />
              )}
              <span className="text-sm font-medium">Audio Input</span>
            </div>
            <Badge variant={isRecording ? 'default' : 'secondary'}>
              {isRecording ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Source:</span>
              <span className="font-medium">{formatAudioSource(audioSource)}</span>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Level:</span>
                <span className="font-mono text-xs">
                  {Math.round(audioLevel)}%
                </span>
              </div>
              <div className="relative">
                <Progress value={audioLevel} className="h-2" />
                <div 
                  className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-100 ${getAudioLevelColor(audioLevel)}`}
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              {audioLevel > 0 ? (
                <Volume2 className="h-3 w-3" />
              ) : (
                <VolumeX className="h-3 w-3" />
              )}
              <span>{audioLevel > 0 ? 'Signal detected' : 'No signal'}</span>
            </div>
          </div>

          {/* Audio level indicator bars */}
          <div className="flex gap-1 h-6 items-end justify-center">
            {Array.from({ length: 8 }, (_, i) => {
              const threshold = (i + 1) * 12.5; // Each bar represents 12.5% increment
              const isActive = audioLevel >= threshold && isRecording && !isMuted;
              return (
                <div
                  key={i}
                  className={`w-2 transition-all duration-75 rounded-sm ${
                    isActive 
                      ? threshold > 75 
                        ? 'bg-red-500' 
                        : threshold > 50 
                        ? 'bg-yellow-500' 
                        : 'bg-green-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  style={{ height: `${Math.min(threshold / 100 * 24, 24)}px` }}
                />
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}