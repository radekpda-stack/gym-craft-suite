import { useState, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Upload, FileText, Check, X, AlertTriangle, User, 
  TrendingUp, TrendingDown, Minus, Loader2, ChevronDown,
  Files, CheckCircle, XCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ClientAvatar } from '@/components/ui/client-avatar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { parseMeasurementPDF, compareMeasurements, type ParsedMeasurementData, type MeasurementComparison } from '@/lib/pdfMeasurementParser';
import { useClients, type Client } from '@/hooks/useClients';
import { 
  useMeasurements, 
  useCreateMeasurement, 
  useUpdateMeasurement,
  useFindDuplicateMeasurement,
  useMergeMeasurement,
  type Measurement 
} from '@/hooks/useMeasurements';

interface PDFImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportedFile {
  id: string;
  file: File;
  status: 'pending' | 'parsing' | 'parsed' | 'matched' | 'saving' | 'saved' | 'error';
  data?: ParsedMeasurementData;
  error?: string;
  warnings?: string[];
  selectedClient?: Client;
  duplicateMeasurement?: Measurement | null;
  duplicateAction?: 'overwrite' | 'new' | 'merge';
  comparisons?: MeasurementComparison[];
}

export function PDFImportDialog({ open, onOpenChange }: PDFImportDialogProps) {
  const [files, setFiles] = useState<ImportedFile[]>([]);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    success: number;
    failed: number;
    clients: string[];
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: clients = [] } = useClients();
  const createMeasurement = useCreateMeasurement();
  const updateMeasurement = useUpdateMeasurement();
  const findDuplicate = useFindDuplicateMeasurement();
  const mergeMeasurement = useMergeMeasurement();

  const resetState = useCallback(() => {
    setFiles([]);
    setIsBatchMode(false);
    setImportSummary(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);

  // Parse PDF text using browser-based extraction
  const extractTextFromPDF = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          
          // Convert to text - this is a simple extraction
          // For better results, we'd need pdf.js or similar
          const uint8Array = new Uint8Array(arrayBuffer);
          let text = '';
          
          // Try to find text streams in PDF
          const decoder = new TextDecoder('utf-8', { fatal: false });
          const rawText = decoder.decode(uint8Array);
          
          // Extract readable text from PDF structure
          const textMatches = rawText.match(/\(([^)]+)\)/g);
          if (textMatches) {
            text = textMatches
              .map(m => m.slice(1, -1))
              .filter(t => t.length > 1 && !/^[\\\/]/.test(t))
              .join(' ');
          }
          
          // Also try to extract from stream objects
          const streamMatches = rawText.match(/stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g);
          if (streamMatches) {
            for (const stream of streamMatches) {
              const content = stream.replace(/stream[\r\n]+/, '').replace(/[\r\n]+endstream/, '');
              // Try to decode if it looks like text
              if (/[a-zA-Z]{3,}/.test(content)) {
                text += ' ' + content;
              }
            }
          }
          
          resolve(text.trim() || rawText);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Nepodařilo se přečíst soubor'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newFiles: ImportedFile[] = Array.from(selectedFiles).map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      status: 'pending' as const,
    }));

    setIsBatchMode(selectedFiles.length > 1);
    setFiles(newFiles);

    // Process files
    for (let i = 0; i < newFiles.length; i++) {
      const importFile = newFiles[i];
      
      setFiles(prev => prev.map(f => 
        f.id === importFile.id ? { ...f, status: 'parsing' } : f
      ));

      try {
        const text = await extractTextFromPDF(importFile.file);
        const result = parseMeasurementPDF(text);

        if (result.success && result.data) {
          // Try to find matching client
          let matchedClient: Client | undefined;
          if (result.data.clientName) {
            const searchName = result.data.clientName.toLowerCase();
            matchedClient = clients.find(c => 
              c.name.toLowerCase().includes(searchName) ||
              searchName.includes(c.name.toLowerCase())
            );
          }

          setFiles(prev => prev.map(f => 
            f.id === importFile.id ? {
              ...f,
              status: matchedClient ? 'matched' : 'parsed',
              data: result.data,
              warnings: result.warnings,
              selectedClient: matchedClient,
            } : f
          ));
        } else {
          setFiles(prev => prev.map(f => 
            f.id === importFile.id ? {
              ...f,
              status: 'error',
              error: result.error || 'Nepodařilo se zpracovat PDF',
            } : f
          ));
        }
      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === importFile.id ? {
            ...f,
            status: 'error',
            error: error instanceof Error ? error.message : 'Neznámá chyba',
          } : f
        ));
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClientSelect = async (fileId: string, client: Client) => {
    const file = files.find(f => f.id === fileId);
    if (!file || !file.data) return;

    // Check for duplicate
    const date = file.data.date || new Date().toISOString().split('T')[0];
    const duplicate = await findDuplicate.mutateAsync({ clientId: client.id, date });

    // Get previous measurement for comparison
    const { data: measurements } = await import('@/integrations/supabase/client').then(
      ({ supabase }) => supabase
        .from('measurements')
        .select('*')
        .eq('client_id', client.id)
        .order('date', { ascending: false })
        .limit(1)
    );
    
    const previous = measurements?.[0];
    const comparisons = compareMeasurements(file.data, previous);

    setFiles(prev => prev.map(f => 
      f.id === fileId ? {
        ...f,
        status: 'matched',
        selectedClient: client,
        duplicateMeasurement: duplicate,
        duplicateAction: duplicate ? undefined : 'new',
        comparisons,
      } : f
    ));
  };

  const handleDuplicateAction = (fileId: string, action: 'overwrite' | 'new' | 'merge') => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, duplicateAction: action } : f
    ));
  };

  const saveMeasurement = async (importFile: ImportedFile) => {
    if (!importFile.selectedClient || !importFile.data) return;

    const data = importFile.data;
    const client = importFile.selectedClient;
    const date = data.date || new Date().toISOString().split('T')[0];

    const measurementData = {
      client_id: client.id,
      date,
      weight: data.weight,
      body_fat_percentage: data.bodyFatPercentage,
      muscle_mass: data.muscleMass,
      basal_metabolism: data.basalMetabolism,
      visceral_fat: data.visceralFat,
      notes: `Importováno z PDF: ${importFile.file.name}`,
    };

    if (importFile.duplicateMeasurement) {
      if (importFile.duplicateAction === 'overwrite') {
        await updateMeasurement.mutateAsync({
          ...measurementData,
          id: importFile.duplicateMeasurement.id,
        });
      } else if (importFile.duplicateAction === 'merge') {
        await mergeMeasurement.mutateAsync({
          existingId: importFile.duplicateMeasurement.id,
          newData: measurementData,
        });
      } else {
        // Create new
        await createMeasurement.mutateAsync(measurementData);
      }
    } else {
      await createMeasurement.mutateAsync(measurementData);
    }
  };

  const handleSaveAll = async () => {
    const filesToSave = files.filter(f => 
      f.selectedClient && f.data && (f.duplicateAction || !f.duplicateMeasurement)
    );

    const successClients: string[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const file of filesToSave) {
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'saving' } : f
      ));

      try {
        await saveMeasurement(file);
        successCount++;
        if (file.selectedClient && !successClients.includes(file.selectedClient.name)) {
          successClients.push(file.selectedClient.name);
        }
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'saved' } : f
        ));
      } catch (error) {
        failCount++;
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { 
            ...f, 
            status: 'error',
            error: error instanceof Error ? error.message : 'Nepodařilo se uložit'
          } : f
        ));
      }
    }

    setImportSummary({
      total: files.length,
      success: successCount,
      failed: failCount + files.filter(f => f.status === 'error').length,
      clients: successClients,
    });
  };

  const canSave = files.some(f => 
    f.selectedClient && f.data && (f.duplicateAction || !f.duplicateMeasurement)
  );

  const getTrendIcon = (trend: 'better' | 'worse' | 'stagnation' | null) => {
    switch (trend) {
      case 'better':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'worse':
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      case 'stagnation':
        return <Minus className="w-4 h-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Import měření z PDF
          </DialogTitle>
          <DialogDescription>
            Nahrajte PDF report z měření tělesného složení
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Summary after import */}
          {importSummary && (
            <div className="p-4 rounded-xl bg-secondary/50 mb-4">
              <h3 className="font-semibold mb-2">Import dokončen</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Celkem:</span>
                  <span className="ml-2 font-medium">{importSummary.total}</span>
                </div>
                <div>
                  <span className="text-success">Úspěšně:</span>
                  <span className="ml-2 font-medium">{importSummary.success}</span>
                </div>
                <div>
                  <span className="text-destructive">Chyby:</span>
                  <span className="ml-2 font-medium">{importSummary.failed}</span>
                </div>
              </div>
              {importSummary.clients.length > 0 && (
                <div className="mt-3 text-sm">
                  <span className="text-muted-foreground">Klienti:</span>
                  <span className="ml-2">{importSummary.clients.join(', ')}</span>
                </div>
              )}
              <Button 
                onClick={handleClose} 
                className="w-full mt-4"
              >
                Zavřít
              </Button>
            </div>
          )}

          {/* File upload area */}
          {!importSummary && files.length === 0 && (
            <div 
              className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">Přetáhněte PDF soubory sem</p>
              <p className="text-muted-foreground mt-1">nebo klikněte pro výběr souborů</p>
              <p className="text-sm text-muted-foreground mt-4">
                Podporován dávkový import více souborů
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Files list */}
          {!importSummary && files.length > 0 && (
            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-4">
                {files.map((importFile) => (
                  <FileImportCard
                    key={importFile.id}
                    importFile={importFile}
                    clients={clients}
                    onClientSelect={(client) => handleClientSelect(importFile.id, client)}
                    onDuplicateAction={(action) => handleDuplicateAction(importFile.id, action)}
                    getTrendIcon={getTrendIcon}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Actions */}
        {!importSummary && files.length > 0 && (
          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={resetState}>
              Nový import
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleClose}>
                Zrušit
              </Button>
              <Button 
                onClick={handleSaveAll} 
                disabled={!canSave}
                className="gap-2"
              >
                <Check className="w-4 h-4" />
                Uložit {isBatchMode ? 'vše' : ''}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Separate component for each file card
interface FileImportCardProps {
  importFile: ImportedFile;
  clients: Client[];
  onClientSelect: (client: Client) => void;
  onDuplicateAction: (action: 'overwrite' | 'new' | 'merge') => void;
  getTrendIcon: (trend: 'better' | 'worse' | 'stagnation' | null) => React.ReactNode;
}

function FileImportCard({ 
  importFile, 
  clients, 
  onClientSelect, 
  onDuplicateAction,
  getTrendIcon 
}: FileImportCardProps) {
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const getStatusBadge = () => {
    switch (importFile.status) {
      case 'pending':
      case 'parsing':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 animate-spin mr-1" /> Zpracování...</Badge>;
      case 'parsed':
        return <Badge variant="outline" className="text-warning border-warning">Vyberte klienta</Badge>;
      case 'matched':
        return <Badge variant="outline" className="text-success border-success">Připraveno</Badge>;
      case 'saving':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 animate-spin mr-1" /> Ukládání...</Badge>;
      case 'saved':
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" /> Uloženo</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Chyba</Badge>;
    }
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="rounded-xl border border-border bg-card p-4">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium truncate max-w-[200px]">{importFile.file.name}</span>
              {getStatusBadge()}
            </div>
            <ChevronDown className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              isExpanded && "rotate-180"
            )} />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4">
          {importFile.status === 'error' && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {importFile.error}
            </div>
          )}

          {importFile.warnings && importFile.warnings.length > 0 && (
            <div className="p-3 rounded-lg bg-warning/10 text-warning text-sm mb-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Upozornění</span>
              </div>
              <ul className="list-disc list-inside">
                {importFile.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {importFile.data && (
            <>
              {/* Parsed values */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {importFile.data.weight && (
                  <ValueCard label="Váha" value={importFile.data.weight} unit="kg" />
                )}
                {importFile.data.bodyFatPercentage && (
                  <ValueCard label="Tělesný tuk" value={importFile.data.bodyFatPercentage} unit="%" />
                )}
                {importFile.data.muscleMass && (
                  <ValueCard label="Svalová hmota" value={importFile.data.muscleMass} unit="kg" />
                )}
                {importFile.data.basalMetabolism && (
                  <ValueCard label="Bazální metabolismus" value={importFile.data.basalMetabolism} unit="kcal" />
                )}
                {importFile.data.visceralFat && (
                  <ValueCard label="Viscerální tuk" value={importFile.data.visceralFat} unit="" />
                )}
              </div>

              {/* Client selector */}
              <div className="mb-4">
                <Label className="text-sm mb-2 block">Klient</Label>
                <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2"
                      disabled={importFile.status === 'saved' || importFile.status === 'saving'}
                    >
                      {importFile.selectedClient ? (
                        <>
                          <ClientAvatar name={importFile.selectedClient.name} size="sm" />
                          <span>{importFile.selectedClient.name}</span>
                        </>
                      ) : (
                        <>
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Vyberte klienta...</span>
                        </>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[300px]" align="start">
                    <Command>
                      <CommandInput placeholder="Hledat klienta..." />
                      <CommandList>
                        <CommandEmpty>Klient nenalezen</CommandEmpty>
                        <CommandGroup>
                          {clients.map(client => (
                            <CommandItem
                              key={client.id}
                              value={client.name}
                              onSelect={() => {
                                onClientSelect(client);
                                setClientPopoverOpen(false);
                              }}
                            >
                              <ClientAvatar name={client.name} size="sm" className="mr-2" />
                              <span>{client.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Duplicate handling */}
              {importFile.duplicateMeasurement && (
                <div className="p-3 rounded-lg bg-warning/10 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <span className="font-medium text-sm">
                      Existuje záznam ze dne {format(new Date(importFile.duplicateMeasurement.date), 'd. MMMM yyyy', { locale: cs })}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={importFile.duplicateAction === 'overwrite' ? 'default' : 'outline'}
                      onClick={() => onDuplicateAction('overwrite')}
                    >
                      Přepsat
                    </Button>
                    <Button
                      size="sm"
                      variant={importFile.duplicateAction === 'new' ? 'default' : 'outline'}
                      onClick={() => onDuplicateAction('new')}
                    >
                      Vytvořit nový
                    </Button>
                    <Button
                      size="sm"
                      variant={importFile.duplicateAction === 'merge' ? 'default' : 'outline'}
                      onClick={() => onDuplicateAction('merge')}
                    >
                      Sloučit
                    </Button>
                  </div>
                </div>
              )}

              {/* Trend comparison */}
              {importFile.comparisons && importFile.comparisons.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Porovnání s předchozím měřením</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {importFile.comparisons.map(comp => (
                      <div 
                        key={comp.field}
                        className="flex items-center justify-between p-2 rounded-lg bg-secondary/50"
                      >
                        <span className="text-sm text-muted-foreground">{comp.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {comp.currentValue}{comp.unit}
                          </span>
                          {comp.trend && (
                            <div className="flex items-center gap-1">
                              {getTrendIcon(comp.trend)}
                              {comp.difference !== null && (
                                <span className={cn(
                                  "text-xs",
                                  comp.trend === 'better' ? 'text-success' : 
                                  comp.trend === 'worse' ? 'text-destructive' : 
                                  'text-muted-foreground'
                                )}>
                                  {comp.difference > 0 ? '+' : ''}{comp.difference.toFixed(1)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function ValueCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="p-3 rounded-lg bg-secondary/50">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">
        {value} <span className="text-muted-foreground font-normal">{unit}</span>
      </p>
    </div>
  );
}
