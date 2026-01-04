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
  // NEW CHALLENGES
  {
    title: 'Burpee AMRAP 5 min',
    description: 'Kolik burpees zvládneš za 5 minut? Klasický test kondice.',
    instructions: `• Plný burpee: hrudník na zem, výskok s tlesknutím nad hlavou
• Čas běží nepřetržitě 5 minut
• Pauzy povoleny, ale čas běží
• Počítá se celkový počet dokončených opakování
• Hrudník musí lehce klesat na zem`,
    primary_metric: 'reps',
    scoring_type: 'value_higher_better',
    unit_label: 'reps',
  },
  {
    title: 'Deadlift 1RM Test',
    description: 'Zjisti své maximum v mrtvém tahu.',
    instructions: `• Důkladný warm-up min 15 minut
• Postupně zvyšuj váhu: 50% → 70% → 85% → 95% → pokus o max
• Konvenční nebo sumo styl (zapiš do poznámky)
• Počítá se nejvyšší úspěšně zvednutá váha
• Bezpečnost: používej pojistky nebo spotter`,
    primary_metric: 'weight_kg',
    scoring_type: 'value_higher_better',
    unit_label: 'kg',
  },
  {
    title: 'KB Swing 100 reps',
    description: '100 kettlebell swingů na čas.',
    instructions: `• Váha: 16 kg (ženy) / 24 kg (muži)
• Russian swing (do úrovně očí)
• Pauzy povoleny, čas běží
• Počítá se čas dokončení 100 swingů
• Kettlebell musí dosáhnout min. úrovně ramen`,
    primary_metric: 'time_seconds',
    scoring_type: 'time_lower_better',
    unit_label: 'sec',
  },
  {
    title: 'Box Jump Max Height',
    description: 'Maximální výška skoku na bednu.',
    instructions: `• Warm-up a postupné zvyšování výšky
• Měkké dosednutí, plné napnutí v horní pozici
• Seskok nebo sestup dolů (ne skok dozadu)
• Počítá se nejvyšší úspěšná výška
• 3 pokusy na každou výšku`,
    primary_metric: 'distance_m',
    scoring_type: 'value_higher_better',
    unit_label: 'cm',
  },
  {
    title: 'Assault Bike Calorie Burn',
    description: '30 kalorií na assault bike na čas.',
    instructions: `• Start z klidu
• Spálení 30 kalorií co nejrychleji
• Celé tělo musí pracovat (ruce i nohy)
• Počítá se čas dokončení
• Warm-up 2-3 min před pokusem`,
    primary_metric: 'time_seconds',
    scoring_type: 'time_lower_better',
    unit_label: 'sec',
  },
  {
    title: 'Push-up Max in 1 Min',
    description: 'Maximální počet kliků za 1 minutu.',
    instructions: `• Plný rozsah pohybu: hrudník k zemi, plné napnutí paží
• Žádné kolena na zemi
• Pauzy povoleny, ale čas běží
• Počítá se počet čistých opakování
• Doporučeno: video pro kontrolu techniky`,
    primary_metric: 'reps',
    scoring_type: 'value_higher_better',
    unit_label: 'reps',
  },
  {
    title: 'Farmers Carry Distance',
    description: 'Maximální vzdálenost s kettlebelly za 2 minuty.',
    instructions: `• Váha: 2x 16 kg (ženy) / 2x 24 kg (muži)
• Chůze po označené trase (např. 20m tam a zpět)
• Položení = konec pokusu
• Čas 2 minuty, počítá se vzdálenost
• Rovná záda, ramena dozadu`,
    primary_metric: 'distance_m',
    scoring_type: 'value_higher_better',
    unit_label: 'm',
  },
  {
    title: 'Double Under Challenge',
    description: '50 double unders na čas.',
    instructions: `• Double unders = 2 protočení švihadla na 1 skok
• Počítá se čas dokončení 50 opakování
• Single unders se nepočítají
• Zakopnutí = pokračuj, čas běží
• Pro pokročilé skákače`,
    primary_metric: 'time_seconds',
    scoring_type: 'time_lower_better',
    unit_label: 'sec',
  },
  {
    title: 'Turkish Get-up Challenge',
    description: '10 turkish get-upů na čas (5+5).',
    instructions: `• Váha: 8 kg (ženy) / 16 kg (muži)
• 5 na každou stranu, střídej
• Počítá se čas dokončení 10 opakování
• Kontrolované pohyby, bezpečnost první
• Kettlebell musí zůstat stabilní nad hlavou`,
    primary_metric: 'time_seconds',
    scoring_type: 'time_lower_better',
    unit_label: 'sec',
  },
  {
    title: 'Row 2000m',
    description: 'Veslování na 2000 metrů na čas. Ultimátní test vytrvalosti.',
    instructions: `• Start z klidu
• Damper nastavení dle preference (4-7)
• Warm-up min 5 minut
• Počítá se čas dokončení 2000m
• Pacing strategie: vydrž první půlku!`,
    primary_metric: 'time_seconds',
    scoring_type: 'time_lower_better',
    unit_label: 'sec',
  },
  {
    title: 'Squat Hold Challenge',
    description: 'Maximální výdrž v dolní pozici dřepu.',
    instructions: `• Pozice: hluboký dřep, stehna pod paralelu
• Paty na zemi, rovná záda
• Ruce mohou být před tělem pro rovnováhu
• Čas běží do ztráty pozice
• Držení tyče nebo lavičky = neplatné`,
    primary_metric: 'time_seconds',
    scoring_type: 'value_higher_better',
    unit_label: 'sec',
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
