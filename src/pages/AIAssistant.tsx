import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatInterface } from '@/components/ai/ChatInterface';
import { AIOperatorChat } from '@/components/ai/AIOperatorChat';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { MessageSquare, Zap } from 'lucide-react';

export default function AIAssistant() {
  usePageTracking('ai');
  
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          AI Asistent
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Váš osobní pomocník pro analýzu dat a provádění operací
        </p>
      </div>
      
      <Tabs defaultValue="operator" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
          <TabsTrigger value="operator" className="gap-2">
            <Zap className="w-4 h-4" />
            Operátor
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Chat
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="operator" className="mt-0">
          <AIOperatorChat />
        </TabsContent>
        
        <TabsContent value="chat" className="mt-0">
          <ChatInterface />
        </TabsContent>
      </Tabs>
    </div>
  );
}
