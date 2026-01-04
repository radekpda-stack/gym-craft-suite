/**
 * ClientChatSection Component
 * 
 * Chat interface for trainers to communicate with their clients.
 * Used in the client detail page accordion.
 */
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useChatMessages, useSendMessage, useMarkMessagesAsRead } from '@/hooks/useChatMessages';
import { MessageCircle, Send, User, CheckCheck, Check } from 'lucide-react';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface ClientChatSectionProps {
  clientId: string;
  clientName: string;
}

export function ClientChatSection({ clientId, clientName }: ClientChatSectionProps) {
  // Get current user (trainer) id
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const trainerId = currentUser?.id;
  
  const { data: messages, isLoading } = useChatMessages(clientId, trainerId);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkMessagesAsRead();
  
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (clientId && trainerId && messages && messages.length > 0) {
      const conversationId = `${trainerId}-${clientId}`;
      const hasUnread = messages.some(m => !m.isRead && m.senderType === 'client');
      if (hasUnread) {
        markAsRead.mutate({ conversationId });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, trainerId, messages?.length]);

  const handleSend = async () => {
    if (!newMessage.trim() || !clientId || !trainerId) return;

    try {
      await sendMessage.mutateAsync({
        clientId,
        trainerId,
        content: newMessage.trim(),
        senderType: 'trainer',
      });
      setNewMessage('');
      textareaRef.current?.focus();
    } catch (error) {
      toast.error('Nepodařilo se odeslat zprávu');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const groupedMessages = messages?.reduce((groups, message) => {
    const date = format(parseISO(message.createdAt), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, typeof messages>) ?? {};

  const formatDateHeader = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Dnes';
    if (isYesterday(date)) return 'Včera';
    return format(date, 'd. MMMM yyyy', { locale: cs });
  };

  if (!trainerId) {
    return (
      <div className="flex items-center justify-center py-8">
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col h-[400px]">
        {/* Messages Area */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
                  <Skeleton className="h-12 w-2/3 rounded-2xl" />
                </div>
              ))}
            </div>
          ) : messages?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-medium">Zatím žádné zprávy</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Napište klientovi {clientName} první zprávu
              </p>
            </div>
          ) : (
            <>
              {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={date} className="space-y-3">
                  {/* Date Header */}
                  <div className="flex items-center justify-center">
                    <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {formatDateHeader(date)}
                    </span>
                  </div>
                  
                  {/* Messages for this date */}
                  <AnimatePresence mode="popLayout">
                    {dateMessages?.map((message) => {
                      const isOwnMessage = message.senderType === 'trainer';
                      
                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={cn(
                            "flex",
                            isOwnMessage ? "justify-end" : "justify-start"
                          )}
                        >
                          <div className={cn(
                            "flex gap-2 max-w-[85%]",
                            isOwnMessage && "flex-row-reverse"
                          )}>
                            {/* Avatar */}
                            <div className={cn(
                              "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium",
                              isOwnMessage 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-muted text-muted-foreground"
                            )}>
                              {isOwnMessage 
                                ? <User className="w-4 h-4" />
                                : clientName.charAt(0)
                              }
                            </div>
                            
                            {/* Message Bubble */}
                            <div className={cn(
                              "rounded-2xl px-4 py-2",
                              isOwnMessage 
                                ? "bg-primary text-primary-foreground rounded-br-md" 
                                : "bg-muted rounded-bl-md"
                            )}>
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                              <div className={cn(
                                "flex items-center gap-1 mt-1",
                                isOwnMessage ? "justify-end" : "justify-start"
                              )}>
                                <span className={cn(
                                  "text-[10px]",
                                  isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"
                                )}>
                                  {format(parseISO(message.createdAt), 'HH:mm')}
                                </span>
                                {isOwnMessage && (
                                  message.isRead ? (
                                    <CheckCheck className="w-3 h-3 text-primary-foreground/70" />
                                  ) : (
                                    <Check className="w-3 h-3 text-primary-foreground/70" />
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </CardContent>

        {/* Message Input */}
        <div className="border-t p-3">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Napište zprávu..."
              className="min-h-[44px] max-h-24 resize-none"
              rows={1}
            />
            <Button 
              onClick={handleSend}
              disabled={!newMessage.trim() || sendMessage.isPending}
              size="icon"
              className="shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Enter pro odeslání, Shift+Enter pro nový řádek
          </p>
        </div>
      </Card>
    </div>
  );
}