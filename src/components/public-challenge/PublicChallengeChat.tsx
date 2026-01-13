import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePublicChallengeChat, useSendPublicChatMessage } from '@/hooks/usePublicChallenge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  challengeId: string;
  isRegistered: boolean;
}

export default function PublicChallengeChat({ challengeId, isRegistered }: Props) {
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { messages, isLoading } = usePublicChallengeChat(challengeId);
  const sendMessage = useSendPublicChatMessage();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim()) return;
    
    if (message.length > 300) {
      toast.error('Zpráva je příliš dlouhá (max 300 znaků)');
      return;
    }

    try {
      await sendMessage.mutateAsync({
        challenge_id: challengeId,
        message: message.trim(),
      });
      setMessage('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nepodařilo se odeslat zprávu');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-80 p-4" ref={scrollRef}>
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">
              Načítání...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Zatím žádné zprávy. Buďte první!
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="flex gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0",
                    msg.author_type === 'client' 
                      ? "bg-primary/20 text-primary" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {msg.author_initials.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-sm">{msg.author_initials}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.created_at), 'HH:mm', { locale: cs })}
                      </span>
                    </div>
                    <p className="text-sm break-words">{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t">
          {isRegistered ? (
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Napište zprávu..."
                maxLength={300}
                disabled={sendMessage.isPending}
              />
              <Button 
                size="icon" 
                onClick={handleSend}
                disabled={!message.trim() || sendMessage.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              Pro psaní do chatu se nejprve zaregistrujte do výzvy
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
