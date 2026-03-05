import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Loader2, Copy, Download, FileText, Trash2, Sparkles, Mic, MicOff, BarChart3, ArrowLeftRight } from 'lucide-react';
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
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  'Jaké PR měli klienti v poslední době?',
  'Kteří klienti mají zdravotní omezení?',
  'Klienti s nejvyšším tréninkovým objemem',
  'Plníme tréninkové cíle klientů?',
];

const COMPARISON_ACTIONS = [
  { label: 'vs. minulý měsíc', prompt: 'Porovnej výsledky tohoto měsíce vs. minulý měsíc (tréninky, příjmy, storna, feedbacky). Ukaž trendy.' },
  { label: 'vs. minulý rok', prompt: 'Porovnej letošní rok s minulým rokem – meziměsíční trendy, celkové příjmy, počet tréninků. Identifikuj klíčové změny.' },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-business-analyst`;

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

interface ChartBlock {
  chartType: 'bar' | 'line' | 'pie';
  chartData: { name: string; value: number }[];
}

function parseCharts(content: string): { text: string; charts: ChartBlock[] } {
  const charts: ChartBlock[] = [];
  const text = content.replace(/```chart\s*(\{[\s\S]*?\})\s*```/g, (_, json) => {
    try {
      const parsed = JSON.parse(json);
      if (parsed.chartData && parsed.chartType) {
        charts.push(parsed);
        return ''; // remove from text
      }
    } catch { /* ignore */ }
    return _;
  });
  return { text: text.trim(), charts };
}

function InlineChart({ chart }: { chart: ChartBlock }) {
  if (chart.chartType === 'pie') {
    return (
      <div className="h-48 w-full my-3">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chart.chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
              {chart.chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }
  if (chart.chartType === 'line') {
    return (
      <div className="h-48 w-full my-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart.chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
  return (
    <div className="h-48 w-full my-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chart.chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <Tooltip />
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface BusinessAnalystChatProps {
  fullPage?: boolean;
}

export function BusinessAnalystChat({ fullPage = false }: BusinessAnalystChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [briefingLoaded, setBriefingLoaded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const { session } = useAuth();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = useCallback(async (allMessages: Message[], mode?: string) => {
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ messages: allMessages, mode }),
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

  // Auto briefing on open
  const loadBriefing = useCallback(async () => {
    if (briefingLoaded || messages.length > 0) return;
    setBriefingLoaded(true);
    setIsLoading(true);
    try {
      await streamChat([{ role: 'user', content: 'Připrav ranní briefing dne.' }], 'briefing');
      // Prepend a hidden user message
      setMessages(prev => {
        if (prev.length > 0 && prev[0].role === 'assistant') {
          return [{ role: 'user', content: '📋 Ranní briefing' }, ...prev];
        }
        return prev;
      });
    } catch (e: any) {
      toast.error(e.message || 'Chyba při načítání briefingu');
    } finally {
      setIsLoading(false);
    }
  }, [briefingLoaded, messages.length, streamChat]);

  useEffect(() => {
    if (open && !briefingLoaded && messages.length === 0) {
      loadBriefing();
    }
  }, [open, briefingLoaded, messages.length, loadBriefing]);

  // Auto briefing for full page
  useEffect(() => {
    if (fullPage && !briefingLoaded && messages.length === 0) {
      loadBriefing();
    }
  }, [fullPage, briefingLoaded, messages.length, loadBriefing]);

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
    setBriefingLoaded(false);
    toast.success('Historie vymazána');
  };

  // Voice input
  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Hlasový vstup není podporován v tomto prohlížeči');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'cs-CZ';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      setInput(transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      toast.error('Chyba hlasového vstupu');
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const renderChatContent = () => (
    <>
      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className={cn("p-4 space-y-4", fullPage && "max-w-4xl mx-auto")}>
          {messages.length === 0 && !isLoading && (
            <div className="space-y-4 pt-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Zeptej se na finance, kredity, prodeje, tréninky, výkonnost klientů nebo feedbacky.
                </p>
              </div>

              {/* Comparison quick actions */}
              <div className="flex items-center gap-2 justify-center flex-wrap">
                {COMPARISON_ACTIONS.map((action, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => send(action.prompt)}
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                    {action.label}
                  </Button>
                ))}
              </div>

              <div className={cn("grid gap-2", fullPage ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
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

          {messages.map((msg, i) => {
            const { text, charts } = msg.role === 'assistant' ? parseCharts(msg.content) : { text: msg.content, charts: [] };
            
            return (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'rounded-2xl px-4 py-3 text-sm',
                  fullPage ? 'max-w-[80%]' : 'max-w-[90%]',
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
                        <ReactMarkdown>{text}</ReactMarkdown>
                      </div>
                      {charts.map((chart, ci) => (
                        <InlineChart key={ci} chart={chart} />
                      ))}
                      {!isLoading && (
                        <div className="flex items-center gap-1 pt-1 border-t border-border/20 flex-wrap">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] gap-1" onClick={() => copyMessage(msg.content)}>
                            <Copy className="w-3 h-3" /> Kopírovat
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] gap-1" onClick={() => downloadAsText(msg.content)}>
                            <Download className="w-3 h-3" /> .txt
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] gap-1" onClick={() => downloadAsPdf(msg.content)}>
                            <FileText className="w-3 h-3" /> PDF
                          </Button>
                          {charts.length === 0 && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] gap-1" onClick={() => send('Zobraz předchozí data jako graf (bar chart)')}>
                              <BarChart3 className="w-3 h-3" /> Graf
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span>{msg.content}</span>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (messages.length === 0 || messages[messages.length - 1]?.role === 'user') && (
            <div className="flex justify-start">
              <div className="bg-secondary/50 border border-border/30 rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Comparison buttons after conversation */}
          {messages.length > 0 && !isLoading && (
            <div className="flex items-center gap-2 justify-center flex-wrap pt-2">
              {COMPARISON_ACTIONS.map((action, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-[11px] h-7"
                  onClick={() => send(action.prompt)}
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className={cn("flex-shrink-0 p-3 border-t border-border/50 bg-background/80 backdrop-blur-sm", fullPage && "max-w-4xl mx-auto w-full")}>
        <div className="flex items-end gap-2">
          <Button
            variant={isListening ? "default" : "outline"}
            size="icon"
            onClick={toggleVoice}
            className={cn("h-[44px] w-[44px] rounded-xl flex-shrink-0", isListening && "bg-destructive hover:bg-destructive/90 animate-pulse")}
            title={isListening ? 'Zastavit nahrávání' : 'Hlasový vstup'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Zeptej se na finance, výkonnost, zdraví klientů..."
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
    </>
  );

  // Full page mode - no Sheet wrapper
  if (fullPage) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {renderChatContent()}
      </div>
    );
  }

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
                <p className="text-[11px] text-muted-foreground">Finance · Kredity · Výkonnost · Zdraví · Tréninky</p>
              </div>
            </div>
            {messages.length > 0 && (
              <Button variant="ghost" size="icon" onClick={clearHistory} className="h-8 w-8" title="Vymazat historii">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </SheetHeader>

        {renderChatContent()}
      </SheetContent>
    </Sheet>
  );
}
