import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Loader2, Copy, Download, FileText, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';

type Message = { role: 'user' | 'assistant'; content: string };

const SUGGESTED_QUESTIONS = [
  'Jaký je aktuální stav kreditů klientů?',
  'Shrň finanční výsledky tohoto měsíce',
  'Jaká je moje hodinová sazba?',
  'Kteří klienti mají bolesti nebo red flagy?',
  'Top 10 klientů podle tržeb',
  'Statistika storen za posledních 30 dní',
  'Co mám dnes a zítra v rozvrhu?',
  'Shrň feedbacky klientů za týden',
  'Které produkty mají nízké zásoby?',
  'Připrav PDF report',
  'Porovnej tréninky tento a minulý měsíc',
  'Kteří klienti mají dluh?',
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-business-analyst`;

export function BusinessAnalystChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { session } = useAuth();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = useCallback(async (allMessages: Message[]) => {
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ messages: allMessages }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      if (resp.status === 429) throw new Error('Příliš mnoho požadavků, zkuste to později.');
      if (resp.status === 402) throw new Error('Nedostatek AI kreditu.');
      throw new Error(errorData.error || 'Chyba AI služby');
    }

    if (!resp.body) throw new Error('No stream body');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assistantContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') break;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant') {
                return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
              }
              return [...prev, { role: 'assistant', content: assistantContent }];
            });
          }
        } catch { /* partial JSON */ }
      }
    }
  }, [session]);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setIsLoading(true);

    try {
      await streamChat(updated);
    } catch (e: any) {
      toast.error(e.message || 'Chyba při komunikaci s AI');
      setMessages(prev => prev.filter((_, i) => i < prev.length));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Zkopírováno do schránky');
  };

  const downloadAsText = (content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-report_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report stažen');
  };

  const downloadAsPdf = (content: string) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Business Report', margin, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`Vygenerováno: ${new Date().toLocaleDateString('cs-CZ')} ${new Date().toLocaleTimeString('cs-CZ')}`, margin, y);
    y += 10;

    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Content lines
    const lines = content.split('\n');
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 20;
      }

      const trimmed = line.trim();

      if (trimmed.startsWith('## ')) {
        y += 4;
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        const wrapped = doc.splitTextToSize(trimmed.replace(/^#+\s*/, ''), maxWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 6 + 3;
      } else if (trimmed.startsWith('### ')) {
        y += 2;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        const wrapped = doc.splitTextToSize(trimmed.replace(/^#+\s*/, ''), maxWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 5 + 2;
      } else if (trimmed.startsWith('# ')) {
        y += 4;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const wrapped = doc.splitTextToSize(trimmed.replace(/^#+\s*/, ''), maxWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 7 + 3;
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const text = trimmed.replace(/^[-*]\s*/, '').replace(/\*\*/g, '');
        const wrapped = doc.splitTextToSize(`• ${text}`, maxWidth - 5);
        doc.text(wrapped, margin + 3, y);
        y += wrapped.length * 5;
      } else if (trimmed.startsWith('|')) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const cleanLine = trimmed.replace(/\*\*/g, '');
        const wrapped = doc.splitTextToSize(cleanLine, maxWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 4.5;
      } else if (trimmed === '') {
        y += 3;
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const cleanLine = trimmed.replace(/\*\*/g, '');
        const wrapped = doc.splitTextToSize(cleanLine, maxWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 5;
      }
    }

    doc.save(`ai-report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF report stažen');
  };

  const clearHistory = () => {
    setMessages([]);
    toast.success('Historie vymazána');
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative group"
          title="AI Business Analytik"
        >
          <div className="relative">
            <Bot className="w-5 h-5" />
            <Sparkles className="w-2.5 h-2.5 absolute -top-1 -right-1 text-primary animate-pulse" />
          </div>
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:w-[480px] p-0 flex flex-col gap-0">
        <SheetHeader className="px-4 py-3 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-sm">AI Business Analytik</SheetTitle>
                <p className="text-[11px] text-muted-foreground">Finance · Kredity · Prodeje · Tréninky · Feedbacky</p>
              </div>
            </div>
            {messages.length > 0 && (
              <Button variant="ghost" size="icon" onClick={clearHistory} className="h-8 w-8" title="Vymazat historii">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
          <div className="p-4 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-4 pt-4">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Zeptej se na stav financí, kreditů, prodejů, tréninků nebo feedbacků.
                  </p>
                </div>
                <div className="grid gap-2">
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => send(q)}
                      className="text-left text-sm px-3 py-2.5 rounded-xl border border-border/50 hover:bg-secondary/50 hover:border-primary/30 transition-all duration-200"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[90%] rounded-2xl px-4 py-3 text-sm',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-secondary/50 border border-border/30 rounded-bl-md'
                )}>
                  {msg.role === 'assistant' ? (
                    <div className="space-y-2">
                      <div className="prose prose-sm dark:prose-invert max-w-none break-words
                        prose-headings:my-2 prose-p:my-1 prose-ul:my-1 prose-ol:my-1
                        prose-li:my-0.5 prose-table:my-2 prose-th:px-2 prose-th:py-1
                        prose-td:px-2 prose-td:py-1 prose-table:text-xs
                        prose-th:bg-muted/50 prose-th:text-left prose-th:font-semibold
                        prose-tr:border-b prose-tr:border-border/30">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      {!isLoading && (
                        <div className="flex items-center gap-1 pt-1 border-t border-border/20 flex-wrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px] gap-1"
                            onClick={() => copyMessage(msg.content)}
                          >
                            <Copy className="w-3 h-3" /> Kopírovat
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px] gap-1"
                            onClick={() => downloadAsText(msg.content)}
                          >
                            <Download className="w-3 h-3" /> .txt
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px] gap-1"
                            onClick={() => downloadAsPdf(msg.content)}
                          >
                            <FileText className="w-3 h-3" /> PDF
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span>{msg.content}</span>
                  )}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-secondary/50 border border-border/30 rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex-shrink-0 p-3 border-t border-border/50 bg-background/80 backdrop-blur-sm">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Zeptej se na finance, kredit, prodeje..."
              className="min-h-[44px] max-h-[120px] resize-none text-sm rounded-xl"
              rows={1}
            />
            <Button
              size="icon"
              onClick={() => send(input)}
              disabled={!input.trim() || isLoading}
              className="h-[44px] w-[44px] rounded-xl flex-shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
