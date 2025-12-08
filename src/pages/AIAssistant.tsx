import { ChatInterface } from '@/components/ai/ChatInterface';
import { usePageTracking } from '@/hooks/useFeatureTracking';

export default function AIAssistant() {
  usePageTracking('ai');
  
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          AI Asistent
        </h1>
        <p className="text-muted-foreground mt-1">
          Váš osobní pomocník pro analýzu dat a plánování tréninků
        </p>
      </div>
      <ChatInterface />
    </div>
  );
}
