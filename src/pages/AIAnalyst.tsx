import { Bot, Sparkles } from 'lucide-react';
import { BusinessAnalystChat } from '@/components/ai/BusinessAnalystChat';

export default function AIAnalyst() {
  return (
    <div className="px-4 lg:px-8 pt-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            AI Business Analytik
            <Sparkles className="w-4 h-4 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground">Finance · Kredity · Výkonnost · Zdraví · Tréninky · Feedbacky</p>
        </div>
      </div>
      <BusinessAnalystChat fullPage />
    </div>
  );
}
