import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { addDays } from 'date-fns';

export interface SeedChallenge {
  title: string;
  description: string;
  instructions: string;
  primary_metric: 'time_seconds' | 'reps' | 'rounds' | 'weight_kg' | 'distance_m' | 'calories';
  scoring_type: 'time_lower_better' | 'value_higher_better';
  unit_label?: string;
  vod_url?: string;
}

const MVP_CHALLENGES: SeedChallenge[] = [
  {
    title: 'Row 500m Sprint',
    description: 'Veslování na 500 metrů na čas. Klasický benchmark kondice.',
    instructions: `• Start z klidu (nepředtáčej)
• Damper nastavení: doporučeno 4-6
• Počítá se čas dokončení 500m
• Warm-up před pokusem je doporučený
• Neomezený počet pokusů, počítá se nejlepší čas`,
    primary_metric: 'time_seconds',
    scoring_type: 'time_lower_better',
    unit_label: 'sec',
  },
  {
    title: 'Treadmill 1km Time Trial',
    description: 'Běh 1 km na běžeckém pásu na čas.',
    instructions: `• Sklon pásu: 1% (standardní nastavení)
• Start z klidu
• Warm-up 5-10 min doporučený
• Počítá se čas dokončení 1 km
• Pro začátečníky: může být i chůze, stále měříme čas`,
    primary_metric: 'time_seconds',
    scoring_type: 'time_lower_better',
    unit_label: 'sec',
  },
  {
    title: '2-Min Jump Rope',
    description: 'Maximální počet přeskoků přes švihadlo za 2 minuty.',
    instructions: `• Single unders (jednoduché přeskoky)
• Čas běží nepřetržitě 2 minuty
• Počítej každý úspěšný přeskok
• Tip: rozděl si to na 4x 30 sekund s krátkou pauzou
• Zakopnutí = pokračuj dál, nepřičítej neplatné přeskoky`,
    primary_metric: 'reps',
    scoring_type: 'value_higher_better',
    unit_label: 'reps',
  },
  {
    title: '50 Wall Balls',
    description: '50 wall ballů na čas. Klasický CrossFit benchmark.',
    instructions: `• Váha míče: 4 kg (muži) / 2 kg (ženy) nebo jednotná 4 kg
• Cílová výška: značka na zdi (cca 3m muži / 2.7m ženy)
• Počítá se čas dokončení 50 opakování
• Míč musí zasáhnout cíl, squat pod paralelní
• Pauzy povoleny, čas běží`,
    primary_metric: 'time_seconds',
    scoring_type: 'time_lower_better',
    unit_label: 'sec',
  },
  {
    title: 'Plank Max Hold',
    description: 'Maximální výdrž v planku. Test core stability.',
    instructions: `• Pozice: lokty pod rameny, tělo v přímce
• Pánev v neutrální pozici - nesmí propadat ani vyčnívat
• Čas běží od startu do momentu, kdy ztratíš správnou techniku
• Kolena nesmí klesnout na zem
• Doporučeno: video pro ověření techniky`,
    primary_metric: 'time_seconds',
    scoring_type: 'value_higher_better',
    unit_label: 'sec',
  },
  {
    title: 'Pull-up Max Reps',
    description: 'Maximální počet strict shybů v jedné sérii.',
    instructions: `• Strict pull-ups (bez kippingu/swingu)
• Brada musí přes hrazdu
• Plné napnutí paží dole
• Jedna nepřerušená série
• Žádné odpočívání ve visu - jakmile pustíš nebo přestaneš, série končí`,
    primary_metric: 'reps',
    scoring_type: 'value_higher_better',
    unit_label: 'reps',
  },
];

export function useSeedChallenges() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const now = new Date();
      const endDate = addDays(now, 30); // 30 days default duration

      const challengesToInsert = MVP_CHALLENGES.map(challenge => ({
        title: challenge.title,
        description: challenge.description,
        instructions: challenge.instructions,
        primary_metric: challenge.primary_metric,
        scoring_type: challenge.scoring_type,
        unit_label: challenge.unit_label,
        vod_url: challenge.vod_url || null,
        start_at: now.toISOString(),
        end_at: endDate.toISOString(),
        status: 'draft' as const,
        allow_multiple_attempts: true,
        requires_video: false,
        published_to_portal_clients: false,
        created_by_user_id: user.id,
      }));

      const { data, error } = await supabase
        .from('challenges')
        .insert(challengesToInsert)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      toast.success(`Vytvořeno ${data.length} vzorových výzev`);
    },
    onError: (error) => {
      console.error('Seed challenges error:', error);
      toast.error('Nepodařilo se vytvořit vzorové výzvy');
    },
  });
}

export { MVP_CHALLENGES };
