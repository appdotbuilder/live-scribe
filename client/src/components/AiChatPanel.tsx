import { useState, useEffect, useCallback, useRef } from 'react';
import { trpc } from '@/utils/trpc';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatPanel } from '@/components/ChatPanel';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RefreshCw, Send, Bot, Settings } from 'lucide-react';
import type { AiChatMessage, TranscriptionMessage } from '../../../server/src/schema';

interface AiChatPanelProps {
  sessionId: string;
}

export function AiChatPanel({ sessionId }: AiChatPanelProps) {
  const [chatMessages, setChatMessages] = useState<AiChatMessage[]>([]);
  const [transcriptionMessages, setTranscriptionMessages] = useState<TranscriptionMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedContext, setSelectedContext] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isContextDialogOpen, setIsContextDialogOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const loadChatMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getAiChatMessages.query({
        session_id: sessionId,
        limit: 100,
        offset: 0
      });
      setChatMessages(result);
    } catch (error) {
      console.error('Failed to load chat messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const loadTranscriptionMessages = useCallback(async () => {
    try {
      // Load recent transcription messages for context selection
      const result = await trpc.getRecentTranscriptionMessages.query({
        sessionId: sessionId,
        minutes: 10 // Last 10 minutes
      });
      setTranscriptionMessages(result);
    } catch (error) {
      console.error('Failed to load transcription messages:', error);
    }
  }, [sessionId]);

  useEffect(() => {
    loadChatMessages();
    loadTranscriptionMessages();
  }, [loadChatMessages, loadTranscriptionMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [chatMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const result = await trpc.processAiChatRequest.mutate({
        sessionId: sessionId,
        userMessage: newMessage.trim(),
        contextMessageIds: selectedContext.length > 0 ? selectedContext : undefined
      });

      // Add both user and AI messages to the chat
      setChatMessages((prev: AiChatMessage[]) => [...prev, result.userMessage, result.aiResponse]);
      
      // Clear form
      setNewMessage('');
      setSelectedContext([]);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleContextToggle = (messageId: string) => {
    setSelectedContext((prev: string[]) => 
      prev.includes(messageId)
        ? prev.filter((id: string) => id !== messageId)
        : [...prev, messageId]
    );
  };

  const quickPrompts = [
    'Summarize the key points from the transcription',
    'What were the main topics discussed?',
    'Generate action items from this conversation',
    'Create a brief meeting recap',
    'Identify any decisions that were made'
  ];

  const handleQuickPrompt = (prompt: string) => {
    setNewMessage(prompt);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      {/* Chat Messages Panel */}
      <div className="lg:col-span-2">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-500" />
                AI Assistant
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {chatMessages.length} messages
                </Badge>
                <Button size="sm" variant="outline" onClick={loadChatMessages} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="flex-1 p-0 flex flex-col">
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="text-6xl mb-4">🤖</div>
                  <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
                  <p className="text-muted-foreground mb-4">
                    Ask the AI assistant about your transcription or get insights about the conversation.
                  </p>
                  <div className="flex flex-wrap gap-2 max-w-md">
                    {quickPrompts.slice(0, 3).map((prompt: string, index: number) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickPrompt(prompt)}
                        className="text-xs"
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatMessages.map((message: AiChatMessage) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="space-y-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Textarea
                      value={newMessage}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                        setNewMessage(e.target.value)
                      }
                      placeholder="Ask the AI about your transcription..."
                      className="resize-none"
                      rows={2}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e as React.FormEvent);
                        }
                      }}
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Dialog open={isContextDialogOpen} onOpenChange={setIsContextDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          type="button" 
                          size="sm" 
                          variant="outline"
                          disabled={transcriptionMessages.length === 0}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-96">
                        <DialogHeader>
                          <DialogTitle>Select Transcription Context</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="h-64">
                          <div className="space-y-2">
                            {transcriptionMessages.map((msg: TranscriptionMessage) => (
                              <label
                                key={msg.id}
                                className="flex items-start gap-3 p-2 rounded border cursor-pointer hover:bg-accent"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedContext.includes(msg.id)}
                                  onChange={() => handleContextToggle(msg.id)}
                                  className="mt-1"
                                />
                                <div className="flex-1 text-sm">
                                  <p>{msg.content}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {msg.timestamp.toLocaleTimeString()}
                                  </p>
                                </div>
                              </label>
                            ))}
                          </div>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                    
                    <Button type="submit" size="sm" disabled={!newMessage.trim() || isSending}>
                      {isSending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {selectedContext.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {selectedContext.length} context message{selectedContext.length !== 1 ? 's' : ''} selected
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedContext([])}
                      className="h-6 text-xs"
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </form>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Panel */}
      <div className="lg:col-span-1">
        <ChatPanel
          quickPrompts={quickPrompts}
          onPromptSelect={handleQuickPrompt}
          selectedContextCount={selectedContext.length}
          transcriptionCount={transcriptionMessages.length}
        />
      </div>
    </div>
  );
}