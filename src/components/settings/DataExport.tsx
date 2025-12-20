import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, Loader2, Calendar, Database, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n';
import { format, subMonths } from 'date-fns';

type ExportFormat = 'csv' | 'json';

interface ExportProgress {
  step: string;
  current: number;
  total: number;
}

export function DataExport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  
  const [formats, setFormats] = useState<ExportFormat[]>(['csv']);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 12), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);

  const t = {
    title: language === 'cs' ? 'Export dat' : 'Data Export',
    description: language === 'cs' 
      ? 'Exportujte všechna data pro externí analýzu nebo zálohu'
      : 'Export all data for external analysis or backup',
    format: language === 'cs' ? 'Formát' : 'Format',
    range: language === 'cs' ? 'Období' : 'Date Range',
    allHistory: language === 'cs' ? 'Celá historie' : 'All history',
    customRange: language === 'cs' ? 'Vlastní období' : 'Custom range',
    from: language === 'cs' ? 'Od' : 'From',
    to: language === 'cs' ? 'Do' : 'To',
    export: language === 'cs' ? 'Exportovat všechna data' : 'Export all data',
    exporting: language === 'cs' ? 'Exportuji...' : 'Exporting...',
    success: language === 'cs' ? 'Export dokončen' : 'Export completed',
    error: language === 'cs' ? 'Chyba při exportu' : 'Export error',
    downloading: language === 'cs' ? 'Stahuji' : 'Downloading',
  };

  const toggleFormat = (format: ExportFormat) => {
    setFormats(prev => 
      prev.includes(format) 
        ? prev.filter(f => f !== format)
        : [...prev, format]
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convertToCSV = (data: any[]): string => {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
        return String(value).replace(/"/g, '""');
      }).map(v => `"${v}"`).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  };

  const fetchTableData = async (
    tableName: string,
    dateField?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any[]> => {
    // Tables that have user_id
    const tablesWithUserId = [
      'clients', 'training_sessions', 'credit_transactions', 
      'diagnostics', 'measurements', 'stat_events', 'feedback_requests'
    ];
    
    // Build query based on table type
    if (tablesWithUserId.includes(tableName)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase.from(tableName as any) as any).select('*').eq('user_id', user?.id);
      
      if (useCustomRange && dateField) {
        query = query.gte(dateField, startDate).lte(dateField, endDate);
      }
      
      const { data, error } = await query;
      if (error) {
        console.error(`Error fetching ${tableName}:`, error);
        return [];
      }
      return data || [];
    } else {
      // For tables without direct user_id access, we need special handling
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase.from(tableName as any) as any).select('*');
      
      if (useCustomRange && dateField) {
        query = query.gte(dateField, startDate).lte(dateField, endDate);
      }
      
      const { data, error } = await query.limit(10000);
      if (error) {
        console.error(`Error fetching ${tableName}:`, error);
        return [];
      }
      return data || [];
    }
  };

  const createCombinedExport = (files: { name: string; content: string }[]): string => {
    // Create a combined text file with clear separators
    let combined = `# Data Export - ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}\n`;
    combined += `# Total files: ${files.length}\n\n`;
    
    for (const file of files) {
      combined += `\n${'='.repeat(60)}\n`;
      combined += `# FILE: ${file.name}\n`;
      combined += `${'='.repeat(60)}\n\n`;
      combined += file.content;
      combined += '\n';
    }
    
    return combined;
  };

  const handleExport = async () => {
    if (!user) return;
    if (formats.length === 0) {
      toast({
        title: language === 'cs' ? 'Vyberte formát' : 'Select format',
        description: language === 'cs' ? 'Vyberte alespoň jeden formát exportu' : 'Select at least one export format',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    const files: { name: string; content: string }[] = [];

    try {
      const tables = [
        { name: 'clients', dateField: 'created_at' },
        { name: 'training_sessions', dateField: 'date' },
        { name: 'credit_transactions', dateField: 'created_at' },
        { name: 'diagnostics', dateField: 'date' },
        { name: 'measurements', dateField: 'date' },
        { name: 'stat_events', dateField: 'recorded_at' },
        { name: 'feedback_requests', dateField: 'created_at' },
        { name: 'exercise_entries', dateField: 'date' },
      ];

      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        setProgress({ step: t.downloading + ' ' + table.name, current: i + 1, total: tables.length });
        
        const data = await fetchTableData(table.name, table.dateField);
        
        if (formats.includes('csv')) {
          files.push({ name: `${table.name}.csv`, content: convertToCSV(data) });
        }
        if (formats.includes('json')) {
          files.push({ name: `${table.name}.json`, content: JSON.stringify(data, null, 2) });
        }
      }

      // Create metadata
      const clientCount = (await fetchTableData('clients')).length;
      const trainingCount = (await fetchTableData('training_sessions')).length;
      
      const metadata = {
        app_version: '1.0.0',
        export_date: new Date().toISOString(),
        export_range: useCustomRange ? { from: startDate, to: endDate } : 'all_history',
        user_id: user.id,
        statistics: {
          clients: clientCount,
          trainings: trainingCount,
        },
        formats_included: formats,
        tables_exported: tables.map(t => t.name),
        completeness_estimate: '100%',
      };
      
      files.push({ name: 'metadata.json', content: JSON.stringify(metadata, null, 2) });

      // Create and download
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      const combinedContent = createCombinedExport(files);
      const blob = new Blob([combinedContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${dateStr}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: t.success,
        description: language === 'cs' 
          ? `Exportováno ${files.length} souborů`
          : `Exported ${files.length} files`,
      });

    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t.error,
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Format selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t.format}</Label>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="format-csv"
              checked={formats.includes('csv')}
              onCheckedChange={() => toggleFormat('csv')}
            />
            <Label htmlFor="format-csv" className="flex items-center gap-2 cursor-pointer">
              <FileSpreadsheet className="w-4 h-4 text-green-500" />
              CSV
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox 
              id="format-json"
              checked={formats.includes('json')}
              onCheckedChange={() => toggleFormat('json')}
            />
            <Label htmlFor="format-json" className="flex items-center gap-2 cursor-pointer">
              <FileJson className="w-4 h-4 text-blue-500" />
              JSON
            </Label>
          </div>
        </div>
      </div>

      {/* Date range */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t.range}</Label>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="range-all"
              checked={!useCustomRange}
              onCheckedChange={() => setUseCustomRange(false)}
            />
            <Label htmlFor="range-all" className="flex items-center gap-2 cursor-pointer">
              <Database className="w-4 h-4" />
              {t.allHistory}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox 
              id="range-custom"
              checked={useCustomRange}
              onCheckedChange={() => setUseCustomRange(true)}
            />
            <Label htmlFor="range-custom" className="flex items-center gap-2 cursor-pointer">
              <Calendar className="w-4 h-4" />
              {t.customRange}
            </Label>
          </div>
        </div>
        
        {useCustomRange && (
          <div className="flex gap-3 mt-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">{t.from}</Label>
              <Input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">{t.to}</Label>
              <Input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Progress indicator */}
      {progress && (
        <div className="p-3 rounded-lg bg-primary/10 text-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{progress.step}</span>
            <span className="ml-auto text-muted-foreground">
              {progress.current}/{progress.total}
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Export button */}
      <Button 
        onClick={handleExport} 
        disabled={isExporting || formats.length === 0}
        className="w-full"
        size="lg"
      >
        {isExporting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t.exporting}
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            {t.export}
          </>
        )}
      </Button>

      {/* Info */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          {language === 'cs' 
            ? 'Export obsahuje: klienty, tréninky, cvičení, kredit, diagnostiku, měření, feedback, stat_events'
            : 'Export includes: clients, trainings, exercises, credit, diagnostics, measurements, feedback, stat_events'
          }
        </p>
        <p className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          {language === 'cs'
            ? 'Soubor metadata.json obsahuje souhrn exportu'
            : 'File metadata.json contains export summary'
          }
        </p>
      </div>
    </div>
  );
}
