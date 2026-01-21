import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, Loader2, CheckCircle, XCircle, Undo2, Zap, Database, Share2, PenLine, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  action?: ActionProposal | null;
  isConfirmed?: boolean;
  isExecuted?: boolean;
  executionResult?: string;
}

interface ActionProposal {
  type: string;
  params: Record<string, any>;
}

const OPERATOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-operator`;

const quickPrompts = [
  { icon: Database, text: 'Kdo má nízký kredit?' },
  { icon: Share2, text: 'Navrhni příspěvek na Instagram o výsledcích klientů' },
  { icon: PenLine, text: 'Shrň dnešní tréninky' },
  { icon: Zap, text: 'Kolik tréninků proběhlo tento měsíc?' },
];

export function AIAssistantSettings() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ index: number; action: ActionProposal } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(OPERATOR_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          messages: [...messages.filter(m => !m.action || m.isConfirmed), userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Chyba při komunikaci s AI');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message || data.error || 'Něco se pokazilo.',
        action: data.action || null,
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.action) {
        setPendingAction({ index: messages.length + 1, action: data.action });
      }
    } catch (error) {
      console.error('AI operator error:', error);
      toast({
        title: 'Chyba',
        description: error instanceof Error ? error.message : 'Nepodařilo se odeslat zprávu',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(OPERATOR_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          executeAction: pendingAction.action,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessages(prev => prev.map((m, i) => 
          i === pendingAction.index 
            ? { ...m, isConfirmed: true, isExecuted: true, executionResult: data.message }
            : m
        ));
        
        toast({
          title: 'Akce provedena',
          description: data.message,
        });

        // Refresh relevant queries
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        queryClient.invalidateQueries({ queryKey: ['training-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['credit-transactions'] });
      } else {
        throw new Error(data.error || 'Akce se nezdařila');
      }
    } catch (error) {
      console.error('Action execution error:', error);
      toast({
        title: 'Chyba',
        description: error instanceof Error ? error.message : 'Nepodařilo se provést akci',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setPendingAction(null);
    }
  };

  const cancelAction = () => {
    if (!pendingAction) return;
    
    setMessages(prev => prev.map((m, i) => 
      i === pendingAction.index 
        ? { ...m, content: m.content + '\n\n❌ *Akce zrušena*' }
        : m
    ));
    
    setPendingAction(null);
  };

  const undoAction = async (action: ActionProposal) => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(OPERATOR_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          undoAction: action,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Akce vrácena',
          description: data.message,
        });

        queryClient.invalidateQueries({ queryKey: ['clients'] });
        queryClient.invalidateQueries({ queryKey: ['training-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['credit-transactions'] });
      } else {
        throw new Error(data.error || 'Vrácení akce se nezdařilo');
      }
    } catch (error) {
      console.error('Undo error:', error);
      toast({
        title: 'Chyba',
        description: error instanceof Error ? error.message : 'Nepodařilo se vrátit akci',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setPendingAction(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="p-4 rounded-2xl bg-primary/10 mb-4">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">AI Asistent</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              Mohu číst a zapisovat data do aplikace, vytvářet tréninky, 
              přidávat kredit, generovat příspěvky na sociální sítě a mnohem více.
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-md">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(prompt.text)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-xl glass-subtle hover:bg-secondary/80 transition-colors text-left"
                >
                  <prompt.icon className="w-4 h-4 text-primary shrink-0" />
                  <span className="line-clamp-1">{prompt.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, i) => (
              <div
                key={i}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground px-4 py-3'
                      : 'glass px-4 py-3'
                  )}
                >
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  
                  {/* Action confirmation buttons */}
                  {message.action && !message.isConfirmed && pendingAction?.index === i && (
                    <div className="mt-3 pt-3 border-t border-border/50 flex gap-2">
                      <Button
                        size="sm"
                        onClick={confirmAction}
                        disabled={isLoading}
                        className="gap-1.5"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Potvrdit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelAction}
                        disabled={isLoading}
                        className="gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        Zrušit
                      </Button>
                    </div>
                  )}

                  {/* Executed action with undo */}
                  {message.isExecuted && message.action && (
                    <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        Provedeno
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => undoAction(message.action!)}
                        disabled={isLoading}
                        className="gap-1.5 h-7 text-xs"
                      >
                        <Undo2 className="w-3 h-3" />
                        Vrátit
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="glass px-4 py-3 rounded-2xl">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border pt-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Napište příkaz nebo dotaz... (Enter pro odeslání, Shift+Enter pro nový řádek)"
              className="min-h-[80px] resize-none glass-input pr-24"
              disabled={isLoading || !!pendingAction}
            />
            <div className="absolute bottom-2 right-2 flex gap-1">
              {messages.length > 0 && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={clearChat}
                  disabled={isLoading}
                  className="h-8 w-8"
                  title="Nová konverzace"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
              <Button
                size="icon"
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading || !!pendingAction}
                className="h-8 w-8"
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
        <p className="text-xs text-muted-foreground mt-2">
          Příklady: "Vytvoř trénink pro Jana na zítra v 10:00" • "Přidej Marii 5000 Kč kreditu" • "Kolik tréninků proběhlo tento týden?"
        </p>
      </div>
    </div>
  );
}
