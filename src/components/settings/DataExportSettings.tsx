import { useState } from 'react';
import { Copy, Check, Loader2, Users, Dumbbell, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

type ExportTab = 'clients' | 'performance';

export function DataExportSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ExportTab>('clients');
  const [loading, setLoading] = useState(false);
  const [csvData, setCsvData] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadClients = async () => {
    if (!user) return;
    setLoading(true);
    setCsvData(null);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('name, gender, email, phone, birth_date, training_start_date, created_at')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('name');

      if (error) throw error;

      const header = 'Jméno;Pohlaví;Email;Telefon;Datum narození;Trénuje od;Datum založení';
      const rows = (data || []).map(c => {
        const gender = c.gender === 'male' ? 'Muž' : c.gender === 'female' ? 'Žena' : '';
        return [
          c.name,
          gender,
          c.email || '',
          c.phone || '',
          c.birth_date || '',
          c.training_start_date || '',
          c.created_at?.split('T')[0] || '',
        ].join(';');
      });

      setCsvData([header, ...rows].join('\n'));
      toast({ title: `${data?.length || 0} klientů načteno` });
    } catch (e: any) {
      toast({ title: 'Chyba', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadPerformance = async () => {
    if (!user) return;
    setLoading(true);
    setCsvData(null);
    try {
      // Fetch in batches to avoid the 1000 row limit
      let allRows: string[] = [];
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('exercise_entries')
          .select(`
            date, exercise_name, sets, reps, weight_kg, 
            time_seconds, distance_meters, is_bodyweight, is_pr, rpe, notes,
            clients!inner(name)
          `)
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .range(offset, offset + batchSize - 1);

        if (error) throw error;

        const rows = (data || []).map((e: any) => {
          return [
            e.clients?.name || '',
            e.date || '',
            e.exercise_name || '',
            e.sets ?? '',
            e.reps ?? '',
            e.weight_kg ?? '',
            e.time_seconds ?? '',
            e.distance_meters ?? '',
            e.is_bodyweight ? 'true' : 'false',
            e.is_pr ? 'true' : 'false',
            e.rpe ?? '',
            (e.notes || '').replace(/;/g, ',').replace(/\n/g, ' '),
          ].join(';');
        });

        allRows = [...allRows, ...rows];
        hasMore = (data?.length || 0) === batchSize;
        offset += batchSize;
      }

      const header = 'Klient;Datum;Cvik;Série;Opakování;Váha (kg);Čas (s);Vzdálenost (m);Tělesná váha;PR;RPE;Poznámky';
      setCsvData([header, ...allRows].join('\n'));
      toast({ title: `${allRows.length} záznamů načteno` });
    } catch (e: any) {
      toast({ title: 'Chyba', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = () => {
    if (activeTab === 'clients') loadClients();
    else loadPerformance();
  };

  const handleCopy = async () => {
    if (!csvData) return;
    await navigator.clipboard.writeText(csvData);
    setCopied(true);
    toast({ title: 'Zkopírováno do schránky' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!csvData) return;
    const blob = new Blob(['\ufeff' + csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTab === 'clients' ? 'klienti' : 'vykonnost'}-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Soubor stažen' });
  };

  const rowCount = csvData ? csvData.split('\n').length - 1 : 0;

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as ExportTab); setCsvData(null); }}>
        <TabsList className="w-full">
          <TabsTrigger value="clients" className="flex-1 gap-2">
            <Users className="w-4 h-4" />
            Klienti
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex-1 gap-2">
            <Dumbbell className="w-4 h-4" />
            Výkonnost
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-4">
          <p className="text-sm text-muted-foreground mb-3">
            Export všech aktivních klientů včetně kontaktních údajů a dat tréninků.
          </p>
        </TabsContent>
        <TabsContent value="performance" className="mt-4">
          <p className="text-sm text-muted-foreground mb-3">
            Export všech cvičebních záznamů napříč klienty — váhy, opakování, časy, PR a další.
          </p>
        </TabsContent>
      </Tabs>

      <Button onClick={handleLoad} disabled={loading} className="w-full gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {loading ? 'Načítání...' : 'Načíst data'}
      </Button>

      {csvData && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{rowCount} řádků</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5">
                <Download className="w-3.5 h-3.5" />
                Stáhnout CSV
              </Button>
              <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5">
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Zkopírováno' : 'Kopírovat'}
              </Button>
            </div>
          </div>

          <ScrollArea className="h-64 rounded-lg border bg-muted/30">
            <pre className="p-3 text-xs font-mono whitespace-pre overflow-x-auto">
              {csvData}
            </pre>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
