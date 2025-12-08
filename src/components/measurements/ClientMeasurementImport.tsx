import { useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Upload, FileText, Check, AlertTriangle, 
  Loader2, Image as ImageIcon, Edit2,
  TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { 
  parseMeasurementPDF, 
  compareMeasurements, 
  type ParsedMeasurementData, 
  type MeasurementComparison 
} from '@/lib/pdfMeasurementParser';
import { 
  parseImageMeasurement, 
  isImageFile, 
  getSupportedFileTypes 
} from '@/lib/imageMeasurementParser';
import { extractTextFromPDF } from '@/lib/pdfExtractor';
import { 
  useCreateMeasurement, 
  useUpdateMeasurement,
  useFindDuplicateMeasurement,
  useMergeMeasurement,
  type Measurement 
} from '@/hooks/useMeasurements';
import { supabase } from '@/integrations/supabase/client';

interface ClientMeasurementImportProps {
  clientId: string;
  clientName: string;
  onSuccess?: () => void;
}

export function ClientMeasurementImport({ 
  clientId, 
  clientName,
  onSuccess 
}: ClientMeasurementImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image'>('pdf');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'parsed' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [parsedData, setParsedData] = useState<ParsedMeasurementData | null>(null);
  const [editedData, setEditedData] = useState<ParsedMeasurementData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [duplicateMeasurement, setDuplicateMeasurement] = useState<Measurement | null>(null);
  const [duplicateAction, setDuplicateAction] = useState<'overwrite' | 'new' | 'merge' | null>(null);
  const [comparisons, setComparisons] = useState<MeasurementComparison[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const createMeasurement = useCreateMeasurement();
  const updateMeasurement = useUpdateMeasurement();
  const findDuplicate = useFindDuplicateMeasurement();
  const mergeMeasurement = useMergeMeasurement();

  const resetState = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setStatus('idle');
    setError(null);
    setWarnings([]);
    setParsedData(null);
    setEditedData(null);
    setIsEditing(false);
    setDuplicateMeasurement(null);
    setDuplicateAction(null);
    setComparisons([]);
  }, [previewUrl]);

  const extractText = async (file: File): Promise<string> => {
    const result = await extractTextFromPDF(file);
    if (!result.success || !result.text) {
      throw new Error(result.error || 'Nepodařilo se přečíst PDF');
    }
    return result.text;
  };

  const processFile = async (selectedFile: File) => {
    setStatus('parsing');
    setError(null);

    try {
      let result;
      const isImage = isImageFile(selectedFile);

      if (isImage) {
        result = await parseImageMeasurement(selectedFile);
      } else {
        const text = await extractText(selectedFile);
        result = parseMeasurementPDF(text);
      }

      if (result.success && result.data) {
        setParsedData(result.data);
        setEditedData({ ...result.data });
        setWarnings(result.warnings || []);

        // Check for duplicate
        const date = result.data.date || new Date().toISOString().split('T')[0];
        const duplicate = await findDuplicate.mutateAsync({ clientId, date });
        setDuplicateMeasurement(duplicate);
        setDuplicateAction(duplicate ? null : 'new');

        // Get previous measurement for comparison
        const { data: measurements } = await supabase
          .from('measurements')
          .select('*')
          .eq('client_id', clientId)
          .order('date', { ascending: false })
          .limit(1);
        
        const previous = measurements?.[0];
        const comparisonResults = compareMeasurements(result.data, previous);
        setComparisons(comparisonResults);

        setStatus('parsed');
      } else {
        setError(result.error || 'Nepodařilo se zpracovat soubor');
        setWarnings(result.warnings || []);
        setStatus('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
      setStatus('error');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const isImage = isImageFile(selectedFile);
    setFile(selectedFile);
    setFileType(isImage ? 'image' : 'pdf');
    
    if (isImage) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }

    await processFile(selectedFile);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditValue = (field: keyof ParsedMeasurementData, value: string) => {
    if (!editedData) return;
    
    let parsedValue: number | string | undefined;
    if (field === 'clientName' || field === 'date' || field === 'rawText') {
      parsedValue = value || undefined;
    } else {
      parsedValue = value ? parseFloat(value.replace(',', '.')) : undefined;
      if (parsedValue !== undefined && isNaN(parsedValue)) {
        parsedValue = undefined;
      }
    }

    setEditedData({
      ...editedData,
      [field]: parsedValue,
    });
  };

  const uploadSourceFile = async (file: File, userId: string): Promise<string | null> => {
    try {
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

  const handleSave = async () => {
    if (!editedData || !file) return;
    if (duplicateMeasurement && !duplicateAction) return;

    setStatus('saving');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Uživatel není přihlášen');
      }

      const date = editedData.date || new Date().toISOString().split('T')[0];
      const fileTypeLabel = fileType === 'image' ? 'fotografie' : 'PDF';
      const sourceFileUrl = await uploadSourceFile(file, user.id);

      const measurementData = {
        client_id: clientId,
        date,
        weight: editedData.weight,
        body_fat_percentage: editedData.bodyFatPercentage,
        muscle_mass: editedData.muscleMass,
        basal_metabolism: editedData.basalMetabolism,
        visceral_fat: editedData.visceralFat,
        notes: `Importováno z ${fileTypeLabel}: ${file.name}`,
        source_file_url: sourceFileUrl,
      };

      if (duplicateMeasurement) {
        if (duplicateAction === 'overwrite') {
          await updateMeasurement.mutateAsync({
            ...measurementData,
            id: duplicateMeasurement.id,
          });
        } else if (duplicateAction === 'merge') {
          await mergeMeasurement.mutateAsync({
            existingId: duplicateMeasurement.id,
            newData: measurementData,
          });
        } else {
          await createMeasurement.mutateAsync(measurementData);
        }
      } else {
        await createMeasurement.mutateAsync(measurementData);
      }

      setStatus('saved');
      toast({
        title: 'Měření uloženo',
        description: `Měření pro ${clientName} bylo úspěšně importováno.`,
      });
      
      // Reset after short delay
      setTimeout(() => {
        resetState();
        onSuccess?.();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se uložit');
      setStatus('error');
    }
  };

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

  const canSave = status === 'parsed' && editedData && (duplicateAction || !duplicateMeasurement);

  return (
    <div className="space-y-4">
      {/* File upload area */}
      {status === 'idle' && (
        <div 
          className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-base font-medium">Nahrajte soubor měření</p>
          <p className="text-sm text-muted-foreground mt-1">PDF nebo fotografie</p>
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            <Badge variant="outline">PDF</Badge>
            <Badge variant="outline">JPG</Badge>
            <Badge variant="outline">PNG</Badge>
            <Badge variant="outline">HEIC</Badge>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={getSupportedFileTypes()}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Parsing state */}
      {status === 'parsing' && (
        <div className="border border-border rounded-xl p-6 text-center">
          <Loader2 className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
          <p className="text-base font-medium">Zpracování souboru...</p>
          <p className="text-sm text-muted-foreground mt-1">{file?.name}</p>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="border border-destructive/50 rounded-xl p-6">
          <div className="text-destructive text-sm mb-4">{error}</div>
          <Button variant="outline" onClick={resetState}>
            Zkusit znovu
          </Button>
        </div>
      )}

      {/* Parsed data */}
      {(status === 'parsed' || status === 'saving' || status === 'saved') && editedData && (
        <div className="border border-border rounded-xl p-4 space-y-4">
          {/* File info */}
          <div className="flex items-center gap-3">
            {fileType === 'image' ? (
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
            ) : (
              <FileText className="w-5 h-5 text-muted-foreground" />
            )}
            <span className="font-medium truncate">{file?.name}</span>
            {status === 'saved' && (
              <Badge className="bg-success text-success-foreground">
                <Check className="w-3 h-3 mr-1" /> Uloženo
              </Badge>
            )}
          </div>

          {/* Image preview */}
          {fileType === 'image' && previewUrl && (
            <div className="rounded-lg overflow-hidden border border-border">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full max-h-48 object-contain bg-secondary/50"
              />
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="p-3 rounded-lg bg-warning/10 text-warning text-sm">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Upozornění</span>
              </div>
              <ul className="list-disc list-inside">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Edit toggle */}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="gap-1"
              disabled={status === 'saving' || status === 'saved'}
            >
              <Edit2 className="w-3 h-3" />
              {isEditing ? 'Dokončit úpravy' : 'Upravit hodnoty'}
            </Button>
          </div>

          {/* Parsed values */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <ValueCard 
              label="Váha" 
              value={editedData.weight} 
              unit="kg"
              field="weight"
              isEditing={isEditing}
              onEdit={handleEditValue}
            />
            <ValueCard 
              label="Tělesný tuk" 
              value={editedData.bodyFatPercentage} 
              unit="%"
              field="bodyFatPercentage"
              isEditing={isEditing}
              onEdit={handleEditValue}
            />
            <ValueCard 
              label="Svalová hmota" 
              value={editedData.muscleMass} 
              unit="kg"
              field="muscleMass"
              isEditing={isEditing}
              onEdit={handleEditValue}
            />
            <ValueCard 
              label="Bazální metabolismus" 
              value={editedData.basalMetabolism} 
              unit="kcal"
              field="basalMetabolism"
              isEditing={isEditing}
              onEdit={handleEditValue}
            />
            <ValueCard 
              label="Viscerální tuk" 
              value={editedData.visceralFat} 
              unit=""
              field="visceralFat"
              isEditing={isEditing}
              onEdit={handleEditValue}
            />
          </div>

          {/* Duplicate handling */}
          {duplicateMeasurement && (
            <div className="p-3 rounded-lg bg-warning/10">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="font-medium text-sm">
                  Existuje záznam ze dne {format(new Date(duplicateMeasurement.date), 'd. MMMM yyyy', { locale: cs })}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={duplicateAction === 'overwrite' ? 'default' : 'outline'}
                  onClick={() => setDuplicateAction('overwrite')}
                  disabled={status === 'saving' || status === 'saved'}
                >
                  Přepsat
                </Button>
                <Button
                  size="sm"
                  variant={duplicateAction === 'new' ? 'default' : 'outline'}
                  onClick={() => setDuplicateAction('new')}
                  disabled={status === 'saving' || status === 'saved'}
                >
                  Vytvořit nový
                </Button>
                <Button
                  size="sm"
                  variant={duplicateAction === 'merge' ? 'default' : 'outline'}
                  onClick={() => setDuplicateAction('merge')}
                  disabled={status === 'saving' || status === 'saved'}
                >
                  Sloučit
                </Button>
              </div>
            </div>
          )}

          {/* Trend comparison */}
          {comparisons.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Porovnání s předchozím měřením</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {comparisons.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                    <span className="text-sm text-muted-foreground">{c.label}</span>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(c.trend)}
                      {c.difference !== null && (
                        <span className={cn(
                          "text-sm font-medium",
                          c.trend === 'better' && "text-success",
                          c.trend === 'worse' && "text-destructive"
                        )}>
                          {c.difference > 0 ? '+' : ''}{c.difference.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {(() => {
            const showActions = status === 'parsed' || status === 'saving';
            const isSaving = status === 'saving';
            if (!showActions) return null;
            return (
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetState} disabled={isSaving}>
                  Zrušit
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={!canSave || isSaving}
                  className="gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Uložit měření
                </Button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// Simple value card component
interface ValueCardProps {
  label: string;
  value?: number;
  unit: string;
  field: keyof ParsedMeasurementData;
  isEditing?: boolean;
  onEdit: (field: keyof ParsedMeasurementData, value: string) => void;
}

function ValueCard({ label, value, unit, field, isEditing, onEdit }: ValueCardProps) {
  if (isEditing) {
    return (
      <div className="p-3 rounded-lg bg-secondary/50">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <div className="flex items-center gap-1 mt-1">
          <Input
            type="text"
            value={value ?? ''}
            onChange={(e) => onEdit(field, e.target.value)}
            className="h-8 text-sm"
          />
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg bg-secondary/50">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">
        {value !== undefined ? `${value} ${unit}` : '—'}
      </p>
    </div>
  );
}
