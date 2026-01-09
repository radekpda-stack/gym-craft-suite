import { useState } from 'react';
import { Download, FileText, TrendingUp, Trophy, List } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClientPerformanceExport, useClientUniqueExercises } from '@/hooks/useClientPerformanceExport';
import { generatePerformancePdf } from '@/lib/clientPerformanceExport';
import { toast } from 'sonner';
import type { ExportPeriod, ExerciseFilter, PerformanceExportOptions } from '@/types/performance-export';

interface ClientPerformanceExportDialogProps {
  clientId: string;
  clientName: string;
  trigger?: React.ReactNode;
}

export function ClientPerformanceExportDialog({
  clientId,
  clientName,
  trigger,
}: ClientPerformanceExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Export settings
  const [period, setPeriod] = useState<ExportPeriod>('90');
  const [exerciseFilter, setExerciseFilter] = useState<ExerciseFilter>('all');
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [includeStats, setIncludeStats] = useState(true);
  const [includeChart, setIncludeChart] = useState(true);
  const [includePRs, setIncludePRs] = useState(true);
  const [includeDetails, setIncludeDetails] = useState(true);

  // Fetch data
  const { data: exportData, isLoading: isLoadingData } = useClientPerformanceExport(
    open ? { clientId, period, exerciseFilter, selectedExercises } : null
  );
  const { data: uniqueExercises } = useClientUniqueExercises(open ? clientId : null);

  const handleExport = async () => {
    if (!exportData) {
      toast.error('Data nejsou k dispozici');
      return;
    }

    setIsExporting(true);
    try {
      const options: PerformanceExportOptions = {
        clientId,
        clientName,
        period,
        exerciseFilter,
        selectedExercises,
        includeStats,
        includeChart,
        includePRs,
        includeDetails,
      };

      await generatePerformancePdf(exportData, options);
      toast.success('PDF bylo vygenerováno');
      setOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Chyba při generování PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const toggleExercise = (exerciseName: string) => {
    setSelectedExercises(prev =>
      prev.includes(exerciseName)
        ? prev.filter(e => e !== exerciseName)
        : [...prev, exerciseName]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export výkonu
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Export výkonnostních dat
          </DialogTitle>
          <DialogDescription>
            Exportujte výkonnostní data klienta {clientName} do PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Period selection */}
          <div className="space-y-2">
            <Label>Období</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as ExportPeriod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Posledních 30 dní</SelectItem>
                <SelectItem value="90">Posledních 90 dní</SelectItem>
                <SelectItem value="180">Posledních 6 měsíců</SelectItem>
                <SelectItem value="365">Poslední rok</SelectItem>
                <SelectItem value="all">Vše</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Exercise filter */}
          <div className="space-y-3">
            <Label>Cviky</Label>
            <RadioGroup
              value={exerciseFilter}
              onValueChange={(v) => setExerciseFilter(v as ExerciseFilter)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-normal cursor-pointer">
                  Všechny cviky
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="prs" id="prs" />
                <Label htmlFor="prs" className="font-normal cursor-pointer">
                  Pouze záznamy s PR
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="font-normal cursor-pointer">
                  Vlastní výběr
                </Label>
              </div>
            </RadioGroup>

            {/* Custom exercise selection */}
            {exerciseFilter === 'custom' && uniqueExercises && (
              <div className="mt-2 max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                {uniqueExercises.map((exercise) => (
                  <div
                    key={exercise.name}
                    className="flex items-center space-x-2 py-1"
                  >
                    <Checkbox
                      id={exercise.name}
                      checked={selectedExercises.includes(exercise.name)}
                      onCheckedChange={() => toggleExercise(exercise.name)}
                    />
                    <Label
                      htmlFor={exercise.name}
                      className="font-normal text-sm cursor-pointer"
                    >
                      {exercise.name}
                    </Label>
                  </div>
                ))}
                {uniqueExercises.length === 0 && (
                  <p className="text-sm text-muted-foreground">Žádné cviky nenalezeny</p>
                )}
              </div>
            )}
          </div>

          {/* Content options */}
          <div className="space-y-3">
            <Label>Obsah PDF</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeStats"
                  checked={includeStats}
                  onCheckedChange={(c) => setIncludeStats(!!c)}
                />
                <Label htmlFor="includeStats" className="font-normal cursor-pointer flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  Souhrn statistik
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeChart"
                  checked={includeChart}
                  onCheckedChange={(c) => setIncludeChart(!!c)}
                />
                <Label htmlFor="includeChart" className="font-normal cursor-pointer flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  Graf progrese
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includePRs"
                  checked={includePRs}
                  onCheckedChange={(c) => setIncludePRs(!!c)}
                />
                <Label htmlFor="includePRs" className="font-normal cursor-pointer flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-muted-foreground" />
                  Osobní rekordy
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeDetails"
                  checked={includeDetails}
                  onCheckedChange={(c) => setIncludeDetails(!!c)}
                />
                <Label htmlFor="includeDetails" className="font-normal cursor-pointer flex items-center gap-2">
                  <List className="w-4 h-4 text-muted-foreground" />
                  Detailní záznamy
                </Label>
              </div>
            </div>
          </div>

          {/* Preview stats */}
          {exportData && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <p className="font-medium">Náhled:</p>
              <p className="text-muted-foreground">
                {exportData.stats.totalEntries} záznamů · {exportData.stats.totalSessions} tréninků · {exportData.stats.totalPRs} PR
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Zrušit
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || isLoadingData || !exportData}
          >
            {isExporting ? (
              'Generuji...'
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Exportovat PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
