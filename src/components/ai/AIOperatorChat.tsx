import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Check, X, Undo2, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { featureTracker } from '@/hooks/useFeatureTracking';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  action?: PendingAction | null;
  actionStatus?: 'pending' | 'confirmed' | 'rejected' | 'executed';
}

interface PendingAction {
  type: string;
  params: Record<string, any>;
}

const AI_OPERATOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-operator`;

export function AIOperatorChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastExecutedAction, setLastExecutedAction] = useState<{ action: PendingAction; messageIndex: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async (customInput?: string) => {
    const messageText = customInput || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    featureTracker.track('ai_operator_message', 'ai');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(AI_OPERATOR_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Chyba při komunikaci s AI');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        action: data.action,
        actionStatus: data.requiresConfirmation ? 'pending' : undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('AI Operator error:', error);
      toast({
        title: 'Chyba',
        description: error instanceof Error ? error.message : 'Nepodařilo se odeslat zprávu',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmAction = async (messageIndex: number) => {
    const message = messages[messageIndex];
    if (!message.action) return;

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(AI_OPERATOR_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          messages: [],
          executeAction: message.action,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Chyba při provádění akce');
      }

      const result = await response.json();

      // Update message status
      setMessages(prev => prev.map((m, i) => 
        i === messageIndex 
          ? { ...m, actionStatus: 'executed' as const, content: m.content + '\n\n' + result.message }
          : m
      ));

      // Store for potential undo
      setLastExecutedAction({ action: message.action, messageIndex });

      toast({
        title: 'Akce provedena',
        description: result.message,
      });

      featureTracker.track('ai_operator_action_confirmed', 'ai');

    } catch (error) {
      console.error('Action execution error:', error);
      toast({
        title: 'Chyba',
        description: error instanceof Error ? error.message : 'Nepodařilo se provést akci',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const rejectAction = (messageIndex: number) => {
    setMessages(prev => prev.map((m, i) => 
      i === messageIndex 
        ? { ...m, actionStatus: 'rejected' as const, content: m.content + '\n\n❌ *Akce byla zrušena.*' }
        : m
    ));
    featureTracker.track('ai_operator_action_rejected', 'ai');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickCommands = [
    'Přidej trénink s klientem [jméno] zítra v 10:00',
    'Přišlo mi 5000 Kč od [jméno]',
    'Dokonči dnešní trénink s [jméno]',
    'Kolik kreditu má [jméno]?',
    'Kdo má trénink tento týden?',
    'Kteří klienti mají nízký kredit?',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">AI Operátor</h2>
            <p className="text-xs text-muted-foreground">Příkazy v přirozeném jazyce</p>
          </div>
        </div>
        {lastExecutedAction && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              toast({ title: 'Funkce Undo zatím není implementována' });
            }}
          >
            <Undo2 className="w-4 h-4" />
            Zpět
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="p-4 rounded-2xl bg-primary/10">
              <Bot className="w-12 h-12 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Jsem váš AI operátor
              </h3>
              <p className="text-muted-foreground text-sm max-w-md">
                Řekněte mi, co potřebujete - vytvořím trénink, přidám kredit, zruším rezervaci nebo odpovím na dotazy.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-xl">
              {quickCommands.map((cmd, i) => (
                <button
                  key={i}
                  onClick={() => setInput(cmd)}
                  className="px-3 py-2 text-sm rounded-xl glass-subtle hover:bg-secondary/80 transition-colors text-left"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, i) => (
              <div
                key={i}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className="max-w-[80%] space-y-2">
                  <div
                    className={cn(
                      "p-3 rounded-2xl",
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'glass-subtle'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  
                  {/* Action confirmation buttons */}
                  {message.action && message.actionStatus === 'pending' && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-warning/10 border border-warning/30">
                      <span className="text-sm text-warning-foreground flex-1">
                        Potvrdit tuto akci?
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-success text-success hover:bg-success hover:text-success-foreground"
                        onClick={() => confirmAction(i)}
                        disabled={isLoading}
                      >
                        <Check className="w-4 h-4" />
                        Ano
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => rejectAction(i)}
                        disabled={isLoading}
                      >
                        <X className="w-4 h-4" />
                        Ne
                      </Button>
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="glass-subtle p-3 rounded-2xl">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border/50">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Napište příkaz, např. 'Přidej trénink s Janem zítra v 15:00'"
            className="min-h-[44px] max-h-32 glass-input resize-none"
            rows={1}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-11 w-11 shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
