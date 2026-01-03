import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useCreateWorkoutLog, useDeleteWorkoutLog, useUpdateWorkoutLog } from '@/hooks/useClientWorkoutLogs';
import { useCompleteAssignedWorkout } from '@/hooks/useAssignWorkout';
import { useUnifiedDiary, UnifiedDiaryEntry } from '@/hooks/useUnifiedDiary';
import { useClientPortalPageTracking } from '@/hooks/useClientPortalAnalytics';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { 
  Plus, 
  Dumbbell, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  Clock,
  Target,
  MessageSquare,
  Trophy,
  User,
  Calendar,
  List,
  ClipboardList,
  MoreVertical,
  Pencil
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getWorkoutTypeLabel, getWorkoutTypeIcon, getWorkoutTypeColor } from '@/components/client-portal/workout-diary/WorkoutTypeSelector';
import { getEnergyEmoji } from '@/components/client-portal/workout-diary/EnergyRating';
import { WorkoutStatsCard } from '@/components/client-portal/workout-diary/WorkoutStatsCard';
import { DiaryCalendarView } from '@/components/client-portal/workout-diary/DiaryCalendarView';
import { DiaryPlanView } from '@/components/client-portal/workout-diary/DiaryPlanView';
import { AddWorkoutDialog, ExerciseInput, emptyExercise } from '@/components/client-portal/workout-diary/AddWorkoutDialog';

export default function ClientPortalWorkoutDiary() {
  const { clientId, clientAccount } = useClientPortal();
  const { data: entries, isLoading } = useUnifiedDiary();
  const createLog = useCreateWorkoutLog();
  const updateLog = useUpdateWorkoutLog();
  const deleteLog = useDeleteWorkoutLog();
  const completeAssignedWorkout = useCompleteAssignedWorkout();
  const { trackPortalEvent } = useClientPortalPageTracking('client_portal_workout_diary');

  // Get tab from URL param
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'seznam');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isDetailedMode, setIsDetailedMode] = useState(false); // Quick vs Detailed mode
  const [workoutDate, setWorkoutDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [workoutType, setWorkoutType] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState('');
  const [workoutRpe, setWorkoutRpe] = useState<number | null>(null);
  const [energyBefore, setEnergyBefore] = useState<number | null>(null);
  const [energyAfter, setEnergyAfter] = useState<number | null>(null);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [exercises, setExercises] = useState<ExerciseInput[]>([{ ...emptyExercise }]);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [selectedDateEntries, setSelectedDateEntries] = useState<UnifiedDiaryEntry[]>([]);
  const [dateDetailOpen, setDateDetailOpen] = useState(false);
  
  // For planned workout completion or editing
  const [editingPlannedWorkoutId, setEditingPlannedWorkoutId] = useState<string | null>(null);
  const [editingExistingLogId, setEditingExistingLogId] = useState<string | null>(null);
  
  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<UnifiedDiaryEntry | null>(null);
  
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

  const resetForm = () => {
    setWorkoutDate(format(new Date(), 'yyyy-MM-dd'));
    setWorkoutType(null);
    setDurationMinutes('');
    setWorkoutRpe(null);
    setEnergyBefore(null);
    setEnergyAfter(null);
    setWorkoutNotes('');
    setExercises([{ ...emptyExercise }]);
    setEditingPlannedWorkoutId(null);
    setEditingExistingLogId(null);
    setIsDetailedMode(false);
  };

  // Edit existing workout
  const handleEditWorkout = (entry: UnifiedDiaryEntry) => {
    // Only allow editing self-logged workouts
    if (entry.is_coached) return;
    
    setWorkoutDate(entry.date);
    setWorkoutType(entry.workout_type || null);
    setDurationMinutes(entry.duration_minutes?.toString() || '');
    setWorkoutRpe(null);
    setEnergyBefore(entry.energy_before || null);
    setEnergyAfter(entry.energy_after || null);
    setWorkoutNotes(entry.notes || '');
    setEditingExistingLogId(entry.id);
    setIsDetailedMode(true);
    
    if (entry.exercises && entry.exercises.length > 0) {
      setExercises(entry.exercises.map(ex => ({
        exercise_name: ex.exercise_name,
        exercise_id: undefined,
        sets: ex.sets?.toString() || '',
        reps: ex.reps?.toString() || '',
        weight_kg: ex.weight_kg?.toString() || '',
        duration_seconds: ex.duration_seconds ? (ex.duration_seconds / 60).toString() : '',
        rpe: ex.rpe?.toString() || '',
        notes: ex.notes || '',
      })));
    } else {
      setExercises([{ ...emptyExercise }]);
    }
    
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

  const handleSaveWorkout = async () => {
    if (!clientId || !clientAccount?.trainer_id) return;

    // For quick mode, we don't require exercises
    const validExercises = exercises
      .filter(ex => ex.exercise_name.trim())
      .map((ex, idx) => ({
        exercise_name: ex.exercise_name.trim(),
        exercise_id: ex.exercise_id || null,
        sets: ex.sets ? parseInt(ex.sets) : null,
        reps: ex.reps ? parseInt(ex.reps) : null,
        weight_kg: ex.weight_kg ? parseFloat(ex.weight_kg) : null,
        duration_seconds: ex.duration_seconds ? parseInt(ex.duration_seconds) * 60 : null,
        rpe: ex.rpe ? parseInt(ex.rpe) : null,
        notes: ex.notes || null,
        sort_order: idx,
      }));

    // In quick mode, allow saving without exercises
    // In detailed mode or when completing planned workout, require exercises
    const requiresExercises = isDetailedMode || editingPlannedWorkoutId || editingExistingLogId;
    if (requiresExercises && validExercises.length === 0) {
      return;
    }

    // If completing a planned workout, update existing record
    if (editingPlannedWorkoutId) {
      await completeAssignedWorkout.mutateAsync({
        logId: editingPlannedWorkoutId,
        clientId,
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : undefined,
        rpe: workoutRpe || undefined,
        notes: workoutNotes || undefined,
        energy_before: energyBefore || undefined,
        energy_after: energyAfter || undefined,
      });
      trackPortalEvent('planned_workout_completed', { workout_type: workoutType });
    } else if (editingExistingLogId) {
      // Update existing workout log
      await updateLog.mutateAsync({
        logId: editingExistingLogId,
        clientId,
        date: workoutDate,
        notes: workoutNotes || null,
        workout_type: workoutType,
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
        energy_before: energyBefore,
        energy_after: energyAfter,
        exercises: validExercises,
      });
      trackPortalEvent('workout_updated', { 
        exercise_count: validExercises.length, 
        workout_type: workoutType
      });
    } else {
      // Create new workout log
      await createLog.mutateAsync({
        client_id: clientId,
        trainer_id: clientAccount.trainer_id,
        date: workoutDate,
        notes: workoutNotes || undefined,
        workout_type: workoutType || undefined,
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : undefined,
        energy_before: energyBefore || undefined,
        energy_after: energyAfter || undefined,
        exercises: validExercises.length > 0 ? validExercises : undefined,
      });
      trackPortalEvent('workout_logged', { 
        exercise_count: validExercises.length, 
        workout_type: workoutType,
        mode: isDetailedMode ? 'detailed' : 'quick'
      });
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDateSelect = (date: Date, dayEntries: UnifiedDiaryEntry[]) => {
    if (dayEntries.length > 0) {
      setSelectedDateEntries(dayEntries);
      setDateDetailOpen(true);
    } else {
      // Open add workout dialog for empty day
      setWorkoutDate(format(date, 'yyyy-MM-dd'));
      setDialogOpen(true);
    }
  };

  const handleStartPlannedWorkout = (entry: UnifiedDiaryEntry) => {
    // Pre-fill form with planned workout data
    setWorkoutDate(entry.scheduled_for ? format(parseISO(entry.scheduled_for), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
    setWorkoutType(entry.workout_type || null);
    setDurationMinutes(entry.duration_minutes?.toString() || '');
    setWorkoutNotes(entry.notes || '');
    setEditingPlannedWorkoutId(entry.id); // Track which planned workout we're completing
    setIsDetailedMode(true); // Show detailed mode for planned workouts
    
    if (entry.exercises && entry.exercises.length > 0) {
      setExercises(entry.exercises.map(ex => ({
        exercise_name: ex.exercise_name,
        exercise_id: undefined,
        sets: ex.sets?.toString() || '',
        reps: ex.reps?.toString() || '',
        weight_kg: ex.weight_kg?.toString() || '',
        duration_seconds: ex.duration_seconds ? (ex.duration_seconds / 60).toString() : '',
        rpe: ex.rpe?.toString() || '',
        notes: ex.notes || '',
      })));
    } else {
      setExercises([{ ...emptyExercise }]);
    }
    
    setDialogOpen(true);
  };

  // Get status badge - simplified
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planned':
      case 'draft':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-500/50 bg-yellow-500/10">Naplánovaný</Badge>;
      case 'completed':
      case 'reviewed':
        return <Badge variant="outline" className="text-green-600 border-green-500/50 bg-green-500/10">Hotovo</Badge>;
      default:
        return null;
    }
  };

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

  // Filter for list view - only completed entries
  const completedEntries = (entries?.filter(e => e.status === 'completed' || e.status === 'reviewed') || [])
    .filter(e => filterType === 'all' || e.workout_type === filterType)
    .filter(e => {
      if (filterSource === 'all') return true;
      if (filterSource === 'coached') return e.is_coached;
      if (filterSource === 'self') return !e.is_coached;
      return true;
    });

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
        <Button onClick={() => setDialogOpen(true)}>
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
                exercises: e.exercises?.map(ex => ({
                  is_personal_record: ex.is_personal_record,
                  weight_kg: ex.weight_kg,
                  sets: ex.sets,
                  reps: ex.reps,
                })),
              }))} 
              weeklyGoal={4} 
            />
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Typ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny typy</SelectItem>
                <SelectItem value="strength">Síla</SelectItem>
                <SelectItem value="cardio">Kardio</SelectItem>
                <SelectItem value="run">Běh</SelectItem>
                <SelectItem value="hiit">HIIT</SelectItem>
                <SelectItem value="conditioning">Kondice</SelectItem>
                <SelectItem value="mobility">Mobilita</SelectItem>
                <SelectItem value="recovery">Regenerace</SelectItem>
                <SelectItem value="other">Ostatní</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Zdroj" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Vše</SelectItem>
                <SelectItem value="coached">S trenérem</SelectItem>
                <SelectItem value="self">Samostatně</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Workout Logs */}
          {completedEntries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Dumbbell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-medium mb-2">Zatím žádné záznamy</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Začněte zaznamenávat své tréninky
                </p>
                <Button variant="outline" onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Přidat první trénink
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {completedEntries.map((entry) => {
                const isExpanded = expandedLogs.has(entry.id);
                const exerciseCount = entry.exercises?.length || 0;
                const WorkoutIcon = getWorkoutTypeIcon(entry.workout_type);
                const hasPR = entry.exercises?.some(ex => ex.is_personal_record);

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="overflow-hidden">
                      <div
                        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleLogExpanded(entry.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              entry.is_coached 
                                ? "bg-primary/10" 
                                : "bg-green-500/10",
                              entry.is_coached 
                                ? "text-primary" 
                                : getWorkoutTypeColor(entry.workout_type)
                            )}>
                              {entry.is_coached ? (
                                <User className="w-5 h-5" />
                              ) : (
                                <WorkoutIcon className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">
                                  {format(parseISO(entry.date), 'EEEE d. MMMM', { locale: cs })}
                                </span>
                                <Badge 
                                  variant={entry.is_coached ? "default" : "secondary"} 
                                  className="text-xs"
                                >
                                  {entry.is_coached ? 'S trenérem' : 'Samostatně'}
                                </Badge>
                                {getStatusBadge(entry.status)}
                                {hasPR && (
                                  <Badge variant="secondary" className="text-xs gap-1">
                                    <Trophy className="w-3 h-3" /> PR
                                  </Badge>
                                )}
                                {/* Tags */}
                                {entry.tags && entry.tags.length > 0 && entry.tags.map((tag) => (
                                  <Badge 
                                    key={tag.id}
                                    variant="outline"
                                    className="text-xs"
                                    style={{ 
                                      borderColor: tag.color,
                                      backgroundColor: `${tag.color}15`,
                                      color: tag.color 
                                    }}
                                  >
                                    {tag.name}
                                  </Badge>
                                ))}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{getWorkoutTypeLabel(entry.workout_type)}</span>
                                {exerciseCount > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>{exerciseCount} cviků</span>
                                  </>
                                )}
                                {entry.duration_minutes && (
                                  <>
                                    <span>•</span>
                                    <span>{entry.duration_minutes} min</span>
                                  </>
                                )}
                                {(entry.energy_before || entry.energy_after) && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      {getEnergyEmoji(entry.energy_before)}→{getEnergyEmoji(entry.energy_after)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Edit/Delete dropdown for self-logged workouts */}
                            {!entry.is_coached && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditWorkout(entry); }}>
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Upravit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteWorkout(entry); }}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Smazat
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="px-4 pb-4 border-t pt-4 space-y-3">
                              {entry.notes && (
                                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                                  <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                                  <span>{entry.notes}</span>
                                </div>
                              )}

                              {entry.exercises?.map((ex, idx) => (
                                <div
                                  key={ex.id || idx}
                                  className={cn(
                                    "p-3 rounded-lg",
                                    ex.is_personal_record ? "bg-yellow-500/10 border border-yellow-500/30" : "bg-secondary/30"
                                  )}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{ex.exercise_name}</span>
                                      {ex.is_personal_record && (
                                        <Trophy className="w-4 h-4 text-yellow-500" />
                                      )}
                                    </div>
                                    {ex.rpe && (
                                      <Badge variant="outline" className="text-xs">
                                        RPE {ex.rpe}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                    {ex.sets && (
                                      <span className="flex items-center gap-1">
                                        <Target className="w-3.5 h-3.5" />
                                        {ex.sets} sérií
                                      </span>
                                    )}
                                    {ex.reps && (
                                      <span>{ex.reps} opakování</span>
                                    )}
                                    {ex.weight_kg && (
                                      <span className="font-medium text-foreground">
                                        {ex.weight_kg} kg
                                      </span>
                                    )}
                                    {ex.duration_seconds && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {Math.round(ex.duration_seconds / 60)} min
                                      </span>
                                    )}
                                  </div>
                                  {ex.notes && (
                                    <p className="text-xs text-muted-foreground mt-2 italic">
                                      {ex.notes}
                                    </p>
                                  )}
                                </div>
                              ))}

                              {/* Trainer comment */}
                              {entry.trainer_comment && (
                                <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm">
                                  <User className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                                  <div>
                                    <div className="font-medium text-primary mb-1">Komentář trenéra</div>
                                    <span className="whitespace-pre-wrap">{entry.trainer_comment}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                );
              })}
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
        isDetailedMode={isDetailedMode}
        setIsDetailedMode={setIsDetailedMode}
        workoutDate={workoutDate}
        setWorkoutDate={setWorkoutDate}
        workoutType={workoutType}
        setWorkoutType={setWorkoutType}
        durationMinutes={durationMinutes}
        setDurationMinutes={setDurationMinutes}
        workoutRpe={workoutRpe}
        setWorkoutRpe={setWorkoutRpe}
        energyBefore={energyBefore}
        setEnergyBefore={setEnergyBefore}
        energyAfter={energyAfter}
        setEnergyAfter={setEnergyAfter}
        workoutNotes={workoutNotes}
        setWorkoutNotes={setWorkoutNotes}
        exercises={exercises}
        setExercises={setExercises}
        editingPlannedWorkoutId={editingPlannedWorkoutId}
        editingExistingLogId={editingExistingLogId}
        onSave={handleSaveWorkout}
        isSaving={createLog.isPending || completeAssignedWorkout.isPending || updateLog.isPending}
      />

      {/* Date Detail Dialog */}
      <Dialog open={dateDetailOpen} onOpenChange={setDateDetailOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDateEntries.length > 0 && format(parseISO(selectedDateEntries[0].date), 'EEEE d. MMMM yyyy', { locale: cs })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedDateEntries.map(entry => {
              const WorkoutIcon = getWorkoutTypeIcon(entry.workout_type);
              return (
                <Card key={entry.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        entry.is_coached ? "bg-primary/10 text-primary" : "bg-green-500/10",
                        !entry.is_coached && getWorkoutTypeColor(entry.workout_type)
                      )}>
                        {entry.is_coached ? <User className="w-5 h-5" /> : <WorkoutIcon className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {getWorkoutTypeLabel(entry.workout_type)}
                          <Badge variant={entry.is_coached ? "default" : "secondary"} className="text-xs">
                            {entry.is_coached ? 'S trenérem' : 'Samostatně'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {entry.duration_minutes && `${entry.duration_minutes} min`}
                          {entry.rpe && ` • RPE ${entry.rpe}`}
                        </div>
                      </div>
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground">{entry.notes}</p>
                    )}
                    {entry.exercises && entry.exercises.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {entry.exercises.map((ex, idx) => (
                          <div key={idx} className="text-sm flex items-center gap-2">
                            <Dumbbell className="w-3 h-3 text-muted-foreground" />
                            <span>{ex.exercise_name}</span>
                            {ex.sets && ex.reps && (
                              <span className="text-muted-foreground">
                                {ex.sets}×{ex.reps}
                              </span>
                            )}
                            {ex.weight_kg && (
                              <span className="font-medium">{ex.weight_kg}kg</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
