import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DiagnosticData {
  clientName?: string;
  age?: number;
  gender?: string;
  handedness?: string;
  occupation?: string;
  sittingHours?: number;
  sportsHistory?: string;
  currentActivities?: string[];
  sleepHours?: number;
  sleepQuality?: number;
  stressLevel?: number;
  diseases?: string[];
  surgeries?: string[];
  injuries?: string[];
  painAreas?: string[];
  allergies?: string[];
  shortTermGoals?: string;
  longTermGoals?: string;
  mobilityAnkles?: string;
  mobilityHips?: string;
  mobilityThoracic?: string;
  mobilityShoulders?: string;
  coreStability?: string;
  squatQuality?: string;
  lungeQuality?: string;
  pushQuality?: string;
  pullQuality?: string;
  hipHingeQuality?: string;
  painAnkle?: string;
  painKnee?: string;
  painHip?: string;
  painSi?: string;
  painLumbar?: string;
  painThoracic?: string;
  painShoulder?: string;
  painNeck?: string;
  motivationLevel?: number;
  disciplineLevel?: number;
  preferredTrainingStyle?: string;
  eatingRegularity?: string;
  supplements?: string[];
  dietaryRestrictions?: string[];
  trainerNotes?: string;
}

export interface FormHintsResult {
  warnings: string[];
  missingCritical: string[];
  suggestedQuestions: string[];
  riskFactors: string[];
  notes: string;
}

export interface ImageAnalysisResult {
  asymmetries: string[];
  posturalIssues: string[];
  mobilityRecommendations: string[];
  priorityAreas: string[];
  summary: string;
}

export interface FinalSummaryResult {
  riskFactors: string[];
  strengths: string[];
  trainingPriorities: string[];
  mobilityRecommendations: string;
  activationRecommendations: string;
  technicalFixes: string;
  contraindications: string[];
  mustDoExercises: string[];
  avoidExercises: string[];
  overallSummary: string;
}

export function useDiagnosticAI() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [formHints, setFormHints] = useState<FormHintsResult | null>(null);
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysisResult[]>([]);
  const [finalSummary, setFinalSummary] = useState<FinalSummaryResult | null>(null);

  const analyzeFormData = async (data: DiagnosticData): Promise<FormHintsResult | null> => {
    setIsAnalyzing(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('diagnostic-ai', {
        body: { type: 'form_hints', diagnosticData: data }
      });

      if (error) throw error;
      
      const hints = result.result as FormHintsResult;
      setFormHints(hints);
      return hints;
    } catch (error) {
      console.error('Form analysis error:', error);
      toast({
        title: 'Chyba AI analýzy',
        description: 'Nepodařilo se analyzovat formulář.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeImage = async (
    imageBase64: string, 
    imageType: 'posture_front' | 'posture_side' | 'posture_back' | 'movement_video'
  ): Promise<ImageAnalysisResult | null> => {
    setIsAnalyzing(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('diagnostic-ai', {
        body: { type: 'image_analysis', imageBase64, imageType }
      });

      if (error) throw error;
      
      const analysis = result.result as ImageAnalysisResult;
      setImageAnalysis(prev => [...prev, analysis]);
      return analysis;
    } catch (error) {
      console.error('Image analysis error:', error);
      toast({
        title: 'Chyba AI analýzy obrazu',
        description: 'Nepodařilo se analyzovat obrázek.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateFinalSummary = async (data: DiagnosticData): Promise<FinalSummaryResult | null> => {
    setIsAnalyzing(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('diagnostic-ai', {
        body: { type: 'final_summary', diagnosticData: data }
      });

      if (error) throw error;
      
      const summary = result.result as FinalSummaryResult;
      setFinalSummary(summary);
      return summary;
    } catch (error) {
      console.error('Final summary error:', error);
      toast({
        title: 'Chyba AI shrnutí',
        description: 'Nepodařilo se vygenerovat shrnutí.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearAnalysis = () => {
    setFormHints(null);
    setImageAnalysis([]);
    setFinalSummary(null);
  };

  return {
    isAnalyzing,
    formHints,
    imageAnalysis,
    finalSummary,
    analyzeFormData,
    analyzeImage,
    generateFinalSummary,
    clearAnalysis,
  };
}
