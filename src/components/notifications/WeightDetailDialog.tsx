import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink, Loader2, Scale, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import type { UnifiedNotification } from '@/hooks/useAggregatedNotifications';

interface WeightDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: UnifiedNotification | null;
}

interface WeightEntry {
  id: string;
  weight: number;
  date: string;
  notes: string | null;
}

export function WeightDetailDialog({ open, onOpenChange, notification }: WeightDetailDialogProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [clientName, setClientName] = useState('');
  const [entries, setEntries] = useState<WeightEntry[]>([]);

  useEffect(() => {
    if (!open || !notification) {
      setEntries([]);
      setClientName('');
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const clientId = notification.client_id;
        if (!clientId) return;

        const { data: client } = await supabase
          .from('clients')
          .select('name')
          .eq('id', clientId)
          .maybeSingle();
        if (client?.name) setClientName(client.name);

        const { data: weightData } = await supabase
          .from('measurements')
          .select('id, weight, date, notes')
          .eq('client_id', clientId)
          .not('weight', 'is', null)
          .order('date', { ascending: false })
          .limit(10);

        setEntries((weightData || []).filter(w => w.weight != null) as unknown as WeightEntry[]);
      } catch (error) {
        console.error('[WeightDetailDialog] Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [open, notification]);

  const latest = entries[0];
  const previous = entries[1];
  const diff = latest && previous ? latest.weight - previous.weight : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col z-[120]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Záznam váhy
          </DialogTitle>
          <DialogDescription>
            {clientName && <span className="font-medium text-foreground">{clientName}</span>}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8">
              <Scale className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Žádné záznamy váhy</p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {latest && (
                <div className="p-4 rounded-xl bg-muted/50 border border-border/50 text-center">
                  <p className="text-3xl font-bold text-foreground">{latest.weight} kg</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(parseISO(latest.date), 'd. MMMM yyyy', { locale: cs })}
                  </p>
                  {diff !== null && diff !== 0 && (
                    <div className="flex items-center justify-center gap-1 mt-2 text-sm text-muted-foreground">
                      {diff > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      <span>{diff > 0 ? '+' : ''}{diff.toFixed(1)} kg od předchozího</span>
                    </div>
                  )}
                  {diff === 0 && (
                    <div className="flex items-center justify-center gap-1 mt-2 text-sm text-muted-foreground">
                      <Minus className="w-4 h-4" />
                      <span>Beze změny</span>
                    </div>
                  )}
                </div>
              )}

              {entries.length > 1 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Posledních {entries.length} záznamů</h3>
                  <div className="space-y-1.5">
                    {entries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                        <div>
                          <p className="text-sm font-medium">{entry.weight} kg</p>
                          {entry.notes && <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{entry.notes}</p>}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(entry.date), 'd.M.yyyy', { locale: cs })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="flex items-center gap-2 pt-4 border-t shrink-0">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Zavřít
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={() => {
              const clientId = notification?.client_id;
              if (clientId) {
                onOpenChange(false);
                navigate(`/clients/${clientId}?tab=progress`);
              }
            }}
          >
            <ExternalLink className="w-4 h-4" />
            Karta klienta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
