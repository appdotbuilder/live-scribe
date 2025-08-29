import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sparkles, MessageSquare, FileText, Lightbulb, Target, ListChecks } from 'lucide-react';

interface ChatPanelProps {
  quickPrompts: string[];
  onPromptSelect: (prompt: string) => void;
  selectedContextCount: number;
  transcriptionCount: number;
}

export function ChatPanel({ 
  quickPrompts, 
  onPromptSelect, 
  selectedContextCount, 
  transcriptionCount 
}: ChatPanelProps) {
  const getPromptIcon = (prompt: string) => {
    if (prompt.includes('Summarize')) return <FileText className="h-4 w-4" />;
    if (prompt.includes('topics')) return <MessageSquare className="h-4 w-4" />;
    if (prompt.includes('action items')) return <ListChecks className="h-4 w-4" />;
    if (prompt.includes('recap')) return <Target className="h-4 w-4" />;
    if (prompt.includes('decisions')) return <Lightbulb className="h-4 w-4" />;
    return <Sparkles className="h-4 w-4" />;
  };

  const categories = [
    {
      title: '📝 Analysis',
      prompts: quickPrompts.filter((prompt: string) => 
        prompt.includes('Summarize') || prompt.includes('topics') || prompt.includes('decisions')
      )
    },
    {
      title: '✅ Actions',
      prompts: quickPrompts.filter((prompt: string) => 
        prompt.includes('action items') || prompt.includes('recap')
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Context Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Context Status
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Transcription messages:</span>
              <Badge variant="outline">{transcriptionCount}</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Selected for context:</span>
              <Badge variant={selectedContextCount > 0 ? 'default' : 'outline'}>
                {selectedContextCount}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Prompts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            Quick Prompts
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            {categories.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  {category.title}
                </h4>
                <div className="space-y-2">
                  {category.prompts.map((prompt: string, index: number) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => onPromptSelect(prompt)}
                      className="w-full justify-start text-left h-auto py-2 px-3"
                    >
                      <div className="flex items-start gap-2">
                        {getPromptIcon(prompt)}
                        <span className="text-xs leading-relaxed">{prompt}</span>
                      </div>
                    </Button>
                  ))}
                </div>
                {categoryIndex < categories.length - 1 && (
                  <Separator className="mt-3" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Select transcription context for better responses</li>
            <li>• Use Shift+Enter for new lines in your message</li>
            <li>• Try asking follow-up questions for deeper insights</li>
            <li>• The AI can analyze patterns and themes in your conversations</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}