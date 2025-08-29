import { Button } from '@/components/ui/button';

interface SuggestedPromptsProps {
  onPromptSelect: (prompt: string) => void;
  hasTranscription: boolean;
}

export function SuggestedPrompts({ onPromptSelect, hasTranscription }: SuggestedPromptsProps) {
  const prompts = hasTranscription 
    ? [
        "Summarize the key points discussed",
        "What topics were mentioned most?",
        "Extract action items from the conversation",
        "Who are the main speakers?",
      ]
    : [
        "How does this transcription system work?",
        "What can I ask about transcriptions?",
        "Tell me about the AI features",
        "How accurate is the speech recognition?",
      ];

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 font-medium">Suggested questions:</p>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onPromptSelect(prompt)}
            className="text-xs h-7 px-2 bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}