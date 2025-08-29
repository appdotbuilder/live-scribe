import { Badge } from '@/components/ui/badge';
import { Volume2, User } from 'lucide-react';
import { cn } from './utils';

interface TranscriptionMessageProps {
  content: string;
  confidence: number;
  timestamp: Date;
  speaker_id?: string;
  is_final: boolean;
  fadeLevel?: number;
}

export function TranscriptionMessage({ 
  content, 
  confidence, 
  timestamp, 
  speaker_id, 
  is_final,
  fadeLevel = 1 
}: TranscriptionMessageProps) {
  const confidenceColor = confidence > 0.8 ? 'bg-green-500' : confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div 
      className={cn(
        "p-4 rounded-xl border transition-all duration-500",
        is_final ? "bg-white border-slate-200" : "bg-blue-50 border-blue-200",
        fadeLevel < 1 && "transform"
      )}
      style={{
        opacity: fadeLevel,
        transform: `translateY(${(1 - fadeLevel) * 8}px)`
      }}
    >
      <p className={cn(
        "leading-relaxed mb-3",
        is_final ? "text-slate-800" : "text-blue-900 font-medium"
      )}>
        {content}
        {!is_final && (
          <span className="inline-block w-0.5 h-4 bg-blue-500 ml-1 animate-pulse" />
        )}
      </p>
      
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-slate-500">
            {timestamp.toLocaleTimeString()}
          </span>
          
          {speaker_id && (
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <User className="h-3 w-3" />
              {speaker_id}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Volume2 className="h-3 w-3 text-slate-400" />
            <span className="text-slate-500">{(confidence * 100).toFixed(1)}%</span>
          </div>
          <div className="w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-300", confidenceColor)}
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}