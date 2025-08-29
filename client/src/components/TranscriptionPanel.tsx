import { useState, useEffect, useCallback, useRef } from 'react';
import { trpc } from '@/utils/trpc';
import { TranscriptionMessage } from '@/components/TranscriptionMessage';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Search, Filter, Download, MessageSquare } from 'lucide-react';
import type { TranscriptionMessage as TranscriptionMessageType } from '../../../server/src/schema';

interface TranscriptionPanelProps {
  sessionId: string;
}

export function TranscriptionPanel({ sessionId }: TranscriptionPanelProps) {
  const [messages, setMessages] = useState<TranscriptionMessageType[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<TranscriptionMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyFinal, setShowOnlyFinal] = useState(false);
  const [minConfidence, setMinConfidence] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getTranscriptionMessages.query({
        session_id: sessionId,
        limit: 500,
        offset: 0
      });
      setMessages(result);
    } catch (error) {
      console.error('Failed to load transcription messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Filter messages based on search term, final status, and confidence
  useEffect(() => {
    let filtered = [...messages];

    if (searchTerm) {
      filtered = filtered.filter((message: TranscriptionMessageType) =>
        message.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (showOnlyFinal) {
      filtered = filtered.filter((message: TranscriptionMessageType) => message.is_final);
    }

    if (minConfidence > 0) {
      filtered = filtered.filter((message: TranscriptionMessageType) => 
        message.confidence >= minConfidence / 100
      );
    }

    setFilteredMessages(filtered);
  }, [messages, searchTerm, showOnlyFinal, minConfidence]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [filteredMessages]);

  const handleExportTranscript = () => {
    const finalMessages = messages.filter((msg: TranscriptionMessageType) => msg.is_final);
    const transcript = finalMessages
      .map((msg: TranscriptionMessageType) => 
        `[${msg.timestamp.toLocaleTimeString()}] ${msg.content}`
      )
      .join('\n');
    
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${sessionId}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalMessages = messages.length;
  const finalMessages = messages.filter((msg: TranscriptionMessageType) => msg.is_final).length;
  const avgConfidence = messages.length > 0 
    ? Math.round((messages.reduce((sum: number, msg: TranscriptionMessageType) => sum + msg.confidence, 0) / messages.length) * 100)
    : 0;

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Live Transcription
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={loadMessages} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportTranscript} disabled={totalMessages === 0}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <Badge variant="secondary">
            {totalMessages} total
          </Badge>
          <Badge variant="outline">
            {finalMessages} final
          </Badge>
          <Badge variant="outline">
            {avgConfidence}% avg confidence
          </Badge>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transcription..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="final-only"
                  checked={showOnlyFinal}
                  onCheckedChange={setShowOnlyFinal}
                />
                <Label htmlFor="final-only" className="text-sm">
                  Final only
                </Label>
              </div>
              
              <div className="flex items-center gap-2">
                <Label htmlFor="confidence" className="text-sm">
                  Min confidence:
                </Label>
                <Input
                  id="confidence"
                  type="number"
                  min="0"
                  max="100"
                  value={minConfidence}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setMinConfidence(parseInt(e.target.value) || 0)
                  }
                  className="w-16"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            
            <Badge variant="outline">
              <Filter className="h-3 w-3 mr-1" />
              {filteredMessages.length} shown
            </Badge>
          </div>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
          {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-6xl mb-4">🎤</div>
              <h3 className="text-lg font-semibold mb-2">
                {totalMessages === 0 ? 'No transcription yet' : 'No messages match filters'}
              </h3>
              <p className="text-muted-foreground">
                {totalMessages === 0 
                  ? 'Start recording to see live transcription appear here'
                  : 'Try adjusting your search or filter settings'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMessages.map((message: TranscriptionMessageType) => (
                <TranscriptionMessage key={message.id} message={message} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}