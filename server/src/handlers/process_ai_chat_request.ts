import { type AiChatMessage, type TranscriptionMessage } from '../schema';

// Mock AI service that generates responses based on transcription context
// In a real implementation, this would integrate with OpenAI, Anthropic, etc.
async function generateAiResponse(
  userQuestion: string,
  contextMessages: TranscriptionMessage[]
): Promise<string> {
  try {
    // Extract key information from transcription context
    const finalTranscriptions = contextMessages.filter(msg => msg.is_final);
    const transcriptionText = finalTranscriptions
      .map(msg => msg.content)
      .join(' ')
      .trim();

    // Generate contextual responses based on common question patterns
    const lowerQuestion = userQuestion.toLowerCase();

    if (lowerQuestion.includes('summary') || lowerQuestion.includes('summarize')) {
      if (transcriptionText.length === 0) {
        return 'No transcription content available to summarize yet.';
      }
      // Simple extractive summary - take first few sentences
      const sentences = transcriptionText.split(/[.!?]+/).filter(s => s.trim().length > 10);
      const summaryLength = Math.min(3, sentences.length);
      return `Here's a summary of the transcription so far: ${sentences.slice(0, summaryLength).join('. ').trim()}.`;
    }

    if (lowerQuestion.includes('key') && (lowerQuestion.includes('point') || lowerQuestion.includes('topic'))) {
      if (transcriptionText.length === 0) {
        return 'No transcription content available to extract key points from yet.';
      }
      // Extract potential key phrases (simple word frequency approach)
      const words = transcriptionText.toLowerCase().split(/\W+/).filter(w => w.length > 4);
      const wordCounts = words.reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topWords = Object.entries(wordCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([word]) => word);
      
      return `Key topics mentioned include: ${topWords.join(', ')}.`;
    }

    if (lowerQuestion.includes('who') || lowerQuestion.includes('speaker')) {
      const speakerIds = new Set(contextMessages
        .filter(msg => msg.speaker_id)
        .map(msg => msg.speaker_id));
      
      if (speakerIds.size === 0) {
        return 'No speaker identification available in the transcription.';
      }
      
      return `I can identify ${speakerIds.size} different speaker(s) in the transcription.`;
    }

    if (lowerQuestion.includes('when') || lowerQuestion.includes('time') || lowerQuestion.includes('long') || lowerQuestion.includes('duration')) {
      if (contextMessages.length === 0) {
        return 'No transcription messages available to analyze timing.';
      }
      
      const firstMessage = contextMessages[0];
      const lastMessage = contextMessages[contextMessages.length - 1];
      const duration = lastMessage.timestamp.getTime() - firstMessage.timestamp.getTime();
      const minutes = Math.floor(duration / 60000);
      
      return `The transcription spans approximately ${minutes} minutes.`;
    }

    // Default response when context is available but question doesn't match patterns
    if (transcriptionText.length > 0) {
      // Check if this looks like a general question about unrelated topics
      const generalTerms = ['weather', 'temperature', 'news', 'sports', 'politics'];
      const hasGeneralTerm = generalTerms.some(term => lowerQuestion.includes(term));
      
      if (hasGeneralTerm) {
        return `I can see transcription content is available. Could you be more specific about what you'd like to know? I can help with summaries, key points, speaker analysis, or search for specific topics.`;
      }
      
      // Search for specific content mentioned in the question
      const questionWords = userQuestion.toLowerCase().split(/\W+/).filter(w => w.length > 3);
      const relevantSentences = transcriptionText.split(/[.!?]+/).filter(sentence => {
        const sentenceLower = sentence.toLowerCase();
        return questionWords.some(word => sentenceLower.includes(word));
      });

      if (relevantSentences.length > 0) {
        return `Based on the transcription, here's what I found: ${relevantSentences[0].trim()}.`;
      }
      
      return `I can see transcription content is available. Could you be more specific about what you'd like to know? I can help with summaries, key points, speaker analysis, or search for specific topics.`;
    }

    // Default response when no context is available
    return 'I don\'t have any transcription content to work with yet. Please start a transcription session first.';

  } catch (error) {
    console.error('AI response generation failed:', error);
    return 'I\'m sorry, I encountered an error while processing your question. Please try again.';
  }
}

export async function processAiChatRequest(
  userMessage: AiChatMessage,
  contextMessages: TranscriptionMessage[]
): Promise<AiChatMessage> {
  try {
    // Validate input
    if (!userMessage.content.trim()) {
      throw new Error('User message content cannot be empty');
    }

    if (userMessage.role !== 'user') {
      throw new Error('Input message must have role "user"');
    }

    // Generate AI response based on user question and context
    const aiResponseContent = await generateAiResponse(
      userMessage.content,
      contextMessages
    );

    // Create the AI assistant response message
    const aiResponse: AiChatMessage = {
      id: crypto.randomUUID(),
      session_id: userMessage.session_id,
      role: 'assistant',
      content: aiResponseContent,
      context_messages: contextMessages.map(msg => msg.id),
      timestamp: new Date(),
      created_at: new Date()
    };

    return aiResponse;

  } catch (error) {
    console.error('AI chat request processing failed:', error);
    throw error;
  }
}