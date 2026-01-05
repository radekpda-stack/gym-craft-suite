import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface TrainerDiaryEntry {
  id: string;
  user_id: string;
  date: string;
  activity_type: string;
  title: string | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  pace_per_km: number | null;
  speed_kmh: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  calories: number | null;
  cadence: number | null;
  elevation_gain: number | null;
  notes: string | null;
  source: string;
  screenshot_url: string | null;
  raw_ocr_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDiaryEntry {
  date: string;
  activity_type: string;
  title?: string | null;
  duration_seconds?: number | null;
  distance_meters?: number | null;
  pace_per_km?: number | null;
  speed_kmh?: number | null;
  avg_heart_rate?: number | null;
  max_heart_rate?: number | null;
  calories?: number | null;
  cadence?: number | null;
  elevation_gain?: number | null;
  notes?: string | null;
  source?: string;
  screenshot_url?: string | null;
  raw_ocr_data?: Json | null;
}

export interface GarminOCRResult {
  activityType: string;
  title: string | null;
  date: string | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  pacePerKm: number | null;
  speedKmh: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  calories: number | null;
  cadence: number | null;
  elevationGain: number | null;
  avgPower: number | null;
  trainingEffect: number | null;
  vo2Max: number | null;
  sets: number | null;
  reps: number | null;
  exercises: string[] | null;
  rawText: string;
}

export function useTrainerDiaryEntries() {
  return useQuery({
    queryKey: ['trainer-diary-entries'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('trainer_workout_diary')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as TrainerDiaryEntry[];
    },
  });
}

export function useCreateDiaryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: CreateDiaryEntry) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('trainer_workout_diary')
        .insert([{
          ...entry,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-diary-entries'] });
      toast.success('Záznam byl úspěšně uložen');
    },
    onError: (error) => {
      console.error('Failed to create diary entry:', error);
      toast.error('Nepodařilo se uložit záznam');
    },
  });
}

export function useUpdateDiaryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...entry }: Partial<CreateDiaryEntry> & { id: string }) => {
      const { data, error } = await supabase
        .from('trainer_workout_diary')
        .update(entry)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-diary-entries'] });
      toast.success('Záznam byl aktualizován');
    },
    onError: (error) => {
      console.error('Failed to update diary entry:', error);
      toast.error('Nepodařilo se aktualizovat záznam');
    },
  });
}

export function useDeleteDiaryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('trainer_workout_diary')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-diary-entries'] });
      toast.success('Záznam byl smazán');
    },
    onError: (error) => {
      console.error('Failed to delete diary entry:', error);
      toast.error('Nepodařilo se smazat záznam');
    },
  });
}

export function useGarminOCR() {
  return useMutation({
    mutationFn: async (imageBase64: string): Promise<GarminOCRResult> => {
      const { data, error } = await supabase.functions.invoke('garmin-ocr', {
        body: { imageBase64 },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'OCR failed');

      return data.data as GarminOCRResult;
    },
    onError: (error) => {
      console.error('Garmin OCR error:', error);
      toast.error('Nepodařilo se rozpoznat data z obrázku');
    },
  });
}

export function useUploadDiaryScreenshot() {
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const fileName = `${user.id}/${year}/${month}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('trainer-diary-screenshots')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('trainer-diary-screenshots')
        .getPublicUrl(fileName);

      return publicUrl;
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast.error('Nepodařilo se nahrát screenshot');
    },
  });
}
