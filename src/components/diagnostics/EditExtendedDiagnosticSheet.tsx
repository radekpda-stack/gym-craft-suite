import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  User, Heart, Target, Activity, Brain, Apple, 
  Camera, Sparkles, AlertTriangle, Loader2,
  Plus, X, ChevronRight, Save, FileText, ClipboardCheck,
  TrendingUp, TrendingDown, Minus, ChevronDown, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Diagnostic, useUpdateDiagnostic, useDeleteDiagnostic, AreaType } from "@/hooks/useDiagnostics";
import { useDiagnosticAssessment, useUpdateDiagnosticAssessment, DiagnosticAssessment } from "@/hooks/useDiagnosticAssessment";
import { useDiagnosticAI, FinalSummaryResult } from "@/hooks/useDiagnosticAI";
import {
  DiagnosticLevel,
  DIAGNOSTIC_LEVELS,
  MOBILITY_OPTIONS,
  PAIN_OPTIONS,
  SIDE_OPTIONS,
  PAIN_DURATION_OPTIONS,
  PAIN_TRIGGER_OPTIONS,
  TRAINING_STYLES,
  REGENERATION_METHODS,
  EATING_REGULARITY_OPTIONS,
  TABS_CONFIG,
  MOBILITY_AREAS,
  MOVEMENT_QUALITY_AREAS,
  PAIN_AREAS,
} from "./diagnosticConstants";

interface EditExtendedDiagnosticSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diagnostic: Diagnostic | null;
  clientName?: string;
  previousAssessment?: DiagnosticAssessment | null;
}

interface FormData {
  // Diagnostic level
  diagnosticLevel: DiagnosticLevel;
  
  // Basic diagnostic fields
  date: string;
  areaType: string;
  areaName: string;
  findings: string;
  notes: string;
  
  // Personal Info
  handedness: string;
  occupation: string;
  sittingHoursDaily: number;
  
  // Lifestyle
  sportsHistory: string;
  currentActivities: string[];
  sleepHours: number;
  sleepQuality: number;
  stressLevel: number;
  regenerationMethods: string[];
  meditates: boolean;
  
  // Health
  diseases: string[];
  surgeries: string[];
  injuries: string[];
  painAreas: string[];
  allergies: string[];
  familyHealthHistory: string;
  
  // Goals
  shortTermGoals: string;
  longTermGoals: string;
  trainingPriorities: string[];
  
  // Mobility with side and notes
  mobilityAnkles: string;
  mobilityAnklesSide: string;
  mobilityAnklesNote: string;
  mobilityHips: string;
  mobilityHipsSide: string;
  mobilityHipsNote: string;
  mobilityThoracic: string;
  mobilityThoracicSide: string;
  mobilityThoracicNote: string;
  mobilityShoulders: string;
  mobilityShouldersSide: string;
  mobilityShouldersNote: string;
  coreStability: string;
  coreStabilityNote: string;
  
  // Movement quality
  squatQuality: string;
  squatSide: string;
  squatNote: string;
  lungeQuality: string;
  lungeSide: string;
  lungeNote: string;
  pushQuality: string;
  pushSide: string;
  pushNote: string;
  pullQuality: string;
  pullSide: string;
  pullNote: string;
  hipHingeQuality: string;
  hipHingeSide: string;
  hipHingeNote: string;
  
  // Pain
  painAnkle: string;
  painAnkleDuration: string;
  painAnkleTrigger: string[];
  painAnkleSide: string;
  painKnee: string;
  painKneeDuration: string;
  painKneeTrigger: string[];
  painKneeSide: string;
  painHip: string;
  painHipDuration: string;
  painHipTrigger: string[];
  painHipSide: string;
  painSi: string;
  painSiDuration: string;
  painSiTrigger: string[];
  painSiSide: string;
  painLumbar: string;
  painLumbarDuration: string;
  painLumbarTrigger: string[];
  painLumbarSide: string;
  painThoracic: string;
  painThoracicDuration: string;
  painThoracicTrigger: string[];
  painThoracicSide: string;
  painShoulder: string;
  painShoulderDuration: string;
  painShoulderTrigger: string[];
  painShoulderSide: string;
  painNeck: string;
  painNeckDuration: string;
  painNeckTrigger: string[];
  painNeckSide: string;
  
  // Psychology
  preferredTrainingStyle: string;
  trainingBarrier: string;
  
  // Nutrition
  eatingRegularity: string;
  allRestrictions: string[];
  supplements: string[];
  
  // Trainer notes
  trainerRisks: string;
  trainerPriorities: string;
  trainerLimitations: string;
  trainerOtherNotes: string;
  
  // AI
  aiAnalysis?: FinalSummaryResult;
}

const defaultFormData: FormData = {
  diagnosticLevel: 'functional',
  date: '',
  areaType: '',
  areaName: '',
  findings: '',
  notes: '',
  handedness: 'right',
  occupation: '',
  sittingHoursDaily: 0,
  sportsHistory: '',
  currentActivities: [],
  sleepHours: 7,
  sleepQuality: 3,
  stressLevel: 3,
  regenerationMethods: [],
  meditates: false,
  diseases: [],
  surgeries: [],
  injuries: [],
  painAreas: [],
  allergies: [],
  familyHealthHistory: '',
  shortTermGoals: '',
  longTermGoals: '',
  trainingPriorities: [],
  mobilityAnkles: 'ok',
  mobilityAnklesSide: '',
  mobilityAnklesNote: '',
  mobilityHips: 'ok',
  mobilityHipsSide: '',
  mobilityHipsNote: '',
  mobilityThoracic: 'ok',
  mobilityThoracicSide: '',
  mobilityThoracicNote: '',
  mobilityShoulders: 'ok',
  mobilityShouldersSide: '',
  mobilityShouldersNote: '',
  coreStability: 'ok',
  coreStabilityNote: '',
  squatQuality: 'ok',
  squatSide: '',
  squatNote: '',
  lungeQuality: 'ok',
  lungeSide: '',
  lungeNote: '',
  pushQuality: 'ok',
  pushSide: '',
  pushNote: '',
  pullQuality: 'ok',
  pullSide: '',
  pullNote: '',
  hipHingeQuality: 'ok',
  hipHingeSide: '',
  hipHingeNote: '',
  painAnkle: 'none',
  painAnkleDuration: '',
  painAnkleTrigger: [],
  painAnkleSide: '',
  painKnee: 'none',
  painKneeDuration: '',
  painKneeTrigger: [],
  painKneeSide: '',
  painHip: 'none',
  painHipDuration: '',
  painHipTrigger: [],
  painHipSide: '',
  painSi: 'none',
  painSiDuration: '',
  painSiTrigger: [],
  painSiSide: '',
  painLumbar: 'none',
  painLumbarDuration: '',
  painLumbarTrigger: [],
  painLumbarSide: '',
  painThoracic: 'none',
  painThoracicDuration: '',
  painThoracicTrigger: [],
  painThoracicSide: '',
  painShoulder: 'none',
  painShoulderDuration: '',
  painShoulderTrigger: [],
  painShoulderSide: '',
  painNeck: 'none',
  painNeckDuration: '',
  painNeckTrigger: [],
  painNeckSide: '',
  preferredTrainingStyle: '',
  trainingBarrier: '',
  eatingRegularity: '',
  allRestrictions: [],
  supplements: [],
  trainerRisks: '',
  trainerPriorities: '',
  trainerLimitations: '',
  trainerOtherNotes: '',
};

// Map database fields to form fields
function mapAssessmentToForm(assessment: DiagnosticAssessment | null | undefined): Partial<FormData> {
  if (!assessment) return {};
  
  return {
    diagnosticLevel: (assessment.diagnostic_level as DiagnosticLevel) || 'functional',
    handedness: assessment.handedness || 'right',
    occupation: assessment.occupation || '',
    sittingHoursDaily: assessment.sitting_hours_daily || 0,
    sportsHistory: assessment.sports_history || '',
    currentActivities: assessment.current_activities || [],
    sleepHours: assessment.sleep_hours || 7,
    sleepQuality: assessment.sleep_quality || 3,
    stressLevel: assessment.stress_level || 3,
    regenerationMethods: assessment.regeneration_methods || [],
    meditates: assessment.meditates || false,
    diseases: assessment.diseases || [],
    surgeries: assessment.surgeries || [],
    injuries: assessment.injuries || [],
    painAreas: assessment.pain_areas || [],
    allergies: assessment.allergies || [],
    familyHealthHistory: assessment.family_health_history || '',
    shortTermGoals: assessment.short_term_goals || '',
    longTermGoals: assessment.long_term_goals || '',
    trainingPriorities: assessment.training_priorities || [],
    // Mobility
    mobilityAnkles: assessment.mobility_ankles || 'ok',
    mobilityAnklesSide: assessment.mobility_ankles_side || '',
    mobilityAnklesNote: assessment.mobility_ankles_note || '',
    mobilityHips: assessment.mobility_hips || 'ok',
    mobilityHipsSide: assessment.mobility_hips_side || '',
    mobilityHipsNote: assessment.mobility_hips_note || '',
    mobilityThoracic: assessment.mobility_thoracic || 'ok',
    mobilityThoracicSide: assessment.mobility_thoracic_side || '',
    mobilityThoracicNote: assessment.mobility_thoracic_note || '',
    mobilityShoulders: assessment.mobility_shoulders || 'ok',
    mobilityShouldersSide: assessment.mobility_shoulders_side || '',
    mobilityShouldersNote: assessment.mobility_shoulders_note || '',
    coreStability: assessment.core_stability || 'ok',
    coreStabilityNote: assessment.core_stability_note || '',
    // Movement
    squatQuality: assessment.squat_quality || 'ok',
    squatSide: assessment.squat_side || '',
    squatNote: assessment.squat_note || '',
    lungeQuality: assessment.lunge_quality || 'ok',
    lungeSide: assessment.lunge_side || '',
    lungeNote: assessment.lunge_note || '',
    pushQuality: assessment.push_quality || 'ok',
    pushSide: assessment.push_side || '',
    pushNote: assessment.push_note || '',
    pullQuality: assessment.pull_quality || 'ok',
    pullSide: assessment.pull_side || '',
    pullNote: assessment.pull_note || '',
    hipHingeQuality: assessment.hip_hinge_quality || 'ok',
    hipHingeSide: assessment.hip_hinge_side || '',
    hipHingeNote: assessment.hip_hinge_note || '',
    // Pain
    painAnkle: assessment.pain_ankle || 'none',
    painAnkleDuration: assessment.pain_ankle_duration || '',
    painAnkleTrigger: assessment.pain_ankle_trigger || [],
    painAnkleSide: assessment.pain_ankle_side || '',
    painKnee: assessment.pain_knee || 'none',
    painKneeDuration: assessment.pain_knee_duration || '',
    painKneeTrigger: assessment.pain_knee_trigger || [],
    painKneeSide: assessment.pain_knee_side || '',
    painHip: assessment.pain_hip || 'none',
    painHipDuration: assessment.pain_hip_duration || '',
    painHipTrigger: assessment.pain_hip_trigger || [],
    painHipSide: assessment.pain_hip_side || '',
    painSi: assessment.pain_si || 'none',
    painSiDuration: assessment.pain_si_duration || '',
    painSiTrigger: assessment.pain_si_trigger || [],
    painSiSide: assessment.pain_si_side || '',
    painLumbar: assessment.pain_lumbar || 'none',
    painLumbarDuration: assessment.pain_lumbar_duration || '',
    painLumbarTrigger: assessment.pain_lumbar_trigger || [],
    painLumbarSide: assessment.pain_lumbar_side || '',
    painThoracic: assessment.pain_thoracic || 'none',
    painThoracicDuration: assessment.pain_thoracic_duration || '',
    painThoracicTrigger: assessment.pain_thoracic_trigger || [],
    painThoracicSide: assessment.pain_thoracic_side || '',
    painShoulder: assessment.pain_shoulder || 'none',
    painShoulderDuration: assessment.pain_shoulder_duration || '',
    painShoulderTrigger: assessment.pain_shoulder_trigger || [],
    painShoulderSide: assessment.pain_shoulder_side || '',
    painNeck: assessment.pain_neck || 'none',
    painNeckDuration: assessment.pain_neck_duration || '',
    painNeckTrigger: assessment.pain_neck_trigger || [],
    painNeckSide: assessment.pain_neck_side || '',
    // Psychology
    preferredTrainingStyle: assessment.preferred_training_style || '',
    trainingBarrier: assessment.training_barrier || '',
    // Nutrition
    eatingRegularity: assessment.eating_regularity || '',
    allRestrictions: assessment.all_restrictions || assessment.dietary_restrictions || [],
    supplements: assessment.supplements || [],
    // Trainer notes
    trainerRisks: assessment.trainer_risks || '',
    trainerPriorities: assessment.trainer_priorities || '',
    trainerLimitations: assessment.trainer_limitations || '',
    trainerOtherNotes: assessment.trainer_other_notes || '',
  };
}

export function EditExtendedDiagnosticSheet({
  open,
  onOpenChange,
  diagnostic,
  clientName,
  previousAssessment,
}: EditExtendedDiagnosticSheetProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('conclusion');
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [tempInput, setTempInput] = useState<Record<string, string>>({});
  const [showAISection, setShowAISection] = useState(false);
  
  const updateDiagnostic = useUpdateDiagnostic();
  const deleteDiagnostic = useDeleteDiagnostic();
  const updateAssessment = useUpdateDiagnosticAssessment();
  
  const { data: assessment, isLoading: isLoadingAssessment } = useDiagnosticAssessment(diagnostic?.id);
  
  const { isAnalyzing, finalSummary, generateFinalSummary } = useDiagnosticAI();

  // Load data when diagnostic/assessment changes
  useEffect(() => {
    if (diagnostic) {
      const assessmentData = mapAssessmentToForm(assessment);
      setFormData({
        ...defaultFormData,
        date: diagnostic.date,
        areaType: diagnostic.area_type,
        areaName: diagnostic.area_name,
        findings: diagnostic.findings,
        notes: diagnostic.notes || '',
        ...assessmentData,
      });
    }
  }, [diagnostic, assessment]);

  const availableTabs = TABS_CONFIG[formData.diagnosticLevel] || TABS_CONFIG.functional;

  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[availableTabs.length - 1]); // Default to conclusion
    }
  }, [formData.diagnosticLevel, availableTabs, activeTab]);

  const updateField = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const addToArray = useCallback((field: keyof FormData, value: string) => {
    if (!value.trim()) return;
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[] || []), value.trim()]
    }));
    setTempInput(prev => ({ ...prev, [field]: '' }));
  }, []);

  const removeFromArray = useCallback((field: keyof FormData, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }));
  }, []);

  const toggleArrayItem = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => {
      const arr = prev[field] as string[] || [];
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter(v => v !== value) };
      }
      return { ...prev, [field]: [...arr, value] };
    });
  }, []);

  const handleSubmit = async () => {
    if (!diagnostic) return;
    
    // Update basic diagnostic
    await updateDiagnostic.mutateAsync({
      id: diagnostic.id,
      date: formData.date,
      area_type: formData.areaType as AreaType,
      area_name: formData.areaName,
      findings: formData.findings,
      notes: formData.notes,
    });
    
    // Update or create assessment
    if (assessment) {
      await updateAssessment.mutateAsync({
        id: assessment.id,
        diagnostic_level: formData.diagnosticLevel,
        handedness: formData.handedness,
        occupation: formData.occupation,
        sitting_hours_daily: formData.sittingHoursDaily,
        sports_history: formData.sportsHistory,
        current_activities: formData.currentActivities,
        sleep_hours: formData.sleepHours,
        sleep_quality: formData.sleepQuality,
        stress_level: formData.stressLevel,
        regeneration_methods: formData.regenerationMethods,
        meditates: formData.meditates,
        diseases: formData.diseases,
        surgeries: formData.surgeries,
        injuries: formData.injuries,
        pain_areas: formData.painAreas,
        allergies: formData.allergies,
        family_health_history: formData.familyHealthHistory,
        short_term_goals: formData.shortTermGoals,
        long_term_goals: formData.longTermGoals,
        training_priorities: formData.trainingPriorities,
        // Mobility
        mobility_ankles: formData.mobilityAnkles,
        mobility_ankles_side: formData.mobilityAnklesSide,
        mobility_ankles_note: formData.mobilityAnklesNote,
        mobility_hips: formData.mobilityHips,
        mobility_hips_side: formData.mobilityHipsSide,
        mobility_hips_note: formData.mobilityHipsNote,
        mobility_thoracic: formData.mobilityThoracic,
        mobility_thoracic_side: formData.mobilityThoracicSide,
        mobility_thoracic_note: formData.mobilityThoracicNote,
        mobility_shoulders: formData.mobilityShoulders,
        mobility_shoulders_side: formData.mobilityShouldersSide,
        mobility_shoulders_note: formData.mobilityShouldersNote,
        core_stability: formData.coreStability,
        core_stability_note: formData.coreStabilityNote,
        // Movement
        squat_quality: formData.squatQuality,
        squat_side: formData.squatSide,
        squat_note: formData.squatNote,
        lunge_quality: formData.lungeQuality,
        lunge_side: formData.lungeSide,
        lunge_note: formData.lungeNote,
        push_quality: formData.pushQuality,
        push_side: formData.pushSide,
        push_note: formData.pushNote,
        pull_quality: formData.pullQuality,
        pull_side: formData.pullSide,
        pull_note: formData.pullNote,
        hip_hinge_quality: formData.hipHingeQuality,
        hip_hinge_side: formData.hipHingeSide,
        hip_hinge_note: formData.hipHingeNote,
        // Pain
        pain_ankle: formData.painAnkle,
        pain_ankle_duration: formData.painAnkleDuration,
        pain_ankle_trigger: formData.painAnkleTrigger,
        pain_ankle_side: formData.painAnkleSide,
        pain_knee: formData.painKnee,
        pain_knee_duration: formData.painKneeDuration,
        pain_knee_trigger: formData.painKneeTrigger,
        pain_knee_side: formData.painKneeSide,
        pain_hip: formData.painHip,
        pain_hip_duration: formData.painHipDuration,
        pain_hip_trigger: formData.painHipTrigger,
        pain_hip_side: formData.painHipSide,
        pain_si: formData.painSi,
        pain_si_duration: formData.painSiDuration,
        pain_si_trigger: formData.painSiTrigger,
        pain_si_side: formData.painSiSide,
        pain_lumbar: formData.painLumbar,
        pain_lumbar_duration: formData.painLumbarDuration,
        pain_lumbar_trigger: formData.painLumbarTrigger,
        pain_lumbar_side: formData.painLumbarSide,
        pain_thoracic: formData.painThoracic,
        pain_thoracic_duration: formData.painThoracicDuration,
        pain_thoracic_trigger: formData.painThoracicTrigger,
        pain_thoracic_side: formData.painThoracicSide,
        pain_shoulder: formData.painShoulder,
        pain_shoulder_duration: formData.painShoulderDuration,
        pain_shoulder_trigger: formData.painShoulderTrigger,
        pain_shoulder_side: formData.painShoulderSide,
        pain_neck: formData.painNeck,
        pain_neck_duration: formData.painNeckDuration,
        pain_neck_trigger: formData.painNeckTrigger,
        pain_neck_side: formData.painNeckSide,
        // Psychology
        preferred_training_style: formData.preferredTrainingStyle,
        training_barrier: formData.trainingBarrier,
        // Nutrition
        eating_regularity: formData.eatingRegularity,
        all_restrictions: formData.allRestrictions,
        supplements: formData.supplements,
        // Trainer notes
        trainer_risks: formData.trainerRisks,
        trainer_priorities: formData.trainerPriorities,
        trainer_limitations: formData.trainerLimitations,
        trainer_other_notes: formData.trainerOtherNotes,
      });
    }
    
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!diagnostic) return;
    await deleteDiagnostic.mutateAsync(diagnostic.id);
    setShowDeleteDialog(false);
    onOpenChange(false);
  };

  const handleGenerateSummary = async () => {
    const summary = await generateFinalSummary({
      clientName,
      handedness: formData.handedness,
      occupation: formData.occupation,
      sittingHours: formData.sittingHoursDaily,
      sportsHistory: formData.sportsHistory,
      currentActivities: formData.currentActivities,
      sleepHours: formData.sleepHours,
      sleepQuality: formData.sleepQuality,
      stressLevel: formData.stressLevel,
      diseases: formData.diseases,
      surgeries: formData.surgeries,
      injuries: formData.injuries,
      painAreas: formData.painAreas,
      allergies: formData.allergies,
      shortTermGoals: formData.shortTermGoals,
      longTermGoals: formData.longTermGoals,
      mobilityAnkles: formData.mobilityAnkles,
      mobilityHips: formData.mobilityHips,
      mobilityThoracic: formData.mobilityThoracic,
      mobilityShoulders: formData.mobilityShoulders,
      coreStability: formData.coreStability,
      squatQuality: formData.squatQuality,
      lungeQuality: formData.lungeQuality,
      pushQuality: formData.pushQuality,
      pullQuality: formData.pullQuality,
      hipHingeQuality: formData.hipHingeQuality,
      painAnkle: formData.painAnkle,
      painKnee: formData.painKnee,
      painHip: formData.painHip,
      painSi: formData.painSi,
      painLumbar: formData.painLumbar,
      painThoracic: formData.painThoracic,
      painShoulder: formData.painShoulder,
      painNeck: formData.painNeck,
      preferredTrainingStyle: formData.preferredTrainingStyle,
      eatingRegularity: formData.eatingRegularity,
      supplements: formData.supplements,
      dietaryRestrictions: formData.allRestrictions,
      trainerNotes: `Rizika: ${formData.trainerRisks}\nPriority: ${formData.trainerPriorities}\nOmezení: ${formData.trainerLimitations}`,
    });
    
    if (summary) {
      updateField('aiAnalysis', summary);
    }
  };

  const tabsConfig = [
    { id: 'client', label: 'Klient', icon: User },
    { id: 'lifestyle', label: 'Životní styl', icon: Activity },
    { id: 'health', label: 'Zdraví', icon: Heart },
    { id: 'goals', label: 'Cíle', icon: Target },
    { id: 'mobility', label: 'Mobilita', icon: Activity },
    { id: 'pain', label: 'Bolest', icon: AlertTriangle },
    { id: 'psychology', label: 'Psychika', icon: Brain },
    { id: 'nutrition', label: 'Strava', icon: Apple },
    { id: 'conclusion', label: 'Závěr', icon: ClipboardCheck },
  ];

  const visibleTabs = tabsConfig.filter(tab => availableTabs.includes(tab.id));

  if (!diagnostic) return null;

  const isLoading = updateDiagnostic.isPending || updateAssessment.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Upravit diagnostiku</SheetTitle>
            {clientName && (
              <p className="text-sm text-muted-foreground">Klient: {clientName}</p>
            )}
          </SheetHeader>

          {isLoadingAssessment ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {/* Diagnostic Level */}
              <Card className="p-3">
                <Label className="text-xs text-muted-foreground">Typ diagnostiky</Label>
                <div className="flex gap-2 mt-2">
                  {DIAGNOSTIC_LEVELS.map(level => (
                    <Badge
                      key={level.value}
                      variant={formData.diagnosticLevel === level.value ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => updateField('diagnosticLevel', level.value)}
                    >
                      {level.label}
                    </Badge>
                  ))}
                </div>
              </Card>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0 mb-3">
                  {visibleTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-all',
                        activeTab === tab.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                      )}
                    >
                      <tab.icon className="w-3 h-3" />
                      {tab.label}
                    </button>
                  ))}
                </TabsList>

                {/* Client Tab */}
                <TabsContent value="client" className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Dominantní ruka</Label>
                      <RadioGroup 
                        value={formData.handedness} 
                        onValueChange={(v) => updateField('handedness', v)}
                        className="flex gap-3 mt-1"
                      >
                        <div className="flex items-center gap-1">
                          <RadioGroupItem value="right" id="edit-right" />
                          <Label htmlFor="edit-right" className="text-xs cursor-pointer">Pravák</Label>
                        </div>
                        <div className="flex items-center gap-1">
                          <RadioGroupItem value="left" id="edit-left" />
                          <Label htmlFor="edit-left" className="text-xs cursor-pointer">Levák</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div>
                      <Label className="text-xs">Povolání</Label>
                      <Input
                        value={formData.occupation}
                        onChange={(e) => updateField('occupation', e.target.value)}
                        className="h-8 text-sm mt-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Sezení denně: {formData.sittingHoursDaily}h</Label>
                      <Slider
                        value={[formData.sittingHoursDaily]}
                        onValueChange={([v]) => updateField('sittingHoursDaily', v)}
                        max={16}
                        step={0.5}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Spánek denně: {formData.sleepHours}h</Label>
                      <Slider
                        value={[formData.sleepHours]}
                        onValueChange={([v]) => updateField('sleepHours', v)}
                        max={12}
                        step={0.5}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Lifestyle Tab */}
                <TabsContent value="lifestyle" className="space-y-3">
                  <div>
                    <Label className="text-xs">Sportovní historie</Label>
                    <Textarea
                      value={formData.sportsHistory}
                      onChange={(e) => updateField('sportsHistory', e.target.value)}
                      className="text-sm mt-1 min-h-[60px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Spánek: {formData.sleepHours}h</Label>
                      <Slider
                        value={[formData.sleepHours]}
                        onValueChange={([v]) => updateField('sleepHours', v)}
                        min={4}
                        max={12}
                        step={0.5}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Stres: {formData.stressLevel}/5</Label>
                      <Slider
                        value={[formData.stressLevel]}
                        onValueChange={([v]) => updateField('stressLevel', v)}
                        min={1}
                        max={5}
                        className="mt-2"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Regenerace</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {REGENERATION_METHODS.map(m => (
                        <Badge
                          key={m}
                          variant={formData.regenerationMethods.includes(m) ? 'default' : 'outline'}
                          className="cursor-pointer text-xs"
                          onClick={() => toggleArrayItem('regenerationMethods', m)}
                        >
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Health Tab */}
                <TabsContent value="health" className="space-y-3">
                  {(['diseases', 'surgeries', 'injuries', 'allergies'] as const).map(field => (
                    <div key={field}>
                      <Label className="text-xs">
                        {field === 'diseases' && 'Nemoci'}
                        {field === 'surgeries' && 'Operace'}
                        {field === 'injuries' && 'Úrazy'}
                        {field === 'allergies' && 'Alergie'}
                      </Label>
                      <div className="flex gap-1 mt-1">
                        <Input
                          value={tempInput[field] || ''}
                          onChange={(e) => setTempInput(p => ({ ...p, [field]: e.target.value }))}
                          className="h-7 text-xs"
                          placeholder="Přidat..."
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray(field, tempInput[field] || ''))}
                        />
                        <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => addToArray(field, tempInput[field] || '')}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {formData[field].map((item, i) => (
                          <Badge key={i} variant="secondary" className="text-xs gap-1">
                            {item}
                            <X className="w-2 h-2 cursor-pointer" onClick={() => removeFromArray(field, i)} />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                {/* Goals Tab */}
                <TabsContent value="goals" className="space-y-3">
                  <div>
                    <Label className="text-xs">Krátkodobé cíle</Label>
                    <Textarea
                      value={formData.shortTermGoals}
                      onChange={(e) => updateField('shortTermGoals', e.target.value)}
                      className="text-sm mt-1 min-h-[60px]"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Dlouhodobé cíle</Label>
                    <Textarea
                      value={formData.longTermGoals}
                      onChange={(e) => updateField('longTermGoals', e.target.value)}
                      className="text-sm mt-1 min-h-[60px]"
                    />
                  </div>
                </TabsContent>

                {/* Mobility Tab */}
                <TabsContent value="mobility" className="space-y-2">
                  {MOBILITY_AREAS.map(({ field, label }) => {
                    const valueField = field as keyof FormData;
                    const sideField = `${field}Side` as keyof FormData;
                    const noteField = `${field}Note` as keyof FormData;
                    
                    return (
                      <div key={field} className="p-2 rounded bg-secondary/50 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">{label}</span>
                          <div className="flex gap-1">
                            {MOBILITY_OPTIONS.map(opt => (
                              <Badge
                                key={opt.value}
                                variant="outline"
                                className={cn('cursor-pointer text-xs px-1.5 py-0', formData[valueField] === opt.value ? opt.color : '')}
                                onClick={() => updateField(valueField, opt.value)}
                              >
                                {opt.label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {SIDE_OPTIONS.map(s => (
                            <Badge
                              key={s.value}
                              variant="outline"
                              className={cn('cursor-pointer text-xs px-1', formData[sideField] === s.value ? 'bg-primary/20' : '')}
                              onClick={() => updateField(sideField, formData[sideField] === s.value ? '' : s.value)}
                            >
                              {s.label}
                            </Badge>
                          ))}
                          <Input
                            placeholder="Poznámka"
                            value={(formData[noteField] as string) || ''}
                            onChange={(e) => updateField(noteField, e.target.value)}
                            className="h-6 text-xs flex-1"
                          />
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>

                {/* Pain Tab */}
                <TabsContent value="pain" className="space-y-2">
                  {PAIN_AREAS.map(({ field, label }) => {
                    const valueField = field as keyof FormData;
                    const durationField = `${field}Duration` as keyof FormData;
                    const triggerField = `${field}Trigger` as keyof FormData;
                    const sideField = `${field}Side` as keyof FormData;
                    const hasPain = formData[valueField] !== 'none';
                    
                    return (
                      <div key={field} className={cn('p-2 rounded space-y-1', hasPain ? 'bg-destructive/10' : 'bg-secondary/50')}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">{label}</span>
                          <div className="flex gap-1">
                            {PAIN_OPTIONS.map(opt => (
                              <Badge
                                key={opt.value}
                                variant="outline"
                                className={cn('cursor-pointer text-xs px-1.5 py-0', formData[valueField] === opt.value ? opt.color : '')}
                                onClick={() => updateField(valueField, opt.value)}
                              >
                                {opt.label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {hasPain && (
                          <div className="space-y-1 pt-1 border-t border-border/50">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-xs text-muted-foreground w-10">Strana:</span>
                              {SIDE_OPTIONS.map(s => (
                                <Badge
                                  key={s.value}
                                  variant="outline"
                                  className={cn('cursor-pointer text-xs px-1', formData[sideField] === s.value ? 'bg-primary/20' : '')}
                                  onClick={() => updateField(sideField, formData[sideField] === s.value ? '' : s.value)}
                                >
                                  {s.label}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-xs text-muted-foreground w-10">Kdy:</span>
                              {PAIN_DURATION_OPTIONS.map(d => (
                                <Badge
                                  key={d.value}
                                  variant="outline"
                                  className={cn('cursor-pointer text-xs px-1', formData[durationField] === d.value ? 'bg-warning/20' : '')}
                                  onClick={() => updateField(durationField, formData[durationField] === d.value ? '' : d.value)}
                                >
                                  {d.label}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-xs text-muted-foreground w-10">Při:</span>
                              {PAIN_TRIGGER_OPTIONS.map(t => {
                                const triggers = (formData[triggerField] as string[]) || [];
                                const isSelected = triggers.includes(t.value);
                                return (
                                  <Badge
                                    key={t.value}
                                    variant="outline"
                                    className={cn('cursor-pointer text-xs px-1', isSelected ? 'bg-destructive/20' : '')}
                                    onClick={() => {
                                      if (isSelected) {
                                        updateField(triggerField, triggers.filter(x => x !== t.value));
                                      } else {
                                        updateField(triggerField, [...triggers, t.value]);
                                      }
                                    }}
                                  >
                                    {t.label}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </TabsContent>

                {/* Psychology Tab */}
                <TabsContent value="psychology" className="space-y-3">
                  <div>
                    <Label className="text-xs">Preferovaný styl</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {TRAINING_STYLES.map(s => (
                        <Badge
                          key={s}
                          variant={formData.preferredTrainingStyle === s ? 'default' : 'outline'}
                          className="cursor-pointer text-xs"
                          onClick={() => updateField('preferredTrainingStyle', s)}
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Co brání v tréninku?</Label>
                    <Textarea
                      value={formData.trainingBarrier}
                      onChange={(e) => updateField('trainingBarrier', e.target.value)}
                      className="text-sm mt-1 min-h-[80px]"
                    />
                  </div>
                </TabsContent>

                {/* Nutrition Tab */}
                <TabsContent value="nutrition" className="space-y-3">
                  <div>
                    <Label className="text-xs">Pravidelnost</Label>
                    <Select value={formData.eatingRegularity} onValueChange={(v) => updateField('eatingRegularity', v)}>
                      <SelectTrigger className="h-8 text-sm mt-1">
                        <SelectValue placeholder="Vyberte" />
                      </SelectTrigger>
                      <SelectContent>
                        {EATING_REGULARITY_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Omezení/alergie</Label>
                    <div className="flex gap-1 mt-1">
                      <Input
                        value={tempInput.allRestrictions || ''}
                        onChange={(e) => setTempInput(p => ({ ...p, allRestrictions: e.target.value }))}
                        className="h-7 text-xs"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('allRestrictions', tempInput.allRestrictions || ''))}
                      />
                      <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => addToArray('allRestrictions', tempInput.allRestrictions || '')}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {formData.allRestrictions.map((item, i) => (
                        <Badge key={i} variant="secondary" className="text-xs gap-1">
                          {item}
                          <X className="w-2 h-2 cursor-pointer" onClick={() => removeFromArray('allRestrictions', i)} />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Conclusion Tab */}
                <TabsContent value="conclusion" className="space-y-3">
                  <div className="p-2 rounded bg-destructive/10 border border-destructive/30">
                    <Label className="text-xs flex items-center gap-1 text-destructive">
                      <AlertTriangle className="w-3 h-3" />
                      🔴 RIZIKA
                    </Label>
                    <Textarea
                      value={formData.trainerRisks}
                      onChange={(e) => updateField('trainerRisks', e.target.value)}
                      className="text-sm mt-1 min-h-[60px] bg-background"
                    />
                  </div>

                  <div className="p-2 rounded bg-primary/10 border border-primary/30">
                    <Label className="text-xs flex items-center gap-1 text-primary">
                      <Target className="w-3 h-3" />
                      🎯 PRIORITY
                    </Label>
                    <Textarea
                      value={formData.trainerPriorities}
                      onChange={(e) => updateField('trainerPriorities', e.target.value)}
                      className="text-sm mt-1 min-h-[60px] bg-background"
                    />
                  </div>

                  <div className="p-2 rounded bg-warning/10 border border-warning/30">
                    <Label className="text-xs flex items-center gap-1 text-warning">
                      <AlertTriangle className="w-3 h-3" />
                      ⚠️ OMEZENÍ
                    </Label>
                    <Textarea
                      value={formData.trainerLimitations}
                      onChange={(e) => updateField('trainerLimitations', e.target.value)}
                      className="text-sm mt-1 min-h-[60px] bg-background"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">📝 Další poznámky</Label>
                    <Textarea
                      value={formData.trainerOtherNotes}
                      onChange={(e) => updateField('trainerOtherNotes', e.target.value)}
                      className="text-sm mt-1 min-h-[60px]"
                    />
                  </div>

                  {/* AI Section - Hidden for future use
                  <Collapsible open={showAISection} onOpenChange={setShowAISection}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded bg-secondary/50">
                      <span className="text-xs font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-primary" />
                        AI asistent
                      </span>
                      <ChevronDown className={cn("w-3 h-3 transition-transform", showAISection && "rotate-180")} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={handleGenerateSummary}
                        disabled={isAnalyzing}
                      >
                        {isAnalyzing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                        Nechat AI doplnit
                      </Button>
                      {(finalSummary || formData.aiAnalysis) && (
                        <div className="mt-2 text-xs space-y-2">
                          {(finalSummary?.riskFactors || formData.aiAnalysis?.riskFactors)?.length > 0 && (
                            <div>
                              <span className="font-medium text-destructive">AI Rizika:</span>
                              <ul className="list-disc list-inside text-muted-foreground">
                                {(finalSummary?.riskFactors || formData.aiAnalysis?.riskFactors)?.map((r, i) => <li key={i}>{r}</li>)}
                              </ul>
                            </div>
                          )}
                          {(finalSummary?.trainingPriorities || formData.aiAnalysis?.trainingPriorities)?.length > 0 && (
                            <div>
                              <span className="font-medium text-primary">AI Priority:</span>
                              <ul className="list-disc list-inside text-muted-foreground">
                                {(finalSummary?.trainingPriorities || formData.aiAnalysis?.trainingPriorities)?.map((p, i) => <li key={i}>{p}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                  */}
                </TabsContent>
              </Tabs>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="icon"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button className="flex-1" onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Ukládám...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Uložit změny
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat diagnostiku?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Diagnostika bude trvale odstraněna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDiagnostic.isPending ? "Mažu..." : "Smazat"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
