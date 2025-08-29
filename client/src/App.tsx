import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Mic, 
  MicOff, 
  Pause, 
  Play, 
  Square, 
  Volume2, 
  Settings,
  MessageSquare,
  Send,

  RotateCcw
} from 'lucide-react';
import { cn } from '@/components/utils';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { SessionStats } from '@/components/SessionStats';
import { TypingIndicator } from '@/components/TypingIndicator';
import { SuggestedPrompts } from '@/components/SuggestedPrompts';
import { TranscriptionMessage } from '@/components/TranscriptionMessage';

// Application data types
interface TranscriptionMessage {
  id: string;
  content: string;
  timestamp: Date;
  confidence: number;
  is_final: boolean;
  speaker_id?: string;
}

interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AudioDevice {
  device_id: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

type SessionStatus = 'active' | 'paused' | 'stopped';

function App() {
  // Session state
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('stopped');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [sessionTitle, setSessionTitle] = useState('New Transcription Session');
  
  // Transcription state
  const [transcriptionMessages, setTranscriptionMessages] = useState<TranscriptionMessage[]>([]);
  const [realtimeMessages, setRealtimeMessages] = useState<TranscriptionMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  
  // AI Chat state
  const [chatMessages, setChatMessages] = useState<AiChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  
  // Session tracking
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);

  // Available audio devices
  const [audioDevices] = useState<AudioDevice[]>([
    { device_id: 'default', label: 'System Default Microphone', kind: 'audioinput' },
    { device_id: 'mic1', label: 'Built-in Microphone', kind: 'audioinput' },
    { device_id: 'mic2', label: 'USB Headset Microphone', kind: 'audioinput' },
    { device_id: 'mic3', label: 'Bluetooth Headphones', kind: 'audioinput' },
    { device_id: 'virtual1', label: 'Virtual Audio Cable', kind: 'audioinput' },
  ]);

  // Sample transcription phrases for demonstration
  const samplePhrases = [
    "Welcome to today's presentation on artificial intelligence",
    "We'll be discussing the latest developments in machine learning",
    "Our research shows significant improvements in natural language processing",
    "The application of AI in healthcare has been revolutionary",
    "Data privacy remains a critical concern in AI implementation",
    "The future of autonomous vehicles looks promising",
    "Quantum computing may accelerate AI development",
    "Ethics in AI development is becoming increasingly important",
    "Real-time processing capabilities have improved dramatically",
    "The integration of AI and IoT creates new possibilities"
  ];

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Track session duration
  useEffect(() => {
    if (sessionStatus === 'active' && !sessionStartTime) {
      setSessionStartTime(new Date());
    } else if (sessionStatus === 'stopped') {
      setSessionStartTime(null);
      setSessionDuration(0);
    }
  }, [sessionStatus, sessionStartTime]);

  useEffect(() => {
    if (sessionStatus === 'active' && sessionStartTime) {
      const interval = setInterval(() => {
        setSessionDuration(Math.floor((Date.now() - sessionStartTime.getTime()) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [sessionStatus, sessionStartTime]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Simulate real-time transcription
  const simulateTranscription = useCallback(() => {
    if (sessionStatus !== 'active') return;

    const randomPhrase = samplePhrases[Math.floor(Math.random() * samplePhrases.length)];
    const words = randomPhrase.split(' ');
    let currentWordIndex = 0;

    const addWord = () => {
      if (sessionStatus !== 'active' || currentWordIndex >= words.length) return;

      const newContent = words.slice(0, currentWordIndex + 1).join(' ');
      setCurrentMessage(newContent);
      currentWordIndex++;

      if (currentWordIndex < words.length) {
        setTimeout(addWord, Math.random() * 200 + 100);
      } else {
        // Finalize the message
        const finalMessage: TranscriptionMessage = {
          id: Date.now().toString(),
          content: newContent,
          timestamp: new Date(),
          confidence: Math.random() * 0.3 + 0.7,
          is_final: true,
          speaker_id: Math.random() > 0.7 ? 'Speaker 1' : undefined
        };

        setTranscriptionMessages(prev => [...prev, finalMessage]);
        setRealtimeMessages(prev => [finalMessage, ...prev.slice(0, 4)]);
        setCurrentMessage('');

        // Schedule next phrase
        setTimeout(simulateTranscription, Math.random() * 3000 + 1000);
      }
    };

    addWord();
  }, [sessionStatus, samplePhrases]);

  // Start transcription simulation
  useEffect(() => {
    if (sessionStatus === 'active') {
      const timeout = setTimeout(simulateTranscription, 1000);
      return () => clearTimeout(timeout);
    }
  }, [sessionStatus, simulateTranscription]);

  const handleStartListening = () => {
    if (!selectedAudioDevice) {
      alert('Please select an audio source first');
      return;
    }
    setSessionStatus('active');
  };

  const handlePauseListening = () => {
    setSessionStatus('paused');
  };

  const handleStopListening = () => {
    setSessionStatus('stopped');
    setCurrentMessage('');
  };

  const handleClearSession = () => {
    setTranscriptionMessages([]);
    setRealtimeMessages([]);
    setChatMessages([]);
    setCurrentMessage('');
    setSessionStatus('stopped');
  };

  const simulateAiResponse = async (userMessage: string): Promise<string> => {
    // Simple AI simulation based on transcription context
    const recentTranscription = transcriptionMessages.slice(-5).map(msg => msg.content).join(' ');
    
    if (userMessage.toLowerCase().includes('summary') || userMessage.toLowerCase().includes('summarize')) {
      return `Based on the recent transcription, the main topics discussed include AI development, machine learning advances, and their applications in various fields. The conversation has covered ${transcriptionMessages.length} messages so far.`;
    } else if (userMessage.toLowerCase().includes('what') && userMessage.toLowerCase().includes('said')) {
      const lastMessage = transcriptionMessages[transcriptionMessages.length - 1];
      return lastMessage 
        ? `The most recent statement was: "${lastMessage.content}" (confidence: ${(lastMessage.confidence * 100).toFixed(1)}%)`
        : "I don't have any recent transcription to reference.";
    } else if (userMessage.toLowerCase().includes('topic') || userMessage.toLowerCase().includes('about')) {
      if (recentTranscription.toLowerCase().includes('ai') || recentTranscription.toLowerCase().includes('artificial intelligence')) {
        return "The conversation appears to be focused on artificial intelligence, its applications, and related technologies.";
      } else {
        return "Based on the transcription, I can help you analyze the topics being discussed. What specific aspect would you like me to focus on?";
      }
    } else {
      return `I understand you're asking about: "${userMessage}". Based on the current transcription context, I can help analyze the conversation. The session has captured ${transcriptionMessages.length} messages so far. Would you like me to summarize specific parts or search for particular topics?`;
    }
  };

  const handleSendMessage = async (messageContent?: string) => {
    const content = messageContent || chatInput.trim();
    if (!content) return;

    const userMessage: AiChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsAiTyping(true);

    // Simulate AI processing delay
    setTimeout(async () => {
      const aiResponse = await simulateAiResponse(content);
      const assistantMessage: AiChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, assistantMessage]);
      setIsAiTyping(false);
    }, Math.random() * 2000 + 1000);
  };

  const getStatusColor = (status: SessionStatus) => {
    switch (status) {
      case 'active': return 'text-green-500';
      case 'paused': return 'text-yellow-500';
      case 'stopped': return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: SessionStatus) => {
    switch (status) {
      case 'active': return <Mic className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      case 'stopped': return <MicOff className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200/60 bg-white/70 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Volume2 className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-xl font-semibold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                  TranscribeAI
                </h1>
              </div>
              <Badge variant="outline" className={cn("font-medium", getStatusColor(sessionStatus))}>
                <span className="flex items-center gap-1">
                  {getStatusIcon(sessionStatus)}
                  {sessionStatus.charAt(0).toUpperCase() + sessionStatus.slice(1)}
                </span>
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleClearSession}
                className="hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 h-[calc(100vh-120px)]">
          
          {/* Real-time Transcription Panel */}
          <div className="xl:col-span-2 space-y-6">
            {/* Session Statistics */}
            <SessionStats 
              duration={sessionDuration}
              messageCount={transcriptionMessages.length}
              averageConfidence={transcriptionMessages.length > 0 
                ? transcriptionMessages.reduce((sum, msg) => sum + msg.confidence, 0) / transcriptionMessages.length 
                : 0
              }
              isActive={sessionStatus === 'active'}
            />

            {/* Controls */}
            <Card className="border-slate-200/60 bg-white/70 backdrop-blur-sm shadow-lg shadow-slate-900/5">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium">Audio Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Audio Source
                    </label>
                    <Select value={selectedAudioDevice} onValueChange={setSelectedAudioDevice}>
                      <SelectTrigger className="bg-white/80">
                        <SelectValue placeholder="Select audio input" />
                      </SelectTrigger>
                      <SelectContent>
                        {audioDevices.map((device) => (
                          <SelectItem key={device.device_id} value={device.device_id}>
                            {device.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Session Title
                    </label>
                    <Input
                      value={sessionTitle}
                      onChange={(e) => setSessionTitle(e.target.value)}
                      className="bg-white/80"
                      placeholder="Enter session title"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-3 pt-2">
                  {sessionStatus === 'stopped' ? (
                    <Button 
                      onClick={handleStartListening}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium"
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      Start Listening
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      {sessionStatus === 'active' ? (
                        <Button 
                          onClick={handlePauseListening}
                          variant="outline"
                          className="border-yellow-200 text-yellow-700 hover:bg-yellow-50"
                        >
                          <Pause className="h-4 w-4 mr-2" />
                          Pause
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => setSessionStatus('active')}
                          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Resume
                        </Button>
                      )}
                      <Button 
                        onClick={handleStopListening}
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <Square className="h-4 w-4 mr-2" />
                        Stop
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Real-time Display */}
            <Card className="border-slate-200/60 bg-white/70 backdrop-blur-sm shadow-lg shadow-slate-900/5 flex-1">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-2 w-2 rounded-full", {
                      "bg-green-400 animate-pulse": sessionStatus === 'active',
                      "bg-yellow-400": sessionStatus === 'paused',
                      "bg-gray-300": sessionStatus === 'stopped'
                    })} />
                    Live Transcription
                  </div>
                  <AudioVisualizer 
                    isActive={sessionStatus === 'active'} 
                    className="hidden sm:flex"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <div className="h-full flex flex-col">
                  {/* Current message */}
                  {currentMessage && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                      <p className="text-lg leading-relaxed text-slate-800 font-medium">
                        {currentMessage}
                        <span className="inline-block w-2 h-5 bg-blue-500 ml-1 animate-pulse" />
                      </p>
                    </div>
                  )}
                  
                  {/* Recent messages with fade effect */}
                  <div className="space-y-3 flex-1 overflow-hidden">
                    {realtimeMessages.map((message, index) => (
                      <TranscriptionMessage
                        key={message.id}
                        content={message.content}
                        confidence={message.confidence}
                        timestamp={message.timestamp}
                        speaker_id={message.speaker_id}
                        is_final={message.is_final}
                        fadeLevel={Math.max(0.3, 1 - (index * 0.2))}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Full Transcript */}
            <Card className="border-slate-200/60 bg-white/70 backdrop-blur-sm shadow-lg shadow-slate-900/5">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium flex items-center justify-between">
                  Complete Transcript
                  <Badge variant="secondary">
                    {transcriptionMessages.length} messages
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-60" ref={scrollAreaRef}>
                  <div className="space-y-3">
                    {transcriptionMessages.length === 0 ? (
                      <div className="text-center py-12">
                        <Mic className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                        <p className="text-slate-500 text-lg font-medium mb-2">
                          No transcription data yet
                        </p>
                        <p className="text-slate-400 text-sm">
                          Start listening to begin recording conversations
                        </p>
                      </div>
                    ) : (
                      transcriptionMessages.map((message) => (
                        <TranscriptionMessage
                          key={message.id}
                          content={message.content}
                          confidence={message.confidence}
                          timestamp={message.timestamp}
                          speaker_id={message.speaker_id}
                          is_final={message.is_final}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* AI Chat Panel */}
          <div className="space-y-6">
            <Card className="border-slate-200/60 bg-white/70 backdrop-blur-sm shadow-lg shadow-slate-900/5 h-full flex flex-col">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  AI Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ScrollArea className="flex-1 mb-4" ref={chatScrollRef}>
                  <div className="space-y-4 min-h-[400px]">
                    {chatMessages.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Ask questions about the transcription</p>
                        <p className="text-xs mt-1">Try: "What topics were discussed?" or "Summarize the conversation"</p>
                      </div>
                    ) : (
                      chatMessages.map((message) => (
                        <div 
                          key={message.id}
                          className={cn(
                            "flex",
                            message.role === 'user' ? "justify-end" : "justify-start"
                          )}
                        >
                          <div 
                            className={cn(
                              "max-w-[80%] p-3 rounded-lg",
                              message.role === 'user' 
                                ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white" 
                                : "bg-slate-100 text-slate-800"
                            )}
                          >
                            <p className="text-sm leading-relaxed">
                              {message.content}
                            </p>
                            <p className={cn(
                              "text-xs mt-1 opacity-70",
                              message.role === 'user' ? "text-blue-100" : "text-slate-500"
                            )}>
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    
                    {isAiTyping && <TypingIndicator />}
                  </div>
                </ScrollArea>
                
                <Separator className="mb-4" />
                
                {chatMessages.length === 0 && (
                  <div className="mb-4">
                    <SuggestedPrompts 
                      onPromptSelect={(prompt) => handleSendMessage(prompt)}
                      hasTranscription={transcriptionMessages.length > 0}
                    />
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Ask about the transcription..."
                    className="bg-white/80"
                    disabled={isAiTyping}
                  />
                  <Button 
                    onClick={() => handleSendMessage()}
                    disabled={!chatInput.trim() || isAiTyping}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;