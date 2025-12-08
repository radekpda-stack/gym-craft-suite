import { useState, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Upload, FileText, Check, X, AlertTriangle, User, 
  TrendingUp, TrendingDown, Minus, Loader2, ChevronDown,
  Files, CheckCircle, XCircle, Camera, Image as ImageIcon,
  Edit2
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
import { 
  parseMeasurementPDF, 
  compareMeasurements, 
  type ParsedMeasurementData, 
  type MeasurementComparison 
} from '@/lib/pdfMeasurementParser';
import { 
  parseImageMeasurement, 
  isImageFile, 
  isPDFFile,
  getSupportedFileTypes 
} from '@/lib/imageMeasurementParser';
import { extractTextFromPDF } from '@/lib/pdfExtractor';
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
  fileType: 'pdf' | 'image';
  previewUrl?: string;
  status: 'pending' | 'parsing' | 'parsed' | 'matched' | 'saving' | 'saved' | 'error';
  data?: ParsedMeasurementData;
  editedData?: ParsedMeasurementData;
  error?: string;
  warnings?: string[];
  selectedClient?: Client;
  duplicateMeasurement?: Measurement | null;
  duplicateAction?: 'overwrite' | 'new' | 'merge';
  comparisons?: MeasurementComparison[];
  isEditing?: boolean;
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const { data: clients = [] } = useClients();
  const createMeasurement = useCreateMeasurement();
  const updateMeasurement = useUpdateMeasurement();
  const findDuplicate = useFindDuplicateMeasurement();
  const mergeMeasurement = useMergeMeasurement();

  const resetState = useCallback(() => {
    // Revoke preview URLs
    files.forEach(f => {
      if (f.previewUrl) {
        URL.revokeObjectURL(f.previewUrl);
      }
    });
    setFiles([]);
    setIsBatchMode(false);
    setImportSummary(null);
  }, [files]);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);

  // Parse PDF text using pdf.js library
  const extractText = async (file: File): Promise<string> => {
    const result = await extractTextFromPDF(file);
    if (!result.success || !result.text) {
      throw new Error(result.error || 'Nepodařilo se přečíst PDF');
    }
    return result.text;
  };

  const processFile = async (importFile: ImportedFile) => {
    setFiles(prev => prev.map(f => 
      f.id === importFile.id ? { ...f, status: 'parsing' } : f
    ));

    try {
      let result;

      if (importFile.fileType === 'image') {
        // Use OCR for images via edge function
        result = await parseImageMeasurement(importFile.file);
      } else {
        // Use PDF parser
        const text = await extractText(importFile.file);
        result = parseMeasurementPDF(text);
      }

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
            editedData: { ...result.data },
            warnings: result.warnings,
            selectedClient: matchedClient,
          } : f
        ));
      } else {
        setFiles(prev => prev.map(f => 
          f.id === importFile.id ? {
            ...f,
            status: 'error',
            error: result.error || 'Nepodařilo se zpracovat soubor',
            warnings: result.warnings,
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
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newFiles: ImportedFile[] = Array.from(selectedFiles).map(file => {
      const fileType = isImageFile(file) ? 'image' : 'pdf';
      return {
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        fileType,
        previewUrl: fileType === 'image' ? URL.createObjectURL(file) : undefined,
        status: 'pending' as const,
      };
    });

    setIsBatchMode(selectedFiles.length > 1);
    setFiles(newFiles);

    // Process files
    for (const importFile of newFiles) {
      await processFile(importFile);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  const handleClientSelect = async (fileId: string, client: Client) => {
    const file = files.find(f => f.id === fileId);
    if (!file || !file.editedData) return;

    // Check for duplicate
    const date = file.editedData.date || new Date().toISOString().split('T')[0];
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
    const comparisons = compareMeasurements(file.editedData, previous);

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

  const handleEditValue = (fileId: string, field: keyof ParsedMeasurementData, value: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== fileId || !f.editedData) return f;
      
      let parsedValue: number | string | undefined;
      if (field === 'clientName' || field === 'date' || field === 'rawText') {
        parsedValue = value || undefined;
      } else {
        parsedValue = value ? parseFloat(value.replace(',', '.')) : undefined;
        if (parsedValue !== undefined && isNaN(parsedValue)) {
          parsedValue = undefined;
        }
      }

      return {
        ...f,
        editedData: {
          ...f.editedData,
          [field]: parsedValue,
        },
      };
    }));
  };

  const toggleEditing = (fileId: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, isEditing: !f.isEditing } : f
    ));
  };

  const uploadSourceFile = async (file: File, userId: string): Promise<string | null> => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('measurement-files')
        .upload(fileName, file);
      
      if (error) {
        console.error('File upload error:', error);
        return null;
      }
      
      const { data: urlData } = supabase.storage
        .from('measurement-files')
        .getPublicUrl(data.path);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  const saveMeasurement = async (importFile: ImportedFile) => {
    if (!importFile.selectedClient || !importFile.editedData) return;

    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Uživatel není přihlášen');
    }

    const data = importFile.editedData;
    const client = importFile.selectedClient;
    const date = data.date || new Date().toISOString().split('T')[0];
    const fileTypeLabel = importFile.fileType === 'image' ? 'fotografie' : 'PDF';

    // Upload source file
    const sourceFileUrl = await uploadSourceFile(importFile.file, user.id);

    const measurementData = {
      client_id: client.id,
      date,
      weight: data.weight,
      body_fat_percentage: data.bodyFatPercentage,
      muscle_mass: data.muscleMass,
      basal_metabolism: data.basalMetabolism,
      visceral_fat: data.visceralFat,
      notes: `Importováno z ${fileTypeLabel}: ${importFile.file.name}`,
      source_file_url: sourceFileUrl,
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
      f.selectedClient && f.editedData && (f.duplicateAction || !f.duplicateMeasurement)
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
    f.selectedClient && f.editedData && (f.duplicateAction || !f.duplicateMeasurement)
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
            Import měření (PDF / Foto)
          </DialogTitle>
          <DialogDescription>
            Nahrajte PDF report nebo fotografii výsledků měření tělesného složení
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
            <div className="space-y-4">
              {/* Main upload area */}
              <div 
                className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">Přetáhněte soubory sem</p>
                <p className="text-muted-foreground mt-1">nebo klikněte pro výběr</p>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  <Badge variant="outline">PDF</Badge>
                  <Badge variant="outline">JPG</Badge>
                  <Badge variant="outline">PNG</Badge>
                  <Badge variant="outline">HEIC</Badge>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={getSupportedFileTypes()}
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="w-6 h-6 text-primary" />
                  <span>Vybrat z galerie</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="w-6 h-6 text-primary" />
                  <span>Vyfotit nyní</span>
                </Button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
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
                    onEditValue={(field, value) => handleEditValue(importFile.id, field, value)}
                    onToggleEditing={() => toggleEditing(importFile.id)}
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
  onEditValue: (field: keyof ParsedMeasurementData, value: string) => void;
  onToggleEditing: () => void;
  getTrendIcon: (trend: 'better' | 'worse' | 'stagnation' | null) => React.ReactNode;
}

function FileImportCard({ 
  importFile, 
  clients, 
  onClientSelect, 
  onDuplicateAction,
  onEditValue,
  onToggleEditing,
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

  const getFileIcon = () => {
    return importFile.fileType === 'image' 
      ? <ImageIcon className="w-5 h-5 text-muted-foreground" />
      : <FileText className="w-5 h-5 text-muted-foreground" />;
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="rounded-xl border border-border bg-card p-4">
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getFileIcon()}
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
          {/* Image preview */}
          {importFile.fileType === 'image' && importFile.previewUrl && (
            <div className="mb-4 rounded-lg overflow-hidden border border-border">
              <img 
                src={importFile.previewUrl} 
                alt="Preview" 
                className="w-full max-h-48 object-contain bg-secondary/50"
              />
            </div>
          )}

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

          {importFile.editedData && (
            <>
              {/* Edit toggle */}
              <div className="flex justify-end mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleEditing();
                  }}
                  className="gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  {importFile.isEditing ? 'Dokončit úpravy' : 'Upravit hodnoty'}
                </Button>
              </div>

              {/* Parsed values - editable or display */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <EditableValueCard 
                  label="Váha" 
                  value={importFile.editedData.weight} 
                  unit="kg"
                  field="weight"
                  isEditing={importFile.isEditing}
                  onEdit={onEditValue}
                />
                <EditableValueCard 
                  label="Tělesný tuk" 
                  value={importFile.editedData.bodyFatPercentage} 
                  unit="%"
                  field="bodyFatPercentage"
                  isEditing={importFile.isEditing}
                  onEdit={onEditValue}
                />
                <EditableValueCard 
                  label="Svalová hmota" 
                  value={importFile.editedData.muscleMass} 
                  unit="kg"
                  field="muscleMass"
                  isEditing={importFile.isEditing}
                  onEdit={onEditValue}
                />
                <EditableValueCard 
                  label="Bazální metabolismus" 
                  value={importFile.editedData.basalMetabolism} 
                  unit="kcal"
                  field="basalMetabolism"
                  isEditing={importFile.isEditing}
                  onEdit={onEditValue}
                />
                <EditableValueCard 
                  label="Viscerální tuk" 
                  value={importFile.editedData.visceralFat} 
                  unit=""
                  field="visceralFat"
                  isEditing={importFile.isEditing}
                  onEdit={onEditValue}
                />
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

interface EditableValueCardProps {
  label: string;
  value: number | undefined;
  unit: string;
  field: keyof ParsedMeasurementData;
  isEditing?: boolean;
  onEdit: (field: keyof ParsedMeasurementData, value: string) => void;
}

function EditableValueCard({ label, value, unit, field, isEditing, onEdit }: EditableValueCardProps) {
  if (isEditing) {
    return (
      <div className="p-3 rounded-lg bg-secondary/50">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            step="0.1"
            value={value ?? ''}
            onChange={(e) => onEdit(field, e.target.value)}
            className="h-8 text-sm bg-background"
            placeholder="—"
          />
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg bg-secondary/50">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">
        {value !== undefined ? (
          <>{value} <span className="text-muted-foreground font-normal">{unit}</span></>
        ) : (
          <span className="text-muted-foreground font-normal italic">neuvedeno</span>
        )}
      </p>
    </div>
  );
}
