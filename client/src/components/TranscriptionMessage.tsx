import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy, User, Clock, Target } from 'lucide-react';
import type { TranscriptionMessage as TranscriptionMessageType } from '../../../server/src/schema';

interface TranscriptionMessageProps {
  message: TranscriptionMessageType;
}

export function TranscriptionMessage({ message }: TranscriptionMessageProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <Card className={`transition-all duration-200 ${
      message.is_final ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-yellow-500 bg-muted/30'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            {/* Message content */}
            <p className={`text-sm leading-relaxed ${
              message.is_final ? 'text-foreground' : 'text-muted-foreground italic'
            }`}>
              {message.content}
            </p>
            
            {/* Metadata row */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatTimestamp(message.timestamp)}
              </div>
              
              {message.speaker_id && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <User className="h-3 w-3" />
                  Speaker {message.speaker_id}
                </div>
              )}
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      <div className="flex items-center gap-1">
                        <div className="confidence-bar w-12">
                          <div 
                            className={`confidence-fill ${getConfidenceColor(message.confidence)}`}
                            style={{ width: `${message.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono">
                          {Math.round(message.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Confidence: {getConfidenceText(message.confidence)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-start gap-2">
            <Badge variant={message.is_final ? 'default' : 'secondary'} className="text-xs">
              {message.is_final ? '✓ Final' : '⏳ Draft'}
            </Badge>
            
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleCopy}
              className="h-6 w-6 p-0"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}