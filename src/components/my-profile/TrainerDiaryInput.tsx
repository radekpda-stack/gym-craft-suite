import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Upload, Loader2, Check, X, Sparkles } from 'lucide-react';
import { useGarminOCR, useCreateDiaryEntry, useUploadDiaryScreenshot, type GarminOCRResult } from '@/hooks/useTrainerDiary';
import { format } from 'date-fns';

const ACTIVITY_TYPES = [
  { value: 'running', label: 'Běh', icon: '🏃' },
  { value: 'cycling', label: 'Cyklistika', icon: '🚴' },
  { value: 'swimming', label: 'Plavání', icon: '🏊' },
  { value: 'strength', label: 'Síla', icon: '🏋️' },
  { value: 'hiit', label: 'HIIT', icon: '⚡' },
  { value: 'walking', label: 'Chůze', icon: '🚶' },
  { value: 'hiking', label: 'Turistika', icon: '🥾' },
  { value: 'other', label: 'Jiné', icon: '🎯' },
];

interface FormData {
  date: string;
  activityType: string;
  title: string;
  durationSeconds: number | null;
  distanceMeters: number | null;
  pacePerKm: number | null;
  speedKmh: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  calories: number | null;
  cadence: number | null;
  elevationGain: number | null;
  notes: string;
}

const initialFormData: FormData = {
  date: format(new Date(), 'yyyy-MM-dd'),
  activityType: 'running',
  title: '',
  durationSeconds: null,
  distanceMeters: null,
  pacePerKm: null,
  speedKmh: null,
  avgHeartRate: null,
  maxHeartRate: null,
  calories: null,
  cadence: null,
  elevationGain: null,
  notes: '',
};

export function TrainerDiaryInput() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrComplete, setOcrComplete] = useState(false);
  const [rawOcrData, setRawOcrData] = useState<GarminOCRResult | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const garminOCR = useGarminOCR();
  const createEntry = useCreateDiaryEntry();
  const uploadScreenshot = useUploadDiaryScreenshot();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScreenshotFile(file);
    setOcrComplete(false);
    setRawOcrData(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setScreenshotPreview(base64);
      
      // Automatically start OCR
      setIsProcessing(true);
      try {
        const result = await garminOCR.mutateAsync(base64);
        setRawOcrData(result);
        
        // Map OCR result to form data
        setFormData(prev => ({
          ...prev,
          date: result.date || prev.date,
          activityType: result.activityType || prev.activityType,
          title: result.title || prev.title,
          durationSeconds: result.durationSeconds,
          distanceMeters: result.distanceMeters,
          pacePerKm: result.pacePerKm,
          speedKmh: result.speedKmh,
          avgHeartRate: result.avgHeartRate,
          maxHeartRate: result.maxHeartRate,
          calories: result.calories,
          cadence: result.cadence,
          elevationGain: result.elevationGain,
        }));
        
        setOcrComplete(true);
      } catch (error) {
        console.error('OCR failed:', error);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let screenshotUrl: string | null = null;
    
    // Upload screenshot if exists
    if (screenshotFile) {
      try {
        screenshotUrl = await uploadScreenshot.mutateAsync(screenshotFile);
      } catch (error) {
        console.error('Failed to upload screenshot:', error);
      }
    }

    await createEntry.mutateAsync({
      date: formData.date,
      activity_type: formData.activityType,
      title: formData.title || null,
      duration_seconds: formData.durationSeconds,
      distance_meters: formData.distanceMeters,
      pace_per_km: formData.pacePerKm,
      speed_kmh: formData.speedKmh,
      avg_heart_rate: formData.avgHeartRate,
      max_heart_rate: formData.maxHeartRate,
      calories: formData.calories,
      cadence: formData.cadence,
      elevation_gain: formData.elevationGain,
      notes: formData.notes || null,
      source: screenshotFile ? 'garmin_ocr' : 'manual',
      screenshot_url: screenshotUrl,
      raw_ocr_data: rawOcrData ? JSON.parse(JSON.stringify(rawOcrData)) : null,
    });

    // Reset form
    setFormData(initialFormData);
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setOcrComplete(false);
    setRawOcrData(null);
  };

  const clearScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setOcrComplete(false);
    setRawOcrData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const parseDuration = (value: string): number | null => {
    const parts = value.split(':').map(Number);
    if (parts.some(isNaN)) return null;
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return null;
  };

  const formatPace = (seconds: number | null): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const parsePace = (value: string): number | null => {
    const parts = value.split(':').map(Number);
    if (parts.length !== 2 || parts.some(isNaN)) return null;
    return parts[0] * 60 + parts[1];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Přidat trénink z Garmin
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Screenshot Upload Section */}
          <div className="space-y-3">
            <Label>Screenshot z Garmin Connect</Label>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {!screenshotPreview ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">Nahrát screenshot</p>
                  <p className="text-xs text-muted-foreground">
                    AI automaticky rozpozná hodnoty z obrázku
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative">
                <img 
                  src={screenshotPreview} 
                  alt="Screenshot" 
                  className="w-full max-h-64 object-contain rounded-lg border"
                />
                
                {/* Processing overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm font-medium">AI analyzuje screenshot...</p>
                    </div>
                  </div>
                )}
                
                {/* Success badge */}
                {ocrComplete && !isProcessing && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Rozpoznáno
                  </div>
                )}
                
                {/* Clear button */}
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 left-2"
                  onClick={clearScreenshot}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Datum</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="activityType">Typ aktivity</Label>
              <Select
                value={formData.activityType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, activityType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Název tréninku (volitelné)</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Např. Ranní běh"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Čas (MM:SS nebo HH:MM:SS)</Label>
              <Input
                id="duration"
                value={formatDuration(formData.durationSeconds)}
                onChange={(e) => setFormData(prev => ({ ...prev, durationSeconds: parseDuration(e.target.value) }))}
                placeholder="45:00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="distance">Vzdálenost (km)</Label>
              <Input
                id="distance"
                type="number"
                step="0.01"
                value={formData.distanceMeters ? (formData.distanceMeters / 1000).toFixed(2) : ''}
                onChange={(e) => setFormData(prev => ({ ...prev, distanceMeters: e.target.value ? parseFloat(e.target.value) * 1000 : null }))}
                placeholder="10.5"
              />
            </div>
            
            {(formData.activityType === 'running' || formData.activityType === 'walking') && (
              <div className="space-y-2">
                <Label htmlFor="pace">Tempo (/km)</Label>
                <Input
                  id="pace"
                  value={formatPace(formData.pacePerKm)}
                  onChange={(e) => setFormData(prev => ({ ...prev, pacePerKm: parsePace(e.target.value) }))}
                  placeholder="5:30"
                />
              </div>
            )}
            
            {formData.activityType === 'cycling' && (
              <div className="space-y-2">
                <Label htmlFor="speed">Rychlost (km/h)</Label>
                <Input
                  id="speed"
                  type="number"
                  step="0.1"
                  value={formData.speedKmh || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, speedKmh: e.target.value ? parseFloat(e.target.value) : null }))}
                  placeholder="25.5"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="avgHr">Průměrný tep</Label>
              <Input
                id="avgHr"
                type="number"
                value={formData.avgHeartRate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, avgHeartRate: e.target.value ? parseInt(e.target.value) : null }))}
                placeholder="145"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxHr">Max tep</Label>
              <Input
                id="maxHr"
                type="number"
                value={formData.maxHeartRate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, maxHeartRate: e.target.value ? parseInt(e.target.value) : null }))}
                placeholder="175"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="calories">Kalorie</Label>
              <Input
                id="calories"
                type="number"
                value={formData.calories || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, calories: e.target.value ? parseInt(e.target.value) : null }))}
                placeholder="450"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="elevation">Převýšení (m)</Label>
              <Input
                id="elevation"
                type="number"
                value={formData.elevationGain || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, elevationGain: e.target.value ? parseInt(e.target.value) : null }))}
                placeholder="120"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Poznámky</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Jak se ti dařilo? Jak ses cítil?"
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={createEntry.isPending || uploadScreenshot.isPending}
          >
            {(createEntry.isPending || uploadScreenshot.isPending) ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Ukládám...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Uložit do deníku
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
