import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSharedWithMe } from './useCalendarShares';
import { TrainingSession, TrainingStatus } from './useTrainingSessions';

export interface SharedTraining extends TrainingSession {
  owner_user_id: string;
  isShared: true;
}

// Získání tréninků od sdílených kalendářů
export function useSharedTrainings() {
  const { data: sharedCalendars = [] } = useSharedWithMe();

  return useQuery({
    queryKey: ['shared-trainings', sharedCalendars.map(s => s.owner_user_id)],
    queryFn: async (): Promise<SharedTraining[]> => {
      if (sharedCalendars.length === 0) return [];

      const ownerIds = sharedCalendars.map(s => s.owner_user_id);

      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .in('user_id', ownerIds)
        .neq('status', 'canceled');

      if (error) throw error;

      return (data || []).map(session => ({
        ...session,
        status: session.status as TrainingStatus,
        owner_user_id: session.user_id || '',
        isShared: true as const
      }));
    },
    enabled: sharedCalendars.length > 0
  });
}

// Kontrola kolize s vlastními i sdílenými tréninky
export function useCheckCollision() {
  const { data: sharedTrainings = [] } = useSharedTrainings();

  return (
    ownTrainings: TrainingSession[],
    newDate: Date,
    duration: number,
    excludeId?: string
  ): { hasCollision: boolean; collisionType: 'own' | 'shared' | null; message: string } => {
    const newStart = newDate.getTime();
    const newEnd = newStart + duration * 60000;

    // Kontrola kolize s vlastními tréninky
    for (const training of ownTrainings) {
      if (training.id === excludeId) continue;
      if (training.status === 'canceled') continue;

      const trainingStart = new Date(training.date).getTime();
      const trainingEnd = trainingStart + training.duration * 60000;

      if (newStart < trainingEnd && newEnd > trainingStart) {
        return {
          hasCollision: true,
          collisionType: 'own',
          message: 'Tento čas koliduje s vaším jiným tréninkem'
        };
      }
    }

    // Kontrola kolize se sdílenými tréninky
    for (const training of sharedTrainings) {
      const trainingStart = new Date(training.date).getTime();
      const trainingEnd = trainingStart + training.duration * 60000;

      if (newStart < trainingEnd && newEnd > trainingStart) {
        return {
          hasCollision: true,
          collisionType: 'shared',
          message: 'Tento čas koliduje s tréninkem jiného trenéra'
        };
      }
    }

    return { hasCollision: false, collisionType: null, message: '' };
  };
}

// Návrh volných slotů
export function useSuggestFreeSlots() {
  const { data: sharedTrainings = [] } = useSharedTrainings();

  return (
    ownTrainings: TrainingSession[],
    date: Date,
    duration: number,
    count: number = 3
  ): { start: Date; end: Date }[] => {
    const slots: { start: Date; end: Date }[] = [];
    const dayStart = new Date(date);
    dayStart.setHours(8, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(20, 0, 0, 0);

    // Všechny tréninky pro daný den
    const allTrainings = [...ownTrainings, ...sharedTrainings]
      .filter(t => {
        const tDate = new Date(t.date);
        return tDate.toDateString() === date.toDateString() && t.status !== 'canceled';
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let currentTime = dayStart.getTime();

    // Procházíme časové úseky a hledáme volné sloty
    for (const training of allTrainings) {
      const trainingStart = new Date(training.date).getTime();
      const trainingEnd = trainingStart + training.duration * 60000;

      // Máme mezeru před tréninkem?
      if (trainingStart - currentTime >= duration * 60000) {
        // Najdi všechny možné sloty v této mezeře
        let slotStart = currentTime;
        while (slotStart + duration * 60000 <= trainingStart && slots.length < count) {
          slots.push({
            start: new Date(slotStart),
            end: new Date(slotStart + duration * 60000)
          });
          slotStart += 30 * 60000; // Posouvej po 30 minutách
        }
      }

      currentTime = Math.max(currentTime, trainingEnd);
      if (slots.length >= count) break;
    }

    // Zkontroluj prostor po posledním tréninku
    if (slots.length < count && currentTime + duration * 60000 <= dayEnd.getTime()) {
      let slotStart = currentTime;
      while (slotStart + duration * 60000 <= dayEnd.getTime() && slots.length < count) {
        slots.push({
          start: new Date(slotStart),
          end: new Date(slotStart + duration * 60000)
        });
        slotStart += 30 * 60000;
      }
    }

    return slots.slice(0, count);
  };
}
