import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useCreateWorkoutLog, useDeleteWorkoutLog, useUpdateWorkoutLog } from '@/hooks/useClientWorkoutLogs';
import { useCompleteAssignedWorkout } from '@/hooks/useAssignWorkout';
import { useUnifiedDiary, UnifiedDiaryEntry } from '@/hooks/useUnifiedDiary';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { useWorkoutForm } from '@/hooks/useWorkoutForm';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Plus, 
  Dumbbell, 
  Calendar,
  List,
  ClipboardList,
} from 'lucide-react';
import { DiaryCalendarView } from '@/components/client-portal/workout-diary/DiaryCalendarView';
import { DiaryPlanView } from '@/components/client-portal/workout-diary/DiaryPlanView';
import { AddWorkoutDialog } from '@/components/client-portal/workout-diary/AddWorkoutDialog';
import { WorkoutStatsCard } from '@/components/client-portal/workout-diary/WorkoutStatsCard';
import { WorkoutFilters } from '@/components/client-portal/workout-diary/WorkoutFilters';
import { WorkoutListItem } from '@/components/client-portal/workout-diary/WorkoutListItem';
import { WorkoutDateDetailDialog } from '@/components/client-portal/workout-diary/WorkoutDateDetailDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { exportWorkoutDiaryToPDF, exportWorkoutDiaryToCSV } from '@/lib/workoutDiaryExport';

export default function ClientPortalWorkoutDiary() {
  const { clientId, clientAccount } = useClientPortal();
  const { data: entries, isLoading, refetch } = useUnifiedDiary();
  const createLog = useCreateWorkoutLog();
  const updateLog = useUpdateWorkoutLog();
  const deleteLog = useDeleteWorkoutLog();
  const completeAssignedWorkout = useCompleteAssignedWorkout();
  const { trackPortalEvent } = useClientPortalPageTracking('client_portal_workout_diary');

  // Form state management
  const workoutForm = useWorkoutForm();

  // Get tab from URL param
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'seznam');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [selectedDateEntries, setSelectedDateEntries] = useState<UnifiedDiaryEntry[]>([]);
  const [dateDetailOpen, setDateDetailOpen] = useState(false);
  
  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<UnifiedDiaryEntry | null>(null);
  
  // Save as template dialog
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [entryForTemplate, setEntryForTemplate] = useState<UnifiedDiaryEntry | null>(null);
  
  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');

  const toggleLogExpanded = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  // Edit existing workout
  const handleEditWorkout = (entry: UnifiedDiaryEntry) => {
    if (entry.is_coached) return;
    workoutForm.loadFromEntry(entry);
    setDialogOpen(true);
  };

  // Delete workout
  const handleDeleteWorkout = (entry: UnifiedDiaryEntry) => {
    if (entry.is_coached) return;
    setLogToDelete(entry);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!logToDelete || !clientId) return;
    await deleteLog.mutateAsync({ logId: logToDelete.id, clientId });
    setDeleteConfirmOpen(false);
    setLogToDelete(null);
    trackPortalEvent('workout_deleted', { workout_type: logToDelete.workout_type });
  };

  // Repeat workout
  const handleRepeatWorkout = (entry: UnifiedDiaryEntry) => {
    workoutForm.loadForRepeat(entry);
    setDialogOpen(true);
    trackPortalEvent('workout_repeat_started', { workout_type: entry.workout_type });
  };

  // Save as template
  const handleSaveAsTemplate = (entry: UnifiedDiaryEntry) => {
    setEntryForTemplate(entry);
    setTemplateName(entry.workout_type ? `${entry.workout_type} trénink` : 'Můj trénink');
    setTemplateDialogOpen(true);
  };

  const confirmSaveTemplate = async () => {
    if (!entryForTemplate || !clientId || !clientAccount?.trainer_id || !templateName.trim()) return;
    
    setSavingTemplate(true);
    try {
      const { error } = await supabase.from('client_workout_templates').insert({
        client_id: clientId,
        trainer_id: clientAccount.trainer_id,
        name: templateName.trim(),
        workout_type: entryForTemplate.workout_type,
        exercises: entryForTemplate.exercises?.map(ex => ({
          exercise_name: ex.exercise_name,
          sets: ex.sets,
          reps: ex.reps,
          weight_kg: ex.weight_kg,
          duration_seconds: ex.duration_seconds,
        })) || [],
      });
      
      if (error) throw error;
      
      toast.success('Šablona uložena');
      trackPortalEvent('workout_template_saved', { template_name: templateName });
    } catch (err) {
      toast.error('Nepodařilo se uložit šablonu');
    } finally {
      setSavingTemplate(false);
      setTemplateDialogOpen(false);
      setEntryForTemplate(null);
      setTemplateName('');
    }
  };

  const handleSaveWorkout = async () => {
    if (!clientId || !clientAccount?.trainer_id) return;

    const { formState, getValidExercises } = workoutForm;
    const validExercises = getValidExercises();

    // In quick mode, allow saving without exercises
    const requiresExercises = formState.isDetailedMode || formState.editingPlannedWorkoutId || formState.editingExistingLogId;
    if (requiresExercises && validExercises.length === 0) {
      return;
    }

    // If completing a planned workout, update existing record
    if (formState.editingPlannedWorkoutId) {
      await completeAssignedWorkout.mutateAsync({
        logId: formState.editingPlannedWorkoutId,
        clientId,
        duration_minutes: formState.durationMinutes ? parseInt(formState.durationMinutes) : undefined,
        rpe: formState.workoutRpe || undefined,
        notes: formState.workoutNotes || undefined,
        energy_before: formState.energyBefore || undefined,
        energy_after: formState.energyAfter || undefined,
      });
      trackPortalEvent('planned_workout_completed', { workout_type: formState.workoutType });
    } else if (formState.editingExistingLogId) {
      // Update existing workout log
      await updateLog.mutateAsync({
        logId: formState.editingExistingLogId,
        clientId,
        date: formState.workoutDate,
        notes: formState.workoutNotes || null,
        workout_type: formState.workoutType,
        duration_minutes: formState.durationMinutes ? parseInt(formState.durationMinutes) : null,
        energy_before: formState.energyBefore,
        energy_after: formState.energyAfter,
        exercises: validExercises,
      });
      trackPortalEvent('workout_updated', { 
        exercise_count: validExercises.length, 
        workout_type: formState.workoutType
      });
    } else {
      // Create new workout log
      await createLog.mutateAsync({
        client_id: clientId,
        trainer_id: clientAccount.trainer_id,
        date: formState.workoutDate,
        notes: formState.workoutNotes || undefined,
        workout_type: formState.workoutType || undefined,
        duration_minutes: formState.durationMinutes ? parseInt(formState.durationMinutes) : undefined,
        energy_before: formState.energyBefore || undefined,
        energy_after: formState.energyAfter || undefined,
        exercises: validExercises.length > 0 ? validExercises : undefined,
      });
      trackPortalEvent('workout_logged', { 
        exercise_count: validExercises.length, 
        workout_type: formState.workoutType,
        mode: formState.isDetailedMode ? 'detailed' : 'quick'
      });
    }

    setDialogOpen(false);
    workoutForm.resetForm();
  };

  const handleDateSelect = (date: Date, dayEntries: UnifiedDiaryEntry[]) => {
    if (dayEntries.length > 0) {
      setSelectedDateEntries(dayEntries);
      setDateDetailOpen(true);
    } else {
      // Open add workout dialog for empty day
      workoutForm.updateField('workoutDate', format(date, 'yyyy-MM-dd'));
      setDialogOpen(true);
    }
  };

  const handleStartPlannedWorkout = (entry: UnifiedDiaryEntry) => {
    workoutForm.loadFromPlanned(entry);
    setDialogOpen(true);
  };

  const handleOpenNewWorkout = () => {
    workoutForm.resetForm();
    setDialogOpen(true);
  };

  // Filter for list view - only completed entries
  const completedEntries = useMemo(() => {
    return (entries?.filter(e => e.status === 'completed' || e.status === 'reviewed') || [])
      .filter(e => filterType === 'all' || e.workout_type === filterType)
      .filter(e => {
        if (filterSource === 'all') return true;
        if (filterSource === 'coached') return e.is_coached;
        if (filterSource === 'self') return !e.is_coached;
        return true;
      });
  }, [entries, filterType, filterSource]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const isSaving = createLog.isPending || completeAssignedWorkout.isPending || updateLog.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tréninkový deník</h1>
          <p className="text-muted-foreground text-sm">
            Zaznamenej si své tréninky
          </p>
        </div>
        <Button onClick={handleOpenNewWorkout}>
          <Plus className="w-4 h-4 mr-2" />
          Přidat trénink
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="kalendar" className="gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Kalendář</span>
          </TabsTrigger>
          <TabsTrigger value="seznam" className="gap-2">
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Seznam</span>
          </TabsTrigger>
          <TabsTrigger value="plan" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">Plán</span>
          </TabsTrigger>
        </TabsList>

        {/* Calendar Tab */}
        <TabsContent value="kalendar" className="mt-4">
          <DiaryCalendarView 
            entries={entries || []} 
            onDateSelect={handleDateSelect}
          />
        </TabsContent>

        {/* List Tab */}
        <TabsContent value="seznam" className="mt-4 space-y-4">
          {/* Stats Card */}
          {completedEntries.length > 0 && (
            <WorkoutStatsCard 
              logs={completedEntries.filter(e => !e.is_coached).map(e => ({
                id: e.id,
                date: e.date,
                duration_minutes: e.duration_minutes,
                workout_type: e.workout_type,
                notes: e.notes,
                exercises: e.exercises?.map(ex => ({
                  is_personal_record: ex.is_personal_record || ex.is_pr,
                  weight_kg: ex.weight_kg,
                  sets: ex.sets,
                  reps: ex.reps,
                })),
              }))} 
              weeklyGoal={4}
              onExport={(format) => {
                const exportData = completedEntries.map(e => ({
                  id: e.id,
                  date: e.date,
                  workout_type: e.workout_type,
                  duration_minutes: e.duration_minutes,
                  notes: e.notes,
                  exercises: e.exercises,
                  is_coached: e.is_coached,
                }));
                if (format === 'pdf') {
                  exportWorkoutDiaryToPDF(exportData);
                  trackPortalEvent('workout_diary_exported', { format: 'pdf' });
                } else {
                  exportWorkoutDiaryToCSV(exportData);
                  trackPortalEvent('workout_diary_exported', { format: 'csv' });
                }
                toast.success(`Deník exportován jako ${format.toUpperCase()}`);
              }}
            />
          )}

          {/* Filters */}
          <WorkoutFilters
            filterType={filterType}
            setFilterType={setFilterType}
            filterSource={filterSource}
            setFilterSource={setFilterSource}
          />

          {/* Workout Logs */}
          {completedEntries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Dumbbell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-medium mb-2">Zatím žádné záznamy</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Začněte zaznamenávat své tréninky
                </p>
                <Button variant="outline" onClick={handleOpenNewWorkout}>
                  <Plus className="w-4 h-4 mr-2" />
                  Přidat první trénink
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {completedEntries.map((entry) => (
                <WorkoutListItem
                  key={entry.id}
                  entry={entry}
                  isExpanded={expandedLogs.has(entry.id)}
                  onToggleExpand={() => toggleLogExpanded(entry.id)}
                  onEdit={() => handleEditWorkout(entry)}
                  onDelete={() => handleDeleteWorkout(entry)}
                  onRepeat={() => handleRepeatWorkout(entry)}
                  onSaveAsTemplate={() => handleSaveAsTemplate(entry)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Plan Tab */}
        <TabsContent value="plan" className="mt-4">
          <DiaryPlanView onStartWorkout={handleStartPlannedWorkout} />
        </TabsContent>
      </Tabs>

      {/* Add Workout Dialog */}
      <AddWorkoutDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        formState={workoutForm.formState}
        updateField={workoutForm.updateField}
        addExercise={workoutForm.addExercise}
        removeExercise={workoutForm.removeExercise}
        updateExercise={workoutForm.updateExercise}
        updateExerciseName={workoutForm.updateExerciseName}
        onSave={handleSaveWorkout}
        isSaving={isSaving}
        canSave={workoutForm.canSave(isSaving)}
      />

      {/* Date Detail Dialog */}
      <WorkoutDateDetailDialog
        open={dateDetailOpen}
        onOpenChange={setDateDetailOpen}
        entries={selectedDateEntries}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat trénink?</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chceš smazat tento trénink z {logToDelete?.date ? format(parseISO(logToDelete.date), 'd. MMMM yyyy', { locale: cs }) : ''}? 
              Tato akce je nevratná.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLog.isPending ? 'Mažu...' : 'Smazat'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save as Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uložit jako šablonu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Název šablony</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Např. Pondělní silový trénink"
              />
            </div>
            {entryForTemplate?.exercises && entryForTemplate.exercises.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Šablona bude obsahovat {entryForTemplate.exercises.length} cviků
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
              Zrušit
            </Button>
            <Button 
              onClick={confirmSaveTemplate} 
              disabled={!templateName.trim() || savingTemplate}
            >
              {savingTemplate ? 'Ukládám...' : 'Uložit šablonu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
